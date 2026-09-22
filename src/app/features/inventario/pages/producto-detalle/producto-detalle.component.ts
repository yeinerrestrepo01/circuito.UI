import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-corta.pipe';
import { LABEL_TIPO_MOVIMIENTO, MovimientoInventario } from '../../models/movimiento.model';
import { Producto } from '../../models/producto.model';
import { InventarioService } from '../../services/inventario.service';

type Pestana = 'movimientos' | 'compatibilidad' | 'recordatorios';

const ESTADO_LABEL: Record<Producto['estado'], string> = {
  disponible: 'Disponible',
  'stock-bajo': 'Stock bajo',
  agotado: 'Agotado',
};

@Component({
  selector: 'app-producto-detalle',
  imports: [RouterLink, CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent, CopPipe, FechaCortaPipe],
  templateUrl: './producto-detalle.component.html',
  styleUrl: './producto-detalle.component.scss',
})
export class ProductoDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly inventarioService = inject(InventarioService);

  readonly sku = this.route.snapshot.paramMap.get('sku')!;
  readonly producto = signal<Producto | null>(null);
  readonly movimientos = this.inventarioService.movimientos;
  readonly pestanaActiva = signal<Pestana>('movimientos');

  readonly estadoBadge = computed<EstadoBadge>(() => {
    const estado = this.producto()?.estado;
    return estado === 'agotado' ? 'danger' : estado === 'stock-bajo' ? 'warning' : 'success';
  });
  readonly estadoLabel = computed(() => ESTADO_LABEL[this.producto()?.estado ?? 'disponible']);

  readonly columnas: ColumnDef<MovimientoInventario>[] = [
    { key: 'fecha', header: 'Fecha' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'cantidad', header: 'Cantidad' },
    { key: 'usuario', header: 'Usuario' },
  ];

  ngOnInit(): void {
    // El toast de error ya lo muestra el interceptor global; el handler vacío solo evita
    // que RxJS relance la excepción como "unhandled" al no encontrar un observer de error.
    this.inventarioService.buscarProducto(this.sku).subscribe({ next: (producto) => this.producto.set(producto), error: () => {} });
    this.inventarioService.cargarMovimientos(this.sku).subscribe({ error: () => {} });
  }

  irA(pestana: Pestana): void {
    this.pestanaActiva.set(pestana);
  }

  colorTipo(tipo: MovimientoInventario['tipo']): string {
    return tipo === 'entrada' || tipo === 'ajuste-positivo'
      ? 'var(--color-success)'
      : tipo === 'ajuste-negativo'
        ? 'var(--color-warning)'
        : 'var(--color-danger)';
  }

  labelTipo(tipo: MovimientoInventario['tipo']): string {
    return LABEL_TIPO_MOVIMIENTO[tipo];
  }
}
