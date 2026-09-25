import { toSignal } from '@angular/core/rxjs-interop';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../../core/services/toast.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import { ActualizarProductoPayload, NuevoProductoPayload, OPCIONES_UNIDAD_MEDIDA, Producto, UnidadMedida } from '../../models/producto.model';
import { CategoriasService } from '../../services/categorias.service';
import { InventarioService } from '../../services/inventario.service';
import { ProveedoresService } from '../../services/proveedores.service';
import { BarcodeScannerComponent, CodigoLeido } from '../../../../shared/components/barcode-scanner/barcode-scanner.component';
import { MilesInputDirective } from '../../../../shared/directives/miles-input.directive';

const CATEGORIAS_VIDA_UTIL = [
  'Batería (12–13 meses)',
  'Pastillas de freno (por kilometraje)',
  'Aceite (por tiempo o km)',
  'Personalizada',
];
/** Duración estimada en días para calcular la fecha del recordatorio (ver LifecycleReminder) — un
 * número real detrás de la etiqueta de texto. "Pastillas de freno"/"Aceite" dependen en realidad del
 * kilometraje (algo que Circuito no rastrea todavía), así que se les da un tiempo aproximado igual
 * que a Batería — mejor un aviso estimado que ninguno. "Personalizada" no tiene default: lo escribe
 * la persona. */
const DURACION_DIAS_POR_CATEGORIA: Record<string, number> = {
  'Batería (12–13 meses)': 380,
  'Pastillas de freno (por kilometraje)': 240,
  'Aceite (por tiempo o km)': 180,
};
const VENTANAS_AVISO: { label: string; dias: number[] }[] = [
  { label: '30 y 7 días antes', dias: [30, 7] },
  { label: '15 días antes', dias: [15] },
  { label: 'Solo al vencer', dias: [0] },
];

/** Prefijo de 3 letras para el SKU: sin tildes/espacios, solo alfanumérico, mayúsculas. */
function prefijoSku(texto: string): string {
  const limpio = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  return limpio.slice(0, 3) || 'GEN';
}

