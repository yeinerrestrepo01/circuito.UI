import { toSignal } from '@angular/core/rxjs-interop';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../../core/services/toast.service';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-corta.pipe';
import {
  LABEL_TIPO_MOVIMIENTO,
  MOTIVO_COMPRA_PROVEEDOR,
  MOTIVOS_POR_TIPO,
  MovimientoInventario,
  OPCIONES_TIPO_MOVIMIENTO,
  TipoMovimiento,
} from '../../models/movimiento.model';
import { Producto } from '../../models/producto.model';
import { InventarioService } from '../../services/inventario.service';
import { ProveedoresService } from '../../services/proveedores.service';
import { formatearCop } from '../../../../shared/utils/formato';

/** Producto ya agregado al movimiento en construcción, con la cantidad (y, si aplica, el costo de
 * compra) propios de esta línea. */
interface ProductoSeleccionado {
  sku: string;
  name: string;
  quantity: number;
  /** Solo se usa (y se muestra) cuando el motivo es "Compra a proveedor"; se precarga con el costo
   * de referencia del producto, si tiene uno. */
  purchaseCost: number | null;
}

@Component({
  selector: 'app-ajustes-inventario',
  imports: [RouterLink, ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, FechaCortaPipe, FormFieldComponent],
  templateUrl: './ajustes.component.html',
  styleUrl: './ajustes.component.scss',
})
export class AjustesInventarioComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly inventarioService = inject(InventarioService);
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly toast = inject(ToastService);

  readonly opcionesTipo = OPCIONES_TIPO_MOVIMIENTO;
  readonly proveedores = this.proveedoresService.proveedores;
  readonly busqueda = signal('');
  readonly registrando = signal(false);
  readonly mostrarPanel = signal(false);

  /** Búsqueda de productos a agregar al movimiento — no es parte de `form`, es un campo auxiliar de UI. */
  readonly busquedaProducto = new FormControl('', { nonNullable: true });
  private readonly terminoBusquedaProducto = toSignal(this.busquedaProducto.valueChanges, { initialValue: '' });
  readonly productosSeleccionados = signal<ProductoSeleccionado[]>([]);

  /** Resultados del buscador de productos, excluyendo los ya agregados. */
  readonly resultadosBusquedaProducto = computed(() => {
    const termino = this.terminoBusquedaProducto().trim().toLowerCase();
    if (!termino) return [];
    const yaAgregados = new Set(this.productosSeleccionados().map((p) => p.sku));
    return this.inventarioService
      .productos()
      .filter((p) => !yaAgregados.has(p.sku) && (p.sku.toLowerCase().includes(termino) || p.name.toLowerCase().includes(termino)))
      .slice(0, 6);
  });

  readonly form = new FormGroup({
    tipo: new FormControl<TipoMovimiento>('Inflow', { nonNullable: true }),
    motivo: new FormControl(MOTIVOS_POR_TIPO.Inflow[0], { nonNullable: true }),
    proveedorId: new FormControl('', { nonNullable: true }),
    observaciones: new FormControl('', { nonNullable: true }),
  });

  private readonly tipoSeleccionado = toSignal(this.form.controls.tipo.valueChanges, {
    initialValue: this.form.controls.tipo.value,
  });
  private readonly motivoSeleccionado = toSignal(this.form.controls.motivo.valueChanges, {
    initialValue: this.form.controls.motivo.value,
  });
  readonly motivosDisponibles = computed(() => MOTIVOS_POR_TIPO[this.tipoSeleccionado()]);
  /** El proveedor solo aplica cuando el movimiento es, literalmente, una compra a proveedor. */
  readonly mostrarProveedor = computed(() => this.motivoSeleccionado() === MOTIVO_COMPRA_PROVEEDOR);

  readonly columnas: ColumnDef<MovimientoInventario>[] = [
    { key: 'createdAt', header: 'Fecha' },
    { key: 'productSku', header: 'Referencia', mono: true },
    { key: 'productName', header: 'Producto' },
    { key: 'type', header: 'Tipo' },
    { key: 'quantity', header: 'Cant.' },
    { key: 'reason', header: 'Motivo' },
    { key: 'supplierName', header: 'Proveedor', cell: (m) => m.supplierName ?? '—' },
    { key: 'purchaseCost', header: 'Costo compra', cell: (m) => (m.purchaseCost != null ? formatearCop(m.purchaseCost) : '—') },
    { key: 'performedByName', header: 'Usuario' },
  ];

  readonly movimientosFiltrados = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const movimientos = this.inventarioService.movimientos();
    if (!termino) return movimientos;
    return movimientos.filter(
      (m) =>
        m.productSku.toLowerCase().includes(termino) ||
        m.productName.toLowerCase().includes(termino) ||
        m.performedByName.toLowerCase().includes(termino),
    );
  });

  ngOnInit(): void {
    // El toast de error ya lo muestra el interceptor global; este handler solo evita
    // que RxJS relance la excepción como "unhandled" al no encontrar un observer de error.
    this.inventarioService.cargarMovimientos().subscribe({ error: () => {} });
    this.proveedoresService.cargarProveedores().subscribe({ error: () => {} });

    this.inventarioService.cargarProductos().subscribe({
      next: () => {
        // Si se llegó desde "Registrar movimiento" en el detalle de un producto (?sku=X), se
        // preselecciona ese producto en vez de dejar el formulario vacío.
        const sku = this.route.snapshot.queryParamMap.get('sku');
        const producto = sku ? this.inventarioService.productos().find((p) => p.sku === sku) : undefined;
        if (producto) {
          this.agregarProducto(producto);
          this.mostrarPanel.set(true);
        }
      },
      error: () => {},
    });

    // El motivo depende del tipo: al cambiar de tipo, se propone el primer motivo válido.
    this.form.controls.tipo.valueChanges.subscribe((tipo) => {
      this.form.controls.motivo.setValue(MOTIVOS_POR_TIPO[tipo][0]);
    });
  }

  abrirPanel(): void {
    this.mostrarPanel.set(true);
  }

  cerrarPanel(): void {
    this.mostrarPanel.set(false);
    this.productosSeleccionados.set([]);
    this.busquedaProducto.setValue('');
    this.form.reset({ tipo: 'Inflow', motivo: MOTIVOS_POR_TIPO.Inflow[0], proveedorId: '', observaciones: '' });
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.mostrarPanel()) this.cerrarPanel();
  }

  seleccionarTipo(tipo: TipoMovimiento): void {
    this.form.controls.tipo.setValue(tipo);
  }

  colorTipo(tipo: MovimientoInventario['type']): string {
    return tipo === 'Inflow' || tipo === 'PositiveAdjustment'
      ? 'var(--color-success)'
      : tipo === 'NegativeAdjustment'
        ? 'var(--color-warning)'
        : 'var(--color-danger)';
  }

  labelTipo(tipo: MovimientoInventario['type']): string {
    return LABEL_TIPO_MOVIMIENTO[tipo];
  }

  agregarProducto(producto: Producto): void {
    this.productosSeleccionados.update((lista) => [
      ...lista,
      { sku: producto.sku, name: producto.name, quantity: 1, purchaseCost: producto.purchaseCost ?? null },
    ]);
    this.busquedaProducto.setValue('');
  }

  quitarProducto(sku: string): void {
    this.productosSeleccionados.update((lista) => lista.filter((p) => p.sku !== sku));
  }

  actualizarCantidad(sku: string, cantidad: number): void {
    const valor = Math.max(1, Math.floor(cantidad) || 1);
    this.productosSeleccionados.update((lista) => lista.map((p) => (p.sku === sku ? { ...p, quantity: valor } : p)));
  }

  actualizarCostoCompra(sku: string, costo: number | null): void {
    this.productosSeleccionados.update((lista) => lista.map((p) => (p.sku === sku ? { ...p, purchaseCost: costo } : p)));
  }

  registrar(): void {
    const items = this.productosSeleccionados();
    if (items.length === 0) {
      this.toast.error('Selecciona al menos un producto.');
      return;
    }
    if (this.registrando()) return;

    this.registrando.set(true);
    const v = this.form.getRawValue();
    this.inventarioService
      .registrarMovimientos({
        items: items.map((p) => ({
          sku: p.sku,
          quantity: p.quantity,
          purchaseCost: this.mostrarProveedor() && p.purchaseCost !== null ? p.purchaseCost : undefined,
        })),
        type: v.tipo,
        reason: v.motivo,
        notes: v.observaciones || undefined,
        supplierId: this.mostrarProveedor() && v.proveedorId ? v.proveedorId : undefined,
      })
      .subscribe({
        next: () => {
          this.toast.success(items.length === 1 ? 'Movimiento registrado.' : `${items.length} movimientos registrados.`);
          this.registrando.set(false);
          this.cerrarPanel();
        },
        error: () => this.registrando.set(false),
      });
  }
}
