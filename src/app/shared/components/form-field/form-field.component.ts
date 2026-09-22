import { Component, input } from '@angular/core';

let siguienteId = 0;

/**
 * Envuelve `.field` + label del mockup. Proyecta el control nativo (input/select/textarea):
 * `<app-form-field label="Cantidad"><input type="number" formControlName="cantidad"></app-form-field>`
 * El `for`/`id` se asignan automáticamente si el control proyectado no trae uno propio.
 */
@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly hint = input<string>('');
  readonly inputId = input(`field-${++siguienteId}`);
}
