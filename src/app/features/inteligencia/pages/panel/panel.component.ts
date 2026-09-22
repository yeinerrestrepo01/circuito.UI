import { Component, OnInit, inject } from '@angular/core';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { ProductoObsolescencia } from '../../models/inteligencia.model';
import { InteligenciaService } from '../../services/inteligencia.service';

const COLOR_POR_CATEGORIA: Record<string, string> = {
  A: 'var(--color-brand)',
  B: 'var(--color-warning-dark)',
  C: 'var(--color-border)',
};

@Component({
  selector: 'app-panel-inteligencia',
  imports: [CardComponent, DataTableComponent, CellDefDirective, CopPipe],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.scss',
})
export class PanelInteligenciaComponent implements OnInit {
  private readonly inteligenciaService = inject(InteligenciaService);

  readonly clasificacionAbc = this.inteligenciaService.clasificacionAbc;
  readonly obsolescencia = this.inteligenciaService.obsolescencia;

  readonly columnas: ColumnDef<ProductoObsolescencia>[] = [
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'producto', header: 'Producto' },
    { key: 'diasSinMovimiento', header: 'Días sin movimiento' },
    { key: 'valorInmovilizado', header: 'Valor inmovilizado' },
  ];

  ngOnInit(): void {
    this.inteligenciaService.cargar().subscribe({ error: () => {} });
  }

  colorCategoria(categoria: string): string {
    return COLOR_POR_CATEGORIA[categoria] ?? 'var(--color-border)';
  }

  colorDias(dias: number): string {
    return dias >= 180 ? 'var(--color-danger)' : dias >= 120 ? 'var(--color-warning)' : 'inherit';
  }
}
