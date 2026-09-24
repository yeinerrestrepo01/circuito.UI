import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-corta.pipe';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { EstadoVenta, LABEL_ESTADO_VENTA, Venta } from '../../models/venta.model';
import { VentasService } from '../../services/ventas.service';

const ESTADO_BADGE: Record<EstadoVenta, EstadoBadge> = {
  Completed: 'success',
  Voided: 'danger',
};

@Component({
  selector: 'app-historial-ventas',
  imports: [RouterLink, RouterLinkActive, CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent, FechaCortaPipe, CopPipe],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.scss',
})
export class HistorialVentasComponent implements OnInit {
  private readonly ventasService = inject(VentasService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly router = inject(Router);

  readonly ventas = this.ventasService.ventas;
  readonly busqueda = signal('');
  readonly anulando = signal<string | null>(null);

  readonly ventasFiltradas = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const ventas = this.ventas();
    if (!termino) return ventas;
    return ventas.filter(
      (v) => String(v.number).includes(termino) || v.customerName.toLowerCase().includes(termino) || v.performedByName.toLowerCase().includes(termino),
    );
  });

  readonly columnas: ColumnDef<Venta>[] = [
    { key: 'number', header: 'Nº', cell: (v) => `#${v.number}` },
    { key: 'createdAt', header: 'Fecha' },
    { key: 'customerName', header: 'Cliente' },
    { key: 'total', header: 'Total' },
    { key: 'status', header: 'Estado' },
    { key: 'acciones', header: '' },
  ];

  ngOnInit(): void {
    this.ventasService.cargarVentas().subscribe({ error: () => {} });
  }

  estadoLabel(estado: EstadoVenta): string {
    return LABEL_ESTADO_VENTA[estado];
  }

  estadoBadge(estado: EstadoVenta): EstadoBadge {
    return ESTADO_BADGE[estado];
  }

  ver(venta: Venta): void {
    void this.router.navigate(['/ventas', venta.id]);
  }

  /** Reimprimir sin pasar antes por el detalle — abre la misma página de impresión aislada
   * (sin rail/topbar) en una pestaña nueva, igual que el botón "Imprimir" de VentaDetalleComponent. */
  imprimir(venta: Venta): void {
    window.open(`/ventas/${venta.id}/imprimir`, '_blank');
  }

  async anular(venta: Venta): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar({
      titulo: 'Anular venta',
      mensaje: `¿Anular la venta #${venta.number}? El stock vendido vuelve al inventario. No se puede deshacer.`,
      textoConfirmar: 'Sí, anular',
      peligroso: true,
    });
    if (!confirmado) return;
    this.anulando.set(venta.id);
    this.ventasService.anularVenta(venta.id).subscribe({
      next: () => {
        this.toast.success(`Venta #${venta.number} anulada — inventario restaurado.`);
        this.anulando.set(null);
      },
      error: () => this.anulando.set(null),
    });
  }
}
