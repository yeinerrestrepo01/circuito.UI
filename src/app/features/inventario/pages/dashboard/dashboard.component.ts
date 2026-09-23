import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { KpiTileComponent } from '../../../../shared/components/kpi-tile/kpi-tile.component';
import { ServiceRingComponent } from '../../../../shared/components/service-ring/service-ring.component';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { Producto } from '../../models/producto.model';
import { InventarioService } from '../../services/inventario.service';

const ESTADO_LABEL: Record<Producto['status'], string> = {
  Available: 'Disponible',
  LowStock: 'Stock bajo',
  OutOfStock: 'Agotado',
};

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    CardComponent,
    DataTableComponent,
    CellDefDirective,
    KpiTileComponent,
    ServiceRingComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly inventarioService = inject(InventarioService);

  readonly productos = this.inventarioService.productos;
  readonly productosConAlerta = this.inventarioService.productosConAlerta;
  readonly quiebresDeStock = computed(() => this.productosConAlerta().filter((p) => p.status === 'OutOfStock').length);
  /** Estático hasta que exista un endpoint de KPIs agregados; replica el valor del mockup. */
  readonly ventasDelMes = '$18.4M';

  readonly columnasTodos: ColumnDef<Producto>[] = [
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'name', header: 'Producto' },
    { key: 'storageLocation', header: 'Ubicación' },
    { key: 'stockQuantity', header: 'Stock' },
    { key: 'status', header: 'Estado' },
  ];

  readonly columnasAlerta: ColumnDef<Producto>[] = [
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'name', header: 'Producto' },
    { key: 'storageLocation', header: 'Ubicación' },
  ];

  ngOnInit(): void {
    // El toast de error ya lo muestra el interceptor global; este handler solo evita
    // que RxJS relance la excepción como "unhandled" al no encontrar un observer de error.
    this.inventarioService.cargarProductos().subscribe({ error: () => {} });
  }

  estadoBadge(estado: Producto['status']): EstadoBadge {
    return estado === 'OutOfStock' ? 'danger' : estado === 'LowStock' ? 'warning' : 'success';
  }

  estadoLabel(estado: Producto['status']): string {
    return ESTADO_LABEL[estado];
  }
}
