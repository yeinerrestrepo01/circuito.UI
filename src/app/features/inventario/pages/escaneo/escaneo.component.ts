import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../../core/services/toast.service';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { MOTIVO_COMPRA_PROVEEDOR, MOTIVOS_POR_TIPO, TipoMovimiento } from '../../models/movimiento.model';
import { Producto } from '../../models/producto.model';
import { InventarioService } from '../../services/inventario.service';
import { ProveedoresService } from '../../services/proveedores.service';
import { MilesInputDirective } from '../../../../shared/directives/miles-input.directive';

type TipoEscaneo = Extract<TipoMovimiento, 'Inflow' | 'Outflow'>;

/**
 * Formatos que le importan al negocio: EAN-13/UPC-A/-E son los que YA traen los repuestos de
 * fábrica en su empaque; Code128 y QR son para etiquetas propias (SKU interno, ubicación de
 * bodega). Restringir la lista (en vez de dejar el default de ZXing, que incluye ~15 formatos)
 * acelera la decodificación en cada frame.
 */
const FORMATOS_SOPORTADOS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.QR_CODE,
];

@Component({
  selector: 'app-escaneo',
  imports: [ReactiveFormsModule, CardComponent, FormFieldComponent, RouterLink, MilesInputDirective],
  templateUrl: './escaneo.component.html',
  styleUrl: './escaneo.component.scss',
})
export class EscaneoComponent implements OnInit, OnDestroy {
  private readonly inventarioService = inject(InventarioService);
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly toast = inject(ToastService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly proveedores = this.proveedoresService.proveedores;

  @ViewChild('video') private readonly videoRef?: ElementRef<HTMLVideoElement>;

  /**
   * ZXing decodifica en un <canvas> a partir de cualquier <video>, así que basta con que el
   * navegador soporte getUserMedia — funciona en Safari/iOS además de Chrome/Android (a
   * diferencia de la antigua BarcodeDetector nativa, que Safari nunca implementó).
   */
  readonly soportaCamara = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  readonly escaneando = signal(false);
  /** true durante el instante (breve, ~450ms) entre "se detectó un código" y "se apagó la cámara" —
   * es lo que dispara el flash verde y el check, para que quede claro que SÍ capturó algo. */
  readonly capturado = signal(false);
  /** Formato del último código leído (p. ej. "EAN_13"), aunque no haya encontrado producto — así se
   * puede saber si el código físico simplemente no es de un formato soportado (ver FORMATOS_SOPORTADOS). */
  readonly ultimoFormato = signal<string | null>(null);
  readonly producto = signal<Producto | null>(null);
  /** Más de un producto comparte el código leído (p. ej. un "Grupo de batería A30" de varias marcas
   * con el mismo Barcode de fábrica) — se muestran para que la persona elija cuál es. Vacío en el
   * caso normal (0 o 1 resultado), donde no hace falta elegir nada. */
  readonly candidatos = signal<Producto[]>([]);
  readonly buscandoProducto = signal(false);
  readonly confirmando = signal(false);
  /** Una entrada por unidad a vender — solo se usa (y se exige) cuando `requiereSeries()` es true.
   * Su tamaño se mantiene igual a la cantidad elegida (ver `sincronizarSeriales`). */
  readonly seriales = signal<string[]>([]);

  /** Prellenada como en el mockup: referencia típica del piloto, lista para probar sin escanear. */
  readonly referencia = new FormControl('BAT-12V-75AH', { nonNullable: true, validators: [Validators.required] });
  readonly form = new FormGroup({
    tipo: new FormControl<TipoEscaneo>('Inflow', { nonNullable: true }),
    cantidad: new FormControl(1, { nonNullable: true, validators: [Validators.min(1)] }),
    motivo: new FormControl(MOTIVOS_POR_TIPO.Inflow[0], { nonNullable: true }),
    proveedorId: new FormControl('', { nonNullable: true }),
    costoCompra: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
  });

  private readonly tipoSeleccionado = toSignal(this.form.controls.tipo.valueChanges, {
    initialValue: this.form.controls.tipo.value,
  });
  private readonly motivoSeleccionado = toSignal(this.form.controls.motivo.valueChanges, {
    initialValue: this.form.controls.motivo.value,
  });
  readonly motivosDisponibles = computed(() => MOTIVOS_POR_TIPO[this.tipoSeleccionado()]);
  /** El proveedor (y el costo de compra) solo aplican cuando el motivo es, literalmente, una compra a proveedor. */
  readonly mostrarProveedor = computed(() => this.motivoSeleccionado() === MOTIVO_COMPRA_PROVEEDOR);

  private readonly reader = new BrowserMultiFormatReader(
    new Map<DecodeHintType, unknown>([
      [DecodeHintType.POSSIBLE_FORMATS, FORMATOS_SOPORTADOS],
      // Sin esto, ZXing se conforma con el primer intento de lectura por frame y descarta cualquier
      // código borroso/inclinado — con negativos silenciosos como principal síntoma (la cámara
      // "nunca" detecta nada aunque el código se vea bien a simple vista). TRY_HARDER prueba variantes
      // extra de binarización por frame; cuesta más CPU, pero aquí se escanea a demanda, no en bucle
      // productivo, así que vale la pena.
      [DecodeHintType.TRY_HARDER, true],
    ]),
    // 500ms por defecto entre intentos es demasiado lento para un código en movimiento en la mano —
    // a 100ms el visor reacciona casi al instante en cuanto el código queda enfocado.
    { delayBetweenScanAttempts: 100, delayBetweenScanSuccess: 500 },
  );
  private controles: IScannerControls | null = null;

  ngOnInit(): void {
    this.buscarPorReferencia();
    this.proveedoresService.cargarProveedores().subscribe({ error: () => {} });
  }

  volver(): void {
    this.location.back();
  }

  seleccionarTipo(tipo: TipoEscaneo): void {
    this.form.controls.tipo.setValue(tipo);
    // Igual que en Ajustes: al cambiar de tipo se propone el primer motivo válido para ese tipo,
    // en vez de dejar seleccionado un motivo que ya no aplica (p. ej. "Compra a proveedor" en una Salida).
    this.form.controls.motivo.setValue(MOTIVOS_POR_TIPO[tipo][0]);
    this.sincronizarSeriales();
  }

  sumarCantidad(delta: number): void {
    const actual = this.form.controls.cantidad.value;
    this.form.controls.cantidad.setValue(Math.max(1, actual + delta));
    this.sincronizarSeriales();
  }

  /** true cuando el producto encontrado exige serie Y el movimiento elegido es una Salida (venta) —
   * ver Producto.requiresSerialNumber. No es un signal porque depende de `form.controls.tipo.value`
   * (un FormControl plano); como plain method se reevalúa en cada ciclo de detección de cambios,
   * igual que el resto de lecturas directas de `form.controls.*.value` ya usadas en esta pantalla. */
  requiereSeries(): boolean {
    return !!this.producto()?.requiresSerialNumber && this.form.controls.tipo.value === 'Outflow';
  }

  /** Ajusta `seriales()` al tamaño de `cantidad` (rellenando con '' o recortando), conservando los
   * valores ya escritos en las posiciones que sobreviven. */
  private sincronizarSeriales(): void {
    const cantidad = this.form.controls.cantidad.value;
    this.seriales.update((actuales) => {
      const copia = actuales.slice(0, cantidad);
      while (copia.length < cantidad) copia.push('');
      return copia;
    });
  }

  actualizarSerial(indice: number, valor: string): void {
    this.seriales.update((actuales) => {
      const copia = [...actuales];
      copia[indice] = valor;
      return copia;
    });
  }

  /** Controla el disabled del botón Confirmar — true también cuando no se necesitan series. */
  serialesCompletas(): boolean {
    return !this.requiereSeries() || this.seriales().every((s) => s.trim().length > 0);
  }

  buscarPorReferencia(): void {
    const codigo = this.referencia.value.trim();
    if (!codigo) return;
    this.buscandoProducto.set(true);
    this.producto.set(null);
    this.candidatos.set([]);
    this.seriales.set([]);
    this.inventarioService.buscarProductosPorCodigo(codigo).subscribe({
      next: (productos) => {
        // 0 → no encontrado (igual que antes). 1 → se selecciona solo, sin pedir nada. 2+ → el mismo
        // código (siempre un Barcode, nunca un Sku: ese es único) es de varios productos internos —
        // p. ej. un "Grupo de batería A30" en varias marcas — y hay que elegir cuál es.
        if (productos.length === 1) this.seleccionarProducto(productos[0]);
        else if (productos.length > 1) this.candidatos.set(productos);
        this.buscandoProducto.set(false);
      },
      error: () => this.buscandoProducto.set(false),
    });
  }

  elegirCandidato(producto: Producto): void {
    this.seleccionarProducto(producto);
    this.candidatos.set([]);
  }

  private seleccionarProducto(producto: Producto): void {
    this.producto.set(producto);
    // Mismo criterio que Ajustes: se propone el costo de referencia del producto, editable antes de confirmar.
    this.form.controls.costoCompra.setValue(producto.purchaseCost ?? null);
    this.sincronizarSeriales();
  }

  async iniciarEscaneo(): Promise<void> {
    if (!this.soportaCamara) return;
    const video = this.videoRef?.nativeElement;
    if (!video) return;
    // Se activa antes de pedir la cámara (no después) para que el <video> ya esté visible ([hidden]
    // depende de este signal) cuando el stream empiece a llegar.
    this.escaneando.set(true);
    try {
      // `width`/`height` en "ideal" (no "exact") no rompen el permiso de cámara si el dispositivo no
      // los soporta — solo se ignoran. Sin pedir una resolución más alta, muchos celulares abren la
      // cámara a una resolución baja por defecto (~640x480), donde un EAN-13 normal ya no se lee.
      // `focusMode: continuous` es igual de best-effort: en `advanced[]` el navegador descarta el
      // bloque completo si no lo soporta, en vez de fallar la petición — es lo que de verdad resuelve
      // el "nunca detecta nada": sin autofoco continuo, cámaras de celular quedan enfocadas al
      // infinito y jamás enfocan un código a 10-15cm de distancia.
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
        },
      };
      this.controles = await this.reader.decodeFromConstraints(constraints, video, (resultado) => {
        // El guard evita que frames de más (llegan varios por segundo) repitan el flash/vibración/toast
        // mientras ya se está cerrando el escaneo tras la primera detección.
        if (resultado && !this.capturado()) {
          this.capturado.set(true);
          try {
            navigator.vibrate?.(80);
          } catch {
            /* Vibration API no disponible (p. ej. Safari/iOS) — el flash visual ya basta de feedback. */
          }
          const texto = resultado.getText();
          const formato = BarcodeFormat[resultado.getBarcodeFormat()];
          this.ultimoFormato.set(formato);
          this.toast.success(`Código detectado (${formato}): ${texto}`);
          this.referencia.setValue(texto);
          this.buscarPorReferencia();
          // Se deja el flash visible un instante antes de apagar la cámara, para que se alcance a ver.
          setTimeout(() => this.detenerEscaneo(), 450);
        }
        // Los "NotFoundException" de cada frame sin código legible no son errores reales — ZXing
        // los reintenta solo; no hay nada que manejar aquí más allá de esperar el próximo frame.
      });
    } catch {
      this.toast.error('No se pudo acceder a la cámara. Ingresa la referencia manualmente.');
      this.detenerEscaneo();
    }
  }

  detenerEscaneo(): void {
    this.controles?.stop();
    this.controles = null;
    this.escaneando.set(false);
    this.capturado.set(false);
  }

  confirmar(): void {
    const producto = this.producto();
    if (!producto || this.form.invalid || this.confirmando()) return;

    const seriesLimpias = this.seriales().map((s) => s.trim());
    if (this.requiereSeries()) {
      if (seriesLimpias.some((s) => !s)) {
        this.toast.error('Completa el número de serie de cada unidad antes de confirmar.');
        return;
      }
      if (new Set(seriesLimpias).size !== seriesLimpias.length) {
        this.toast.error('Hay números de serie repetidos — cada unidad debe tener uno distinto.');
        return;
      }
    }

    this.confirmando.set(true);
    const { tipo, cantidad, motivo, proveedorId, costoCompra } = this.form.getRawValue();
    this.inventarioService
      .registrarMovimiento({
        sku: producto.sku,
        type: tipo,
        quantity: cantidad,
        reason: motivo,
        supplierId: this.mostrarProveedor() && proveedorId ? proveedorId : undefined,
        purchaseCost: this.mostrarProveedor() ? (costoCompra ?? undefined) : undefined,
        serialNumbers: this.requiereSeries() ? seriesLimpias : undefined,
      })
      .subscribe({
        next: () => {
          this.toast.success('Movimiento registrado.');
          void this.router.navigate(['/inventario', producto.sku]);
        },
        error: () => this.confirmando.set(false),
      });
  }

  ngOnDestroy(): void {
    this.detenerEscaneo();
  }
}
