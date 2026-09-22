import { Component, input } from '@angular/core';

export type KpiVariante = 'neutral' | 'warning' | 'danger' | 'success';

/** Tarjeta de KPI simple (label + valor). Para el indicador circular usar `ServiceRingComponent`. */
@Component({
  selector: 'app-kpi-tile',
  templateUrl: './kpi-tile.component.html',
  styleUrl: './kpi-tile.component.scss',
})
export class KpiTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly variant = input<KpiVariante>('neutral');
}
