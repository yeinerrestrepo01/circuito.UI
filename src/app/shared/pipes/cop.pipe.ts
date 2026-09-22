import { Pipe, PipeTransform } from '@angular/core';
import { formatearCop } from '../utils/formato';

@Pipe({ name: 'cop' })
export class CopPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return valor == null ? '—' : formatearCop(valor);
  }
}
