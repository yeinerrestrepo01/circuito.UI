import { Component, booleanAttribute, input } from '@angular/core';

/** Contenedor con `background: var(--color-surface)` y borde. Proyecta contenido libre. */
@Component({
  selector: 'app-card',
  template: `<ng-content />`,
  styleUrl: './card.component.scss',
  host: {
    class: 'card',
    '[class.card--flex-col]': 'flexCol()',
    '[class.card--padded]': 'padded()',
  },
})
export class CardComponent {
  /** `display:flex; flex-direction:column` — para tarjetas que crecen dentro de un grid (p. ej. una tabla). */
  readonly flexCol = input(false, { transform: booleanAttribute });
  /** Padding interno de 20px, usado por las tarjetas de formulario/resumen del mockup. */
  readonly padded = input(false, { transform: booleanAttribute });
}
