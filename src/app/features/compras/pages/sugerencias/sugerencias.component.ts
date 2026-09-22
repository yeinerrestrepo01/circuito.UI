import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { ToastService } from '../../../../core/services/toast.service';
import { SugerenciaCompra } from '../../models/sugerencia.model';
import { ComprasService } from '../../services/compras.service';

@Component({
  selector: 'app-sugerencias-compra',
  imports: [CardComponent, DataTableComponent, CellDefDirective],
  templateUrl: './sugerencias.component.html',
  styleUrl: './sugerencias.component.scss',
})
export class SugerenciasCompraComponent implements OnInit {
  private readonly comprasService = inject(ComprasService);
  private readonly toast = inject(ToastService);

  readonly sugerencias = this.comprasService.sugerencias;
  readonly seleccionados = signal<ReadonlySet<string>>(new Set());
  readonly generando = signal(false);

  readonly columnas: ColumnDef<SugerenciaCompra>[] = [
    { key: 'seleccionado', header: '' },
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'producto', header: 'Producto' },
    { key: 'stockActual', header: 'Stock actual' },
    { key: 'sugerido', header: 'Sugerido' },
    { key: 'motivo', header: 'Motivo' },
  ];

  readonly proveedoresSeleccionados = computed(() => {
    const skus = this.seleccionados();
    const proveedores = new Set(this.sugerencias().filter((s) => skus.has(s.sku)).map((s) => s.proveedor));
    return proveedores.size;
  });

  ngOnInit(): void {
    this.comprasService.cargarSugerencias().subscribe({
      next: (sugerencias) => this.seleccionados.set(new Set(sugerencias.map((s) => s.sku))),
      error: () => {},
    });
  }

  estaSeleccionado(sku: string): boolean {
    return this.seleccionados().has(sku);
  }

  alternar(sku: string): void {
    this.seleccionados.update((actual) => {
      const copia = new Set(actual);
      copia.has(sku) ? copia.delete(sku) : copia.add(sku);
      return copia;
    });
  }

  generarOrden(): void {
    const skus = [...this.seleccionados()];
    if (skus.length === 0 || this.generando()) return;
    this.generando.set(true);
    this.comprasService.generarOrdenCompra({ skus }).subscribe({
      next: () => {
        this.toast.success('Orden de compra generada.');
        this.generando.set(false);
      },
      error: () => this.generando.set(false),
    });
  }
}
