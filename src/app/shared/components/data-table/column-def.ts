import { TemplateRef } from '@angular/core';

export interface ColumnDef<T> {
  /** Identifica la columna y, si no hay `cell` ni plantilla, se usa como `row[key]`. */
  key: string;
  header: string;
  /** Formatea el valor a texto plano. Ignorado si la columna tiene una `<ng-template appCellDef>`. */
  cell?: (row: T) => string;
  align?: 'left' | 'right';
  /** Usa `--font-mono` (referencias, SKUs). */
  mono?: boolean;
}

export interface DataTableCellContext<T> {
  $implicit: T;
}
