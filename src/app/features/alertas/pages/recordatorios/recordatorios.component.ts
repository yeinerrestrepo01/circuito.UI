import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-corta.pipe';
import { abrirWhatsApp } from '../../../../shared/utils/whatsapp';
import { RecordatorioPendiente } from '../../models/recordatorio.model';
import { AlertasService } from '../../services/alertas.service';

/**
 * Alertas: todos los recordatorios de vida útil pendientes del tenant (baterías, pastillas de freno,
 * aceite — lo que se haya marcado en el producto) que ya llegaron a su fecha de aviso. El contacto es
 * manual por WhatsApp (`wa.me`) — abre el chat con el mensaje ya escrito, la persona solo toca
 * "Enviar"; no hay envío automático (eso requeriría la API paga de WhatsApp Business, pospuesta).
 */
@Component({
  selector: 'app-recordatorios',
  imports: [CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent, FechaCortaPipe],
  templateUrl: './recordatorios.component.html',
  styleUrl: './recordatorios.component.scss',
})
export class RecordatoriosComponent implements OnInit {
  private readonly alertasService = inject(AlertasService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  private readonly nombreNegocio = this.authService.usuario()?.empresaNombre ?? 'nuestro taller';
  readonly busqueda = signal('');
  readonly contactando = signal<string | null>(null);

  readonly recordatoriosFiltrados = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const todos = this.alertasService.recordatorios();
    if (!termino) return todos;
    return todos.filter(
      (r) => r.customerName.toLowerCase().includes(termino) || r.productName.toLowerCase().includes(termino) || r.sku.toLowerCase().includes(termino),
    );
  });

  readonly columnas: ColumnDef<RecordatorioPendiente>[] = [
    { key: 'customerName', header: 'Cliente' },
    { key: 'productName', header: 'Producto' },
    { key: 'expiryDate', header: 'Vencimiento estimado' },
    { key: 'estado', header: 'Estado' },
    { key: 'acciones', header: '' },
  ];

  ngOnInit(): void {
    this.alertasService.cargarRecordatorios().subscribe({ error: () => {} });
  }

  estadoBadge(r: RecordatorioPendiente): EstadoBadge {
    return r.isOverdue ? 'danger' : 'warning';
  }

  estadoLabel(r: RecordatorioPendiente): string {
    return r.isOverdue ? 'Vencido' : 'Por vencer';
  }

  recordarPorWhatsApp(r: RecordatorioPendiente): void {
    if (!r.customerPhone) return;
    const mensaje = r.isOverdue
      ? `Hola ${r.customerName}, en ${this.nombreNegocio} te recordamos que tu ${r.productName} ya cumplió su vida útil estimada — te esperamos para revisarlo o cambiarlo cuando puedas.`
      : `Hola ${r.customerName}, en ${this.nombreNegocio} te recordamos que tu ${r.productName} está por cumplir su vida útil estimada. Si querés, pasá a revisarlo o cambiarlo. ¡Gracias por preferirnos!`;
    abrirWhatsApp(r.customerPhone, mensaje);
  }

  async marcarContactado(r: RecordatorioPendiente): Promise<void> {
    const confirmado = await this.confirmDialog.confirmar({
      titulo: 'Marcar como contactado',
      mensaje: `¿Ya contactaste a ${r.customerName} por "${r.productName}"? No se puede deshacer.`,
      textoConfirmar: 'Sí, marcar como contactado',
    });
    if (!confirmado) return;
    this.contactando.set(r.id);
    this.alertasService.marcarContactado(r.id).subscribe({
      next: () => {
        this.toast.success(`${r.customerName} marcado como contactado.`);
        this.contactando.set(null);
      },
      error: () => this.contactando.set(null),
    });
  }
}
