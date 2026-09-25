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
import { Cotizacion } from '../../models/cotizacion.model';
import { CotizacionesService } from '../../services/cotizaciones.service';

@Component({
  selector: 'app-cotizaciones-historial',
  imports: [RouterLink, RouterLinkActive, CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent, FechaCortaPipe, CopPipe],
  templateUrl: './cotizaciones-historial.component.html',
  styleUrl: './cotizaciones-historial.component.scss',
})
export class CotizacionesHistorialComponent implements OnInit {
  private readonly cotizacionesService = inject(CotizacionesService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly router = inject(Router);

  readonly cotizaciones = this.cotizacionesService.cotizaciones;
  readonly busqueda = signal('');
  readonly cancelando = signal<string | null>(null);

  readonly cotizacionesFiltradas = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const cotizaciones = this.cotizaciones();
    if (!termino) return cotizaciones;
    return cotizaciones.filter((c) => String(c.number).includes(termino) || c.customerName.toLowerCase().includes(termino));
  });

  readonly columnas: ColumnDef<Cotizacion>[] = [
    { key: 'number', header: 'Nº', cell: (c) => `#${c.number}` },
    { key: 'createdAt', header: 'Fecha' },
    { key: 'customerName', header: 'Cliente' },
    { key: 'expiresAt', header: 'Vigente hasta' },
    { key: 'subtotal', header: 'Total' },
    { key: 'status', header: 'Estado' },
    { key: 'acciones', header: '' },
  ];

  ngOnInit(): void {
    this.cotizacionesService.cargarCotizaciones().subscribe({ error: () => {} });
  }

  /** "Vencida" es una etiqueta calculada (`isExpired`), no un estado guardado — ver `Quotation`. */
  estadoBadge(cotizacion: Cotizacion): EstadoBadge {
    if (cotizacion.status === 'Pending') return cotizacion.isExpired ? 'danger' : 'warning';
    return cotizacion.status === 'Converted' ? 'success' : 'danger';
  }

  estadoLabel(cotizacion: Cotizacion): string {
    if (cotizacion.status === 'Pending') return cotizacion.isExpired ? 'Vencida' : 'Pendiente';
    return cotizacion.status === 'Converted' ? 'Convertida' : 'Cancelada';
  }

  puedeCancelar(cotizacion: Cotizacion): boolean {
    return cotizacion.status === 'Pending' && !cotizacion.isExpired;
  }

  ver(cotizacion: Cotizacion): void {
    void this.router.navigate(['/ventas/cotizaciones', cotizacion.id]);
  }

  imprimir(cotizacion: Cotizacion): void {
    window.open(`/ventas/cotizaciones/${cotizacion.id}/imprimir`, '_blank');
  }

  async cancelar(cotizacion: Cotizacion): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar({
      titulo: 'Cancelar cotización',
      mensaje: `¿Cancelar la cotización #${cotizacion.number}? No se podrá convertir en venta después.`,
      textoConfirmar: 'Sí, cancelar',
      peligroso: true,
    });
    if (!confirmado) return;
    this.cancelando.set(cotizacion.id);
    this.cotizacionesService.cancelarCotizacion(cotizacion.id).subscribe({
      next: () => {
        this.toast.success(`Cotización #${cotizacion.number} cancelada.`);
        this.cancelando.set(null);
      },
      error: () => this.cancelando.set(null),
    });
  }
}
