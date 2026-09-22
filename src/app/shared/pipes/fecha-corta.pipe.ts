import { Pipe, PipeTransform } from '@angular/core';
import { formatearFecha } from '../utils/formato';

/** `{{ iso | fechaCorta }}` → "Hoy" / "Ayer" / "18 sep"; `| fechaCorta:true` → "18 sep 2026". */
@Pipe({ name: 'fechaCorta' })
export class FechaCortaPipe implements PipeTransform {
  transform(iso: string, completa = false): string {
    return formatearFecha(iso, completa);
  }
}
