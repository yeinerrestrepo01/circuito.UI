import { Directive, TemplateRef, inject, input } from '@angular/core';
import { DataTableCellContext } from './column-def';

/**
 * Plantilla de celda personalizada para una columna de `<app-data-table>`, por su `key`:
 * `<ng-template appCellDef="estado" let-row><app-status-badge .../></ng-template>`
 */
@Directive({ selector: '[appCellDef]' })
export class CellDefDirective<T> {
  readonly templateRef = inject<TemplateRef<DataTableCellContext<T>>>(TemplateRef);
  readonly appCellDef = input.required<string>();

  static ngTemplateContextGuard<T>(_dir: CellDefDirective<T>, ctx: unknown): ctx is DataTableCellContext<T> {
    return true;
  }
}
