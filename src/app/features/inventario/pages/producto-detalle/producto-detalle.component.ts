import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-corta.pipe';
import { LABEL_TIPO_MOVIMIENTO, MovimientoInventario } from '../../models/movimiento.model';
import { Producto } from '../../models/producto.model';
import { ProductoProveedor } from '../../models/proveedor.model';
import { InventarioService } from '../../services/inventario.service';
import {
  CodigoOem,
  CompatibilidadProducto,
  LABEL_TIPO_EQUIVALENCIA,
  OPCIONES_TIPO_EQUIVALENCIA,
  TipoEquivalencia,
  etiquetaVehiculo,
} from '../../../compatibilidad/models/equivalencia.model';
import { CompatibilidadService } from '../../../compatibilidad/services/compatibilidad.service';
import { RecordatorioProducto } from '../../../alertas/models/recordatorio.model';
import { AlertasService } from '../../../alertas/services/alertas.service';

type Pestana = 'movimientos' | 'compatibilidad' | 'recordatorios';

const ESTADO_LABEL: Record<Producto['status'], string> = {
  Available: 'Disponible',
  LowStock: 'Stock bajo',
  OutOfStock: 'Agotado',
};

@Component({
  selector: 'app-producto-detalle',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    CardComponent,
    DataTableComponent,
    CellDefDirective,
    StatusBadgeComponent,
    FormFieldComponent,
    CopPipe,
    FechaCortaPipe,
  ],
  templateUrl: './producto-detalle.component.html',
  styleUrl: './producto-detalle.component.scss',
})
export class ProductoDetalleComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly inventarioService = inject(InventarioService);
  private readonly compatibilidadService = inject(CompatibilidadService);
  private readonly alertasService = inject(AlertasService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly sku = this.route.snapshot.paramMap.get('sku')!;
  readonly producto = signal<Producto | null>(null);
  readonly movimientos = this.inventarioService.movimientos;
  readonly pestanaActiva = signal<Pestana>('movimientos');
  readonly cambiandoEstado = signal(false);

  // --- Compatibilidad: gestión de vehículos/códigos OEM de este producto puntual (el buscador
  // general vive en /compatibilidad; acá se completa el número que ya mostraba la métrica). ---
  readonly vehiculos = this.compatibilidadService.vehiculos;
  readonly opcionesTipoEquivalencia = OPCIONES_TIPO_EQUIVALENCIA;
  readonly etiquetaVehiculo = etiquetaVehiculo;
  readonly compatibilidades = signal<CompatibilidadProducto[]>([]);
  readonly codigosOem = signal<CodigoOem[]>([]);
  readonly vehiculoAAgregar = new FormControl('', { nonNullable: true });
  readonly tipoAAgregar = new FormControl<TipoEquivalencia>('Original', { nonNullable: true });
  readonly codigoOemAAgregar = new FormControl('', { nonNullable: true });
  readonly fabricanteAAgregar = new FormControl('', { nonNullable: true });
  readonly agregandoCompatibilidad = signal(false);
  readonly agregandoOem = signal(false);

  readonly columnasCompatibilidades: ColumnDef<CompatibilidadProducto>[] = [
    { key: 'vehicleLabel', header: 'Vehículo' },
    { key: 'compatibilityType', header: 'Tipo' },
    { key: 'acciones', header: '' },
  ];

  readonly columnasOem: ColumnDef<CodigoOem>[] = [
    { key: 'code', header: 'Código OEM', mono: true },
    { key: 'manufacturer', header: 'Fabricante', cell: (o) => o.manufacturer ?? '—' },
    { key: 'acciones', header: '' },
  ];

  // --- Recordatorios enviados: los avisos de vida útil generados por ventas de ESTE producto (el
  // buscador/gestión general vive en /alertas). ---
  readonly recordatoriosProducto = signal<RecordatorioProducto[]>([]);

  readonly columnasRecordatorios: ColumnDef<RecordatorioProducto>[] = [
    { key: 'customerName', header: 'Cliente' },
    { key: 'saleNumber', header: 'Venta', cell: (r) => `#${r.saleNumber}` },
    { key: 'expiryDate', header: 'Vencimiento estimado' },
    { key: 'estado', header: 'Estado' },
  ];

  readonly estadoBadge = computed<EstadoBadge>(() => {
    const estado = this.producto()?.status;
    return estado === 'OutOfStock' ? 'danger' : estado === 'LowStock' ? 'warning' : 'success';
  });
  readonly estadoLabel = computed(() => ESTADO_LABEL[this.producto()?.status ?? 'Available']);
  /** Primero de `suppliers` — el backend ya los ordena con el principal primero (ver ProductMapper.ToSupplierDtos). */
  readonly proveedorPrincipal = computed(() => this.producto()?.suppliers[0] ?? null);

  readonly columnas: ColumnDef<MovimientoInventario>[] = [
    { key: 'createdAt', header: 'Fecha' },
    { key: 'type', header: 'Tipo' },
    { key: 'quantity', header: 'Cantidad' },
    { key: 'performedByName', header: 'Usuario' },
  ];

  readonly columnasProveedores: ColumnDef<ProductoProveedor>[] = [
    { key: 'supplierName', header: 'Proveedor' },
    { key: 'purchaseCost', header: 'Costo de compra' },
  ];

  ngOnInit(): void {
    this.breadcrumbService.setExtra(this.sku);
    // El toast de error ya lo muestra el interceptor global; el handler vacío solo evita
    // que RxJS relance la excepción como "unhandled" al no encontrar un observer de error.
    this.inventarioService.buscarProducto(this.sku).subscribe({
      next: (producto) => {
        this.producto.set(producto);
        this.cargarCompatibilidad(producto.id);
        this.alertasService.cargarRecordatoriosDeProducto(producto.id).subscribe({
          next: (lista) => this.recordatoriosProducto.set(lista),
          error: () => {},
        });
      },
      error: () => {},
    });
    this.inventarioService.cargarMovimientos(this.sku).subscribe({ error: () => {} });
    this.compatibilidadService.cargarVehiculos().subscribe({ error: () => {} });
  }

  private cargarCompatibilidad(productId: string): void {
    this.compatibilidadService.listarCompatibilidadesProducto(productId).subscribe({
      next: (lista) => this.compatibilidades.set(lista),
      error: () => {},
    });
    this.compatibilidadService.listarOemProducto(productId).subscribe({
      next: (lista) => this.codigosOem.set(lista),
      error: () => {},
    });
  }

  estadoRecordatorioBadge(r: RecordatorioProducto): EstadoBadge {
    if (r.status === 'Contacted') return 'success';
    return r.isOverdue ? 'danger' : 'warning';
  }

  estadoRecordatorioLabel(r: RecordatorioProducto): string {
    if (r.status === 'Contacted') return 'Contactado';
    return r.isOverdue ? 'Vencido' : 'Pendiente';
  }

  ngOnDestroy(): void {
    this.breadcrumbService.setExtra(null);
  }

  irA(pestana: Pestana): void {
    this.pestanaActiva.set(pestana);
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

  tipoEquivalenciaLabel(tipo: TipoEquivalencia): string {
    return LABEL_TIPO_EQUIVALENCIA[tipo];
  }

  agregarCompatibilidad(): void {
    const producto = this.producto();
    const vehicleId = this.vehiculoAAgregar.value;
    if (!producto || !vehicleId || this.agregandoCompatibilidad()) {
      if (!vehicleId) this.toast.error('Elige un vehículo.');
      return;
    }
    this.agregandoCompatibilidad.set(true);
    this.compatibilidadService.agregarCompatibilidad(producto.id, vehicleId, this.tipoAAgregar.value).subscribe({
      next: (compat) => {
        this.compatibilidades.update((lista) => [...lista, compat]);
        this.producto.update((p) => (p ? { ...p, compatibleVehicleCount: p.compatibleVehicleCount + 1 } : p));
        this.vehiculoAAgregar.setValue('');
        this.agregandoCompatibilidad.set(false);
        this.toast.success('Compatibilidad agregada.');
      },
      error: () => this.agregandoCompatibilidad.set(false),
    });
  }

  async quitarCompatibilidad(compat: CompatibilidadProducto): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar({
      titulo: 'Quitar compatibilidad',
      mensaje: `¿Ya no ${this.producto()?.name} sirve para "${compat.vehicleLabel}"?`,
      textoConfirmar: 'Sí, quitar',
      peligroso: true,
    });
    if (!confirmado) return;
    this.compatibilidadService.quitarCompatibilidad(compat.id).subscribe({
      next: () => {
        this.compatibilidades.update((lista) => lista.filter((c) => c.id !== compat.id));
        this.producto.update((p) => (p ? { ...p, compatibleVehicleCount: Math.max(0, p.compatibleVehicleCount - 1) } : p));
      },
      error: () => {},
    });
  }

  agregarOem(): void {
    const producto = this.producto();
    const codigo = this.codigoOemAAgregar.value.trim();
    if (!producto || !codigo || this.agregandoOem()) {
      if (!codigo) this.toast.error('Escribe el código OEM.');
      return;
    }
    this.agregandoOem.set(true);
    this.compatibilidadService.agregarOem(producto.id, codigo, this.fabricanteAAgregar.value.trim() || undefined).subscribe({
      next: (oem) => {
        this.codigosOem.update((lista) => [...lista, oem]);
        this.codigoOemAAgregar.setValue('');
        this.fabricanteAAgregar.setValue('');
        this.agregandoOem.set(false);
        this.toast.success('Código OEM agregado.');
      },
      error: () => this.agregandoOem.set(false),
    });
  }

  quitarOem(oem: CodigoOem): void {
    this.compatibilidadService.quitarOem(oem.id).subscribe({
      next: () => this.codigosOem.update((lista) => lista.filter((o) => o.id !== oem.id)),
      error: () => {},
    });
  }

  async cambiarEstado(producto: Producto): Promise<void> {
    if (producto.isActive) {
      const confirmado = await this.confirmDialog.confirmar({
        titulo: 'Inactivar producto',
        mensaje: `¿Inactivar "${producto.name}"? Dejará de aparecer para venderlo o comprarlo, pero su historial se conserva.`,
        textoConfirmar: 'Inactivar',
        peligroso: true,
      });
      if (!confirmado) return;
    }
    this.cambiandoEstado.set(true);
    this.inventarioService.cambiarEstadoProducto(producto.id, !producto.isActive).subscribe({
      next: (actualizado) => {
        this.producto.set(actualizado);
        this.toast.success(actualizado.isActive ? `"${actualizado.name}" reactivado.` : `"${actualizado.name}" inactivado.`);
        this.cambiandoEstado.set(false);
      },
      error: () => this.cambiandoEstado.set(false),
    });
  }
}