function codigoNumericoAleatorio(): string {
  return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

@Component({
  selector: 'app-nuevo-producto',
  imports: [RouterLink, ReactiveFormsModule, CardComponent, FormFieldComponent, BarcodeScannerComponent, MilesInputDirective],
  templateUrl: './nuevo-producto.component.html',
  styleUrl: './nuevo-producto.component.scss',
})
export class NuevoProductoComponent implements OnInit, OnDestroy {
  private readonly inventarioService = inject(InventarioService);
  private readonly categoriasService = inject(CategoriasService);
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly breadcrumbService = inject(BreadcrumbService);

  /** Presente solo bajo la ruta `:sku/editar` — su sola existencia decide todo el modo del formulario. */
  readonly skuEditando = this.route.snapshot.paramMap.get('sku');
  readonly modoEdicion = !!this.skuEditando;
  private productoId = '';
  /** Stock actual, solo informativo en modo edición — el stock no se toca aquí, se ajusta desde Ajustes. */
  readonly stockActual = signal<number | null>(null);

  readonly categorias = this.categoriasService.categorias;
  readonly proveedores = this.proveedoresService.proveedores;
  readonly unidades = OPCIONES_UNIDAD_MEDIDA;
  readonly categoriasVidaUtil = CATEGORIAS_VIDA_UTIL;
  readonly ventanasAviso = VENTANAS_AVISO;
  readonly guardando = signal(false);

  readonly form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    marca: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    proveedorId: new FormControl('', { nonNullable: true }),
    unidadMedida: new FormControl<UnidadMedida>('Unit', { nonNullable: true }),
    // Solo obligatorio cuando unidadMedida es 'Box' — se activa/desactiva en actualizarUnidadMedida().
    unidadesPorCaja: new FormControl<number | null>(null, { validators: [Validators.min(1)] }),
    codigoBarras: new FormControl('', { nonNullable: true }),
    requiereSerie: new FormControl(false, { nonNullable: true }),
    ubicacion: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    stockInicial: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    stockMinimo: new FormControl(5, { nonNullable: true, validators: [Validators.min(0)] }),
    precioCompra: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
    precioVenta: new FormControl<number | null>(null, { validators: [Validators.required] }),
    vidaUtilAplica: new FormControl(true, { nonNullable: true }),
    vidaUtilCategoria: new FormControl(CATEGORIAS_VIDA_UTIL[0], { nonNullable: true }),
    vidaUtilVentana: new FormControl(VENTANAS_AVISO[0].label, { nonNullable: true }),
    vidaUtilDuracionDias: new FormControl<number | null>(DURACION_DIAS_POR_CATEGORIA[CATEGORIAS_VIDA_UTIL[0]], {
      validators: [Validators.required, Validators.min(1)],
    }),
  });

  /** true cuando la unidad elegida es "Caja" — muestra y exige el campo "Unidades por caja". */
  readonly esPorCaja = toSignal(this.form.controls.unidadMedida.valueChanges, {
    initialValue: this.form.controls.unidadMedida.value,
  });

  private readonly categoryIdSignal = toSignal(this.form.controls.categoryId.valueChanges, {
    initialValue: this.form.controls.categoryId.value,
  });
  private readonly marcaSignal = toSignal(this.form.controls.marca.valueChanges, { initialValue: this.form.controls.marca.value });
  /** Parte numérica del SKU: estable entre cambios de categoría/marca; solo cambia con "Regenerar código". */
  private readonly codigoNumerico = signal(codigoNumericoAleatorio());

  /** SKU = CATEGORÍA-MARCA-código numérico (ver `prefijoSku`). No es editable a mano: se compone
   * automáticamente a partir de la categoría y la marca elegidas, como pidió el negocio para que
   * la referencia sea consistente en todo el catálogo. En modo edición es fija (la del producto): la
   * referencia es su identidad estable, no se regenera. */
  readonly skuGenerado = computed(() => {
    if (this.modoEdicion) return this.skuEditando ?? '';
    const categoria = this.categorias().find((c) => c.id === this.categoryIdSignal());
    const marca = this.marcaSignal().trim();
    if (!categoria || !marca) return '';
    return `${prefijoSku(categoria.name)}-${prefijoSku(marca)}-${this.codigoNumerico()}`;
  });

  private readonly precioCompraSignal = toSignal(this.form.controls.precioCompra.valueChanges, {
    initialValue: this.form.controls.precioCompra.value,
  });
  private readonly precioVentaSignal = toSignal(this.form.controls.precioVenta.valueChanges, {
    initialValue: this.form.controls.precioVenta.value,
  });

  /** (venta - costo) / venta, en porcentaje — null hasta que haya precio de compra Y de venta. */
  readonly margenPorcentaje = computed(() => {
    const costo = this.precioCompraSignal();
    const venta = this.precioVentaSignal();
    if (costo === null || venta === null || venta <= 0) return null;
    return Math.round(((venta - costo) / venta) * 100 * 100) / 100;
  });

  ngOnInit(): void {
    this.categoriasService.cargarCategorias().subscribe({
      next: (categorias) => {
        if (categorias.length > 0 && !this.form.controls.categoryId.value) this.form.controls.categoryId.setValue(categorias[0].id);
      },
      error: () => {},
    });
    this.proveedoresService.cargarProveedores().subscribe({ error: () => {} });

    // El campo "Unidades por caja" solo tiene sentido (y solo viaja en el payload) cuando la
    // unidad de medida es Caja; se deshabilita del todo en cualquier otro caso.
    this.form.controls.unidadMedida.valueChanges.subscribe((unidad) => this.actualizarUnidadesPorCaja(unidad));
    this.actualizarUnidadesPorCaja(this.form.controls.unidadMedida.value);

    // El checkbox no solo oculta la sección con CSS: los selects se deshabilitan de verdad
    // para que no viajen en el payload cuando el recordatorio de vida útil no aplica.
    this.form.controls.vidaUtilAplica.valueChanges.subscribe((aplica) => this.actualizarVidaUtil(aplica));
    this.actualizarVidaUtil(this.form.controls.vidaUtilAplica.value);

    // Al cambiar de categoría se sugiere su duración por defecto (o se deja vacío para que la
    // persona la escriba, en "Personalizada") — siempre queda editable después.
    this.form.controls.vidaUtilCategoria.valueChanges.subscribe((categoria) => {
      this.form.controls.vidaUtilDuracionDias.setValue(DURACION_DIAS_POR_CATEGORIA[categoria] ?? null);
    });

    if (this.skuEditando) {
      this.inventarioService.buscarProducto(this.skuEditando).subscribe({
        next: (producto) => this.precargarDesdeProducto(producto),
        error: () => {},
      });
    }
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setExtra(null);
  }

  private precargarDesdeProducto(producto: Producto): void {
    this.productoId = producto.id;
    this.stockActual.set(producto.stockQuantity);
    this.breadcrumbService.setExtra(`${producto.sku} · Editar`);
    const ventana = this.ventanasAviso.find(
      (w) => JSON.stringify(w.dias) === JSON.stringify(producto.lifecycleReminderWindowDays ?? []),
    );
    this.form.patchValue({
      nombre: producto.name,
      categoryId: producto.categoryId,
      marca: producto.brand,
      codigoBarras: producto.barcode ?? '',
      requiereSerie: producto.requiresSerialNumber,
      proveedorId: producto.suppliers[0]?.supplierId ?? '',
      unidadMedida: producto.unitOfMeasure,
      unidadesPorCaja: producto.unitsPerBox ?? null,
      ubicacion: producto.storageLocation,
      stockMinimo: producto.minStock,
      precioCompra: producto.purchaseCost ?? null,
      precioVenta: producto.salePrice,
      vidaUtilAplica: producto.hasLifecycleReminder,
      vidaUtilCategoria: producto.lifecycleCategory ?? CATEGORIAS_VIDA_UTIL[0],
      vidaUtilVentana: ventana?.label ?? VENTANAS_AVISO[0].label,
    });
    // El patchValue de arriba dispara el listener que sugiere una duración por defecto para la
    // categoría — se pisa acá con la que el producto ya tenía guardada de verdad.
    this.form.controls.vidaUtilDuracionDias.setValue(
      producto.lifecycleDurationDays ?? DURACION_DIAS_POR_CATEGORIA[producto.lifecycleCategory ?? ''] ?? null,
    );
  }

  private actualizarUnidadesPorCaja(unidad: UnidadMedida): void {
    if (unidad === 'Box') {
      this.form.controls.unidadesPorCaja.enable({ emitEvent: false });
      this.form.controls.unidadesPorCaja.addValidators(Validators.required);
    } else {
      this.form.controls.unidadesPorCaja.disable({ emitEvent: false });
      this.form.controls.unidadesPorCaja.setValue(null, { emitEvent: false });
    }
  }

  private actualizarVidaUtil(aplica: boolean): void {
    const metodo = aplica ? 'enable' : 'disable';
    this.form.controls.vidaUtilCategoria[metodo]({ emitEvent: false });
    this.form.controls.vidaUtilVentana[metodo]({ emitEvent: false });
    this.form.controls.vidaUtilDuracionDias[metodo]({ emitEvent: false });
  }

  regenerarCodigo(): void {
    this.codigoNumerico.set(codigoNumericoAleatorio());
  }

  /** El mismo código puede repetirse en otros productos (p. ej. un "Grupo A30" en varias marcas) —
   * no se valida unicidad aquí, ver el comentario en ProductConfiguration del backend. */
  onCodigoBarrasLeido(evento: CodigoLeido): void {
    this.form.controls.codigoBarras.setValue(evento.texto);
    this.toast.success(`Código de barras capturado (${evento.formato}).`);
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.skuGenerado()) {
      this.toast.error('Elige categoría y marca para generar la referencia (SKU).');
      return;
    }
    this.guardando.set(true);

    if (this.modoEdicion) {
      this.inventarioService.actualizarProducto(this.productoId, this.construirPayloadEdicion()).subscribe({
        next: (producto) => {
          this.toast.success(`Producto ${producto.sku} actualizado.`);
          void this.router.navigate(['/inventario', producto.sku]);
        },
        error: () => this.guardando.set(false),
      });
      return;
    }

    this.inventarioService.crearProducto(this.construirPayload()).subscribe({
      next: (producto) => {
        this.toast.success(`Producto ${producto.sku} creado.`);
        void this.router.navigate(['/inventario', producto.sku]);
      },
      error: () => {
        this.guardando.set(false);
        // El fallo más probable es una colisión de SKU (2 productos de la misma categoría+marca
        // cayeron en el mismo código de 3 dígitos) — se regenera para que el reintento no repita el choque.
        this.regenerarCodigo();
      },
    });
  }

  private construirPayload(): NuevoProductoPayload {
    const v = this.form.getRawValue();
    const ventana = this.ventanasAviso.find((w) => w.label === v.vidaUtilVentana);
    return {
      sku: this.skuGenerado(),
      barcode: v.codigoBarras.trim() || undefined,
      requiresSerialNumber: v.requiereSerie,
      name: v.nombre,
      categoryId: v.categoryId,
      brand: v.marca,
      storageLocation: v.ubicacion,
      initialStock: v.stockInicial,
      minStock: v.stockMinimo,
      salePrice: v.precioVenta ?? 0,
      purchaseCost: v.precioCompra ?? undefined,
      unitOfMeasure: v.unidadMedida,
      unitsPerBox: v.unidadMedida === 'Box' ? (v.unidadesPorCaja ?? undefined) : undefined,
      suppliers: v.proveedorId ? [{ supplierId: v.proveedorId, purchaseCost: v.precioCompra ?? undefined, isPrimary: true }] : [],
      hasLifecycleReminder: v.vidaUtilAplica,
      lifecycleCategory: v.vidaUtilAplica ? v.vidaUtilCategoria : undefined,
      lifecycleReminderWindowDays: v.vidaUtilAplica ? (ventana?.dias ?? []) : undefined,
      lifecycleDurationDays: v.vidaUtilAplica ? (v.vidaUtilDuracionDias ?? undefined) : undefined,
    };
  }

  private construirPayloadEdicion(): ActualizarProductoPayload {
    const { sku: _sku, initialStock: _initialStock, ...resto } = this.construirPayload();
    return resto;
  }
}
