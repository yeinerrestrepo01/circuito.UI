import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-corta.pipe';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { OrdenCompra } from '../../models/sugerencia.model';
import { ComprasService } from '../../services/compras.service';

/** Una fila por línea de producto (no por orden): igual criterio que Movimientos — más fácil de leer
 * y de filtrar que anidar las líneas dentro de cada orden. */
interface FilaOrden {
  orden: OrdenCompra;
  createdAt: string;
  supplierName: string;
  status: OrdenCompra['status'];
  sku: string;
  productName: string;
  quantity: number;
}

const ESTADO_LABEL: Record<OrdenCompra['status'], string> = {
  Pending: 'Pendiente',
  Received: 'Recibida',
  Cancelled: 'Cancelada',
};
const ESTADO_BADGE: Record<OrdenCompra['status'], EstadoBadge> = {
  Pending: 'warning',
  Received: 'success',
  Cancelled: 'danger',
};

@Component({
  selector: 'app-ordenes-compra',
  imports: [RouterLink, RouterLinkActive, CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent, FechaCortaPipe],
  templateUrl: './ordenes.component.html',
  styleUrl: './ordenes.component.scss',
})
export class OrdenesCompraComponent implements OnInit {
  private readonly comprasService = inject(ComprasService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly ordenes = this.comprasService.ordenes;
  /** Id de la orden con una acción en curso — deshabilita sus botones nada más, no toda la tabla. */
  readonly procesando = signal<string | null>(null);

  readonly filas = computed<FilaOrden[]>(() =>
    this.ordenes().flatMap((orden) =>
      orden.lines.map((linea) => ({
        orden,
        createdAt: orden.createdAt,
        supplierName: orden.supplierName,
        status: orden.status,
        sku: linea.sku,
        productName: linea.productName,
        quantity: linea.quantity,
      })),
    ),
  );

  readonly columnas: ColumnDef<FilaOrden>[] = [
    { key: 'createdAt', header: 'Fecha' },
    { key: 'supplierName', header: 'Proveedor' },
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'productName', header: 'Producto' },
    { key: 'quantity', header: 'Cantidad' },
    { key: 'status', header: 'Estado' },
    { key: 'acciones', header: '' },
  ];

  ngOnInit(): void {
    // El toast de error ya lo muestra el interceptor global; este handler solo evita
    // que RxJS relance la excepción como "unhandled" al no encontrar un observer de error.
    this.comprasService.cargarOrdenes().subscribe({ error: () => {} });
  }

  estadoLabel(estado: OrdenCompra['status']): string {
    return ESTADO_LABEL[estado];
  }

  estadoBadge(estado: OrdenCompra['status']): EstadoBadge {
    return ESTADO_BADGE[estado];
  }

  /** Registra la entrada real de inventario (un Inflow por línea) y marca la orden como recibida —
   * por eso el confirm: mueve stock de verdad, a diferencia de cancelar. */
  async recibir(orden: OrdenCompra): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar({
      titulo: 'Marcar como recibida',
      mensaje: `¿Marcar como recibida la orden de "${orden.supplierName}"? Se registrará la entrada de cada producto al inventario.`,
      textoConfirmar: 'Marcar como recibida',
    });
    if (!confirmado) return;
    this.procesando.set(orden.id);
    this.comprasService.recibirOrden(orden.id).subscribe({
      next: () => {
        this.toast.success('Orden recibida — inventario actualizado.');
        this.procesando.set(null);
      },
      error: () => this.procesando.set(null),
    });
  }

  async cancelar(orden: OrdenCompra): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar({
      titulo: 'Cancelar orden',
      mensaje: `¿Cancelar la orden de "${orden.supplierName}"? No se podrá deshacer.`,
      textoConfirmar: 'Sí, cancelar',
      peligroso: true,
    });
    if (!confirmado) return;
    this.procesando.set(orden.id);
    this.comprasService.cancelarOrden(orden.id).subscribe({
      next: () => {
        this.toast.success('Orden cancelada.');
        this.procesando.set(null);
      },
      error: () => this.procesando.set(null),
    });
  }
}
