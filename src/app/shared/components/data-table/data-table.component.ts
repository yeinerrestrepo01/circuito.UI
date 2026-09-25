import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, contentChildren, effect, input, signal } from '@angular/core';
import { CellDefDirective } from './cell-def.directive';
import { ColumnDef } from './column-def';

/**
 * Tabla de datos genérica: alimenta `columns` + `rows` y, para columnas que necesiten un
 * componente (estado, acciones), define `<ng-template appCellDef="key" let-row>`.
 *
 * Pagina siempre por `pageSize` (10 por defecto) — es un componente transversal: cualquier tabla
 * de la app que use `<app-data-table>` queda paginada automáticamente, sin que cada pantalla tenga
 * que implementarlo por su cuenta.
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
  readonly pageSize = input(10);
  /** Clave estable para el `@for` de filas (p. ej. `(row) => row.sku`). Por defecto rastrea por
   * referencia del objeto — sirve mientras las filas no cambien de identidad entre renders. Si una
   * pantalla reconstruye el array en cada tecla (p. ej. un input editable de precio/cantidad dentro
   * de una celda, ver Facturación), tracking por referencia destruye y recrea ese `<tr>` — y con él el
   * input enfocado — en cada pulsación, perdiendo el foco. Pasar `trackBy` evita eso. */
  readonly trackBy = input<(row: T) => unknown>((row) => row);

  private readonly cellTemplates = contentChildren(CellDefDirective<T>);
  private readonly pagina = signal(1);

  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.rows().length / this.pageSize())));
  /** Recorta a un rango válido por si `rows()` encogió (p. ej. un filtro) desde la última página vista. */
  readonly paginaActual = computed(() => Math.min(this.pagina(), this.totalPaginas()));

  readonly filasPaginadas = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.pageSize();
    return this.rows().slice(inicio, inicio + this.pageSize());
  });

  readonly rangoTexto = computed(() => {
    const total = this.rows().length;
    if (total === 0) return '';
    const inicio = (this.paginaActual() - 1) * this.pageSize() + 1;
    const fin = Math.min(inicio + this.pageSize() - 1, total);
    return `${inicio}–${fin} de ${total}`;
  });

  private readonly templatesPorClave = computed(() => {
    const mapa = new Map<string, CellDefDirective<T>>();
    for (const plantilla of this.cellTemplates()) mapa.set(plantilla.appCellDef(), plantilla);
    return mapa;
  });

  constructor() {
    // Cada vez que cambia el conjunto de filas (nueva búsqueda, recarga, etc.) se vuelve a la
    // página 1 — quedarse en la página 3 de una lista que ahora tiene 1 sola fila sería confuso.
    effect(() => {
      this.rows();
      this.pagina.set(1);
    });
  }

  plantillaPara(clave: string) {
    return this.templatesPorClave().get(clave)?.templateRef;
  }

  valorDe(row: T, col: ColumnDef<T>): string {
    if (col.cell) return col.cell(row);
    const valor = (row as Record<string, unknown>)[col.key];
    return valor == null ? '' : String(valor);
  }

  irAPagina(pagina: number): void {
    this.pagina.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  paginaAnterior(): void {
    this.irAPagina(this.paginaActual() - 1);
  }

  paginaSiguiente(): void {
    this.irAPagina(this.paginaActual() + 1);
  }
}
