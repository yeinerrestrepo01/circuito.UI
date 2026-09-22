import { Component, input } from '@angular/core';

export type EstadoBadge = 'warning' | 'danger' | 'success' | 'info';

/** Punto de color + texto de estado (p. ej. "Stock bajo", "Agotado"). */
@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  readonly status = input.required<EstadoBadge>();
  readonly label = input.required<string>();
}
