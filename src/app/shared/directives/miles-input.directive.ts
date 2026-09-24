import { Directive, ElementRef, HostListener, forwardRef, inject } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { formatearMiles, parsearMiles } from '../utils/formato';

/**
 * Aplica el separador de miles ("180.000") a cualquier input de precio ligado a un FormControl<number|null>
 * — el input debe ser `type="text"` (un `type="number"` nativo no admite mostrar puntos de miles, el
 * navegador los descarta). El valor real del FormControl sigue siendo un número plano (180000); solo
 * lo que se VE en pantalla lleva el separador — así el resto del código (validators, el payload que
 * se manda al backend) no se entera de este detalle visual.
 *
 * Uso: `<input type="text" inputmode="numeric" appMilesInput formControlName="precioCompra" />`
 */
@Directive({
  selector: '[appMilesInput]',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MilesInputDirective), multi: true }],
})
export class MilesInputDirective implements ControlValueAccessor {
  private readonly el = inject(ElementRef<HTMLInputElement>);
  private onChange: (valor: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(valor: number | null): void {
    this.el.nativeElement.value = valor == null ? '' : formatearMiles(valor);
  }

  registerOnChange(fn: (valor: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.el.nativeElement.disabled = disabled;
  }

  // Reformatea en cada tecla — el cursor salta al final del valor, una simplificación aceptable
  // porque un precio casi siempre se escribe de corrido, no se edita a mitad de los dígitos.
  @HostListener('input', ['$event'])
  alEscribir(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const numero = parsearMiles(input.value);
    input.value = numero == null ? '' : formatearMiles(numero);
    this.onChange(numero);
  }

  @HostListener('blur')
  alSalir(): void {
    this.onTouched();
  }
}
