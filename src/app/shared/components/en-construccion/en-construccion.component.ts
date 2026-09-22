import { Component, input } from '@angular/core';

/** Placeholder para módulos aún no implementados (fases posteriores del plan de producto). */
@Component({
  selector: 'app-en-construccion',
  templateUrl: './en-construccion.component.html',
  styleUrl: './en-construccion.component.scss',
})
export class EnConstruccionComponent {
  readonly modulo = input.required<string>();
}
