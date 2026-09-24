import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { ToastService } from '../../../../core/services/toast.service';
import { SugerenciaCompra } from '../../models/sugerencia.model';
import { ComprasService } from '../../services/compras.service';

@Component({
  selector: 'app-sugerencias-compra',
  imports: [RouterLink, RouterLinkActive, CardComponent, DataTableComponent, CellDefDirective],
  templateUrl: './sugerencias.component.html',
  styleUrl: './sugerencias.component.scss',
})
export class SugerenciasCompraComponent implements OnInit {
  private readonly comprasService = inject(ComprasService);
  private readonly toast = inject(ToastService);

  readonly sugerencias = this.comprasService.sugerencias;
  readonly seleccionados = signal<ReadonlySet<string>>(new Set());
  readonly generando = signal(false);
  /** Cantidad a pedir por Sku — arranca en la sugerida, editable antes de generar la orden. */
  readonly cantidades = signal<Record<string, number>>({});

  readonly columnas: ColumnDef<SugerenciaCompra>[] = [
    { key: 'seleccionado', header: '' },
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'productName', header: 'Producto' },
    { key: 'currentStock', header: 'Stock actual' },
    { key: 'suggestedQuantity', header: 'Sugerido' },
    { key: 'reason', header: 'Motivo' },
  ];

  readonly proveedoresSeleccionados = computed(() => {
    const skus = this.seleccionados();
    const proveedores = new Set(this.sugerencias().filter((s) => skus.has(s.sku)).map((s) => s.supplierId));
    return proveedores.size;
  });

  ngOnInit(): void {
    this.comprasService.cargarSugerencias().subscribe({
      next: (sugerencias) => {
        this.seleccionados.set(new Set(sugerencias.map((s) => s.sku)));
        this.cantidades.set(Object.fromEntries(sugerencias.map((s) => [s.sku, s.suggestedQuantity])));
      },
      error: () => {},
    });
  }

  cantidadDe(sku: string): number {
    return this.cantidades()[sku] ?? 0;
  }

  actualizarCantidad(sku: string, cantidad: number): void {
    const valor = Math.max(1, Math.floor(cantidad) || 1);
    this.cantidades.update((actuales) => ({ ...actuales, [sku]: valor }));
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
    const items = skus.map((sku) => ({ sku, quantity: this.cantidadDe(sku) }));
    this.comprasService.generarOrdenCompra({ items }).subscribe({
      next: (ordenes) => {
        this.toast.success(
          ordenes.length === 1 ? `Orden de compra generada para ${ordenes[0].supplierName}.` : `${ordenes.length} órdenes de compra generadas.`,
        );
        this.generando.set(false);
        // Se recarga: las sugerencias ya atendidas siguen apareciendo hasta que el stock realmente
        // suba (la orden generada no mueve inventario por sí sola, ver PurchaseOrderStatus.Pending).
        this.comprasService.cargarSugerencias().subscribe({ error: () => {} });
      },
      error: () => this.generando.set(false),
    });
  }
}
