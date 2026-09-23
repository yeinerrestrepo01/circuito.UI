import { toSignal } from '@angular/core/rxjs-interop';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../../core/services/toast.service';
import { NuevoProductoPayload, OPCIONES_UNIDAD_MEDIDA, UnidadMedida } from '../../models/producto.model';
import { CategoriasService } from '../../services/categorias.service';
import { InventarioService } from '../../services/inventario.service';
import { ProveedoresService } from '../../services/proveedores.service';

const CATEGORIAS_VIDA_UTIL = [
  'Batería (12–13 meses)',
  'Pastillas de freno (por kilometraje)',
  'Aceite (por tiempo o km)',
  'Personalizada',
];
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
  imports: [RouterLink, ReactiveFormsModule, CardComponent, FormFieldComponent],
  templateUrl: './nuevo-producto.component.html',
  styleUrl: './nuevo-producto.component.scss',
})
export class NuevoProductoComponent implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  private readonly categoriasService = inject(CategoriasService);
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly categorias = this.categoriasService.categorias;
  readonly proveedores = this.proveedoresService.proveedores;
  readonly unidades = OPCIONES_UNIDAD_MEDIDA;
  readonly categoriasVidaUtil = CATEGORIAS_VIDA_UTIL;
  readonly ventanasAviso = VENTANAS_AVISO;
  readonly equivalencias = signal<string[]>(['MF-D26-80', 'NS70-80']);
  readonly guardando = signal(false);

  readonly form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    categoryId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    marca: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    proveedorId: new FormControl('', { nonNullable: true }),
    unidadMedida: new FormControl<UnidadMedida>('Unit', { nonNullable: true }),
    // Solo obligatorio cuando unidadMedida es 'Box' — se activa/desactiva en actualizarUnidadMedida().
    unidadesPorCaja: new FormControl<number | null>(null, { validators: [Validators.min(1)] }),
    ubicacion: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    stockInicial: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    stockMinimo: new FormControl(5, { nonNullable: true, validators: [Validators.min(0)] }),
    precioCompra: new FormControl<number | null>(null, { validators: [Validators.min(0)] }),
    precioVenta: new FormControl<number | null>(null, { validators: [Validators.required] }),
    vidaUtilAplica: new FormControl(true, { nonNullable: true }),
    vidaUtilCategoria: new FormControl(CATEGORIAS_VIDA_UTIL[0], { nonNullable: true }),
    vidaUtilVentana: new FormControl(VENTANAS_AVISO[0].label, { nonNullable: true }),
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
   * la referencia sea consistente en todo el catálogo. */
  readonly skuGenerado = computed(() => {
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
  }

  regenerarCodigo(): void {
    this.codigoNumerico.set(codigoNumericoAleatorio());
  }

  agregarEquivalencia(): void {
    const referencia = prompt('Referencia OEM equivalente')?.trim();
    if (referencia) this.equivalencias.update((lista) => [...lista, referencia]);
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
    };
  }
}
