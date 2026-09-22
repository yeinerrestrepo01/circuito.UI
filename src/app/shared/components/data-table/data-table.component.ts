import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, contentChildren, input } from '@angular/core';
import { CellDefDirective } from './cell-def.directive';
import { ColumnDef } from './column-def';

/**
 * Tabla de datos genérica: alimenta `columns` + `rows` y, para columnas que necesiten un
 * componente (estado, acciones), define `<ng-template appCellDef="key" let-row>`.
 */
@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T> {
  readonly columns = input.required<ColumnDef<T>[]>();
  readonly rows = input.required<readonly T[]>();
  /** Texto mostrado cuando `rows` está vacío. */
  readonly emptyMessage = input('Sin datos para mostrar.');

  private readonly cellTemplates = contentChildren(CellDefDirective<T>);

  private readonly templatesPorClave = computed(() => {
    const mapa = new Map<string, CellDefDirective<T>>();
    for (const plantilla of this.cellTemplates()) mapa.set(plantilla.appCellDef(), plantilla);
    return mapa;
  });

  plantillaPara(clave: string) {
    return this.templatesPorClave().get(clave)?.templateRef;
  }

  valorDe(row: T, col: ColumnDef<T>): string {
    if (col.cell) return col.cell(row);
    const valor = (row as Record<string, unknown>)[col.key];
    return valor == null ? '' : String(valor);
  }
}
