import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbService } from '../../../../core/services/breadcrumb.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-corta.pipe';
import { LABEL_TIPO_MOVIMIENTO, MovimientoInventario } from '../../models/movimiento.model';
import { Producto } from '../../models/producto.model';
import { ProductoProveedor } from '../../models/proveedor.model';
import { InventarioService } from '../../services/inventario.service';

type Pestana = 'movimientos' | 'compatibilidad' | 'recordatorios';

const ESTADO_LABEL: Record<Producto['status'], string> = {
  Available: 'Disponible',
  LowStock: 'Stock bajo',
  OutOfStock: 'Agotado',
};

@Component({
  selector: 'app-producto-detalle',
  imports: [RouterLink, CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent, CopPipe, FechaCortaPipe],
  templateUrl: './producto-detalle.component.html',
  styleUrl: './producto-detalle.component.scss',
})
export class ProductoDetalleComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly inventarioService = inject(InventarioService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly toast = inject(ToastService);

  readonly sku = this.route.snapshot.paramMap.get('sku')!;
  readonly producto = signal<Producto | null>(null);
  readonly movimientos = this.inventarioService.movimientos;
  readonly pestanaActiva = signal<Pestana>('movimientos');
  readonly cambiandoEstado = signal(false);

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
    this.inventarioService.buscarProducto(this.sku).subscribe({ next: (producto) => this.producto.set(producto), error: () => {} });
    this.inventarioService.cargarMovimientos(this.sku).subscribe({ error: () => {} });
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

  cambiarEstado(producto: Producto): void {
    if (producto.isActive && !confirm(`¿Inactivar "${producto.name}"? Dejará de aparecer para venderlo o comprarlo, pero su historial se conserva.`)) {
      return;
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
