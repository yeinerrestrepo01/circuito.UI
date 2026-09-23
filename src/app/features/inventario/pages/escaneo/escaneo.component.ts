import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ToastService } from '../../../../core/services/toast.service';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { TipoMovimiento } from '../../models/movimiento.model';
import { Producto } from '../../models/producto.model';
import { InventarioService } from '../../services/inventario.service';

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
  imports: [ReactiveFormsModule, CardComponent, FormFieldComponent],
  templateUrl: './escaneo.component.html',
  styleUrl: './escaneo.component.scss',
})
export class EscaneoComponent implements OnInit, OnDestroy {
  private readonly inventarioService = inject(InventarioService);
  private readonly toast = inject(ToastService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  @ViewChild('video') private readonly videoRef?: ElementRef<HTMLVideoElement>;

  /**
   * ZXing decodifica en un <canvas> a partir de cualquier <video>, así que basta con que el
   * navegador soporte getUserMedia — funciona en Safari/iOS además de Chrome/Android (a
   * diferencia de la antigua BarcodeDetector nativa, que Safari nunca implementó).
   */
  readonly soportaCamara = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  readonly escaneando = signal(false);
  readonly producto = signal<Producto | null>(null);
  readonly buscandoProducto = signal(false);
  readonly confirmando = signal(false);

  /** Prellenada como en el mockup: referencia típica del piloto, lista para probar sin escanear. */
  readonly referencia = new FormControl('BAT-12V-75AH', { nonNullable: true, validators: [Validators.required] });
  readonly form = new FormGroup({
    tipo: new FormControl<TipoEscaneo>('Inflow', { nonNullable: true }),
    cantidad: new FormControl(1, { nonNullable: true, validators: [Validators.min(1)] }),
  });

  private readonly reader = new BrowserMultiFormatReader(
    new Map<DecodeHintType, unknown>([[DecodeHintType.POSSIBLE_FORMATS, FORMATOS_SOPORTADOS]]),
  );
  private controles: IScannerControls | null = null;

  ngOnInit(): void {
    this.buscarPorReferencia();
  }

  volver(): void {
    this.location.back();
  }

  seleccionarTipo(tipo: TipoEscaneo): void {
    this.form.controls.tipo.setValue(tipo);
  }

  sumarCantidad(delta: number): void {
    const actual = this.form.controls.cantidad.value;
    this.form.controls.cantidad.setValue(Math.max(1, actual + delta));
  }

  buscarPorReferencia(): void {
    const sku = this.referencia.value.trim();
    if (!sku) return;
    this.buscandoProducto.set(true);
    this.inventarioService.buscarProducto(sku).subscribe({
      next: (producto) => {
        this.producto.set(producto);
        this.buscandoProducto.set(false);
      },
      error: () => {
        this.producto.set(null);
        this.buscandoProducto.set(false);
      },
    });
  }

  async iniciarEscaneo(): Promise<void> {
    if (!this.soportaCamara) return;
    const video = this.videoRef?.nativeElement;
    if (!video) return;
    // Se activa antes de pedir la cámara (no después) para que el <video> ya esté visible ([hidden]
    // depende de este signal) cuando el stream empiece a llegar.
    this.escaneando.set(true);
    try {
      this.controles = await this.reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video, (resultado) => {
        if (resultado) {
          this.referencia.setValue(resultado.getText());
          this.buscarPorReferencia();
          this.detenerEscaneo();
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
  }

  confirmar(): void {
    const producto = this.producto();
    if (!producto || this.form.invalid || this.confirmando()) return;
    this.confirmando.set(true);
    const { tipo, cantidad } = this.form.getRawValue();
    this.inventarioService
      .registrarMovimiento({
        sku: producto.sku,
        type: tipo,
        quantity: cantidad,
        reason: tipo === 'Inflow' ? 'Transferencia recibida' : 'Venta',
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
