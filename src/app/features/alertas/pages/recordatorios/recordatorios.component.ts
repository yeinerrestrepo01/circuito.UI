import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ESTADOS_RECORDATORIO, EstadoRecordatorio, Recordatorio } from '../../models/recordatorio.model';
import { AlertasService } from '../../services/alertas.service';

const ESTADO_BADGE: Record<EstadoRecordatorio, EstadoBadge> = {
  programado: 'info',
  enviado: 'warning',
  abierto: 'info',
  interesado: 'info',
  convertido: 'success',
  rebotado: 'danger',
};
const ESTADO_LABEL: Record<EstadoRecordatorio, string> = {
  programado: 'Programado',
  enviado: 'Enviado',
  abierto: 'Abierto',
  interesado: 'Interesado',
  convertido: 'Convertido',
  rebotado: 'Rebotado',
};

@Component({
  selector: 'app-recordatorios',
  imports: [CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent],
  templateUrl: './recordatorios.component.html',
  styleUrl: './recordatorios.component.scss',
})
export class RecordatoriosComponent implements OnInit {
  private readonly alertasService = inject(AlertasService);

  readonly filtros = ESTADOS_RECORDATORIO;
  readonly filtroActivo = signal<EstadoRecordatorio | 'todos'>('todos');

  readonly columnas: ColumnDef<Recordatorio>[] = [
    { key: 'cliente', header: 'Cliente' },
    { key: 'producto', header: 'Producto' },
    { key: 'vehiculo', header: 'Vehículo' },
    { key: 'vencimiento', header: 'Vencimiento' },
    { key: 'canal', header: 'Canal' },
    { key: 'estado', header: 'Estado' },
  ];

  readonly recordatoriosFiltrados = computed(() => {
    const filtro = this.filtroActivo();
    const todos = this.alertasService.recordatorios();
    return filtro === 'todos' ? todos : todos.filter((r) => r.estado === filtro);
  });

  ngOnInit(): void {
    this.alertasService.cargarRecordatorios().subscribe({ error: () => {} });
  }

  estadoBadge(estado: EstadoRecordatorio): EstadoBadge {
    return ESTADO_BADGE[estado];
  }

  estadoLabel(estado: EstadoRecordatorio): string {
    return ESTADO_LABEL[estado];
  }
}
