import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { KpiTileComponent } from '../../../../shared/components/kpi-tile/kpi-tile.component';
import { ServiceRingComponent } from '../../../../shared/components/service-ring/service-ring.component';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
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
    StatusBadgeComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly productos = this.inventarioService.productos;
  readonly productosConAlerta = this.inventarioService.productosConAlerta;
  readonly quiebresDeStock = computed(() => this.productosConAlerta().filter((p) => p.status === 'OutOfStock').length);

  readonly busqueda = signal('');
  readonly productosFiltrados = computed(() => this.filtrar(this.productos()));
  readonly productosConAlertaFiltrados = computed(() => this.filtrar(this.productosConAlerta()));

  private filtrar(lista: Producto[]): Producto[] {
    const termino = this.busqueda().trim().toLowerCase();
    if (!termino) return lista;
    return lista.filter((p) => p.sku.toLowerCase().includes(termino) || p.name.toLowerCase().includes(termino));
  }
  /** Estático hasta que exista un endpoint de KPIs agregados; replica el valor del mockup. */
  readonly ventasDelMes = '$18.4M';
  /** Id del producto cuya acción (inactivar/reactivar) está en curso — deshabilita ese botón nada más. */
  readonly cambiandoEstadoId = signal<string | null>(null);

  readonly columnasTodos: ColumnDef<Producto>[] = [
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'name', header: 'Producto' },
    { key: 'storageLocation', header: 'Ubicación' },
    { key: 'stockQuantity', header: 'Stock' },
    { key: 'status', header: 'Estado' },
    { key: 'acciones', header: '' },
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

  /** Confirmación solo al inactivar (acción que oculta el producto de donde se elegiría para
   * vender/comprar); reactivar es inocuo y no la necesita. */
  async cambiarEstado(producto: Producto): Promise<void> {
    if (producto.isActive) {
      const confirmado = await this.confirmDialog.confirmar({
        titulo: 'Inactivar producto',
        mensaje: `¿Inactivar "${producto.name}"? Dejará de aparecer para venderlo o comprarlo, pero su historial se conserva.`,
        textoConfirmar: 'Inactivar',
        peligroso: true,
      });
      if (!confirmado) return;
    }
    this.cambiandoEstadoId.set(producto.id);
    this.inventarioService.cambiarEstadoProducto(producto.id, !producto.isActive).subscribe({
      next: (actualizado) => {
        this.toast.success(actualizado.isActive ? `"${actualizado.name}" reactivado.` : `"${actualizado.name}" inactivado.`);
        this.cambiandoEstadoId.set(null);
      },
      error: () => this.cambiandoEstadoId.set(null),
    });
  }
}
