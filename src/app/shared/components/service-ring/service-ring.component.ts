import { Component, computed, input } from '@angular/core';

/** Anillo de progreso circular (p. ej. nivel de servicio). `percentage` en el rango 0–100. */
@Component({
  selector: 'app-service-ring',
  templateUrl: './service-ring.component.html',
  styleUrl: './service-ring.component.scss',
})
export class ServiceRingComponent {
  readonly percentage = input.required<number>();
  readonly label = input.required<string>();
  readonly sublabel = input<string>('');
  /** Color del anillo; por defecto `--color-brand`. Acepta cualquier valor CSS válido. */
  readonly accent = input<string>('var(--color-brand)');

  protected readonly pct = computed(() => Math.max(0, Math.min(100, this.percentage())));
}
