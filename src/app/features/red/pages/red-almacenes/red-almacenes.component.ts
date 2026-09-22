import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ToastService } from '../../../../core/services/toast.service';
import { InventarioService } from '../../../inventario/services/inventario.service';
import { DisponibilidadAlmacen, EstadoTransferencia, SolicitudTransferencia } from '../../models/red.model';
import { RedService } from '../../services/red.service';

const ESTADO_BADGE: Record<EstadoTransferencia, EstadoBadge> = {
  pendiente: 'warning',
  'en-transito': 'info',
  completada: 'success',
  rechazada: 'danger',
};
const ESTADO_LABEL: Record<EstadoTransferencia, string> = {
  pendiente: 'Pendiente de aprobación',
  'en-transito': 'En tránsito',
  completada: 'Completada',
  rechazada: 'Rechazada',
};

@Component({
  selector: 'app-red-almacenes',
  imports: [CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent],
  templateUrl: './red-almacenes.component.html',
  styleUrl: './red-almacenes.component.scss',
})
export class RedAlmacenesComponent implements OnInit {
  private readonly redService = inject(RedService);
  private readonly inventarioService = inject(InventarioService);
  private readonly toast = inject(ToastService);

  readonly busqueda = signal('');
  readonly productoSeleccionado = signal<{ sku: string; nombre: string } | null>(null);
  readonly disponibilidad = this.redService.disponibilidad;
  readonly solicitudes = this.redService.solicitudes;
  readonly solicitando = signal<string | null>(null);

  readonly resultadosBusqueda = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    if (!termino) return [];
    return this.inventarioService
      .productos()
      .filter((p) => p.sku.toLowerCase().includes(termino) || p.nombre.toLowerCase().includes(termino))
      .slice(0, 5);
  });

  readonly mejorOrigen = computed(() => {
    const disponibles = this.disponibilidad().filter((a) => !a.esPropio && a.unidades > 0);
    return disponibles.reduce<DisponibilidadAlmacen | null>(
      (mejor, actual) => (!mejor || actual.unidades > mejor.unidades ? actual : mejor),
      null,
    );
  });

  readonly columnas: ColumnDef<SolicitudTransferencia>[] = [
    { key: 'producto', header: 'Producto' },
    { key: 'origen', header: 'Origen' },
    { key: 'destino', header: 'Destino' },
    { key: 'cantidad', header: 'Cant.' },
    { key: 'estado', header: 'Estado' },
  ];

  ngOnInit(): void {
    this.inventarioService.cargarProductos().subscribe({ error: () => {} });
    this.redService.cargarSolicitudes().subscribe({ error: () => {} });
  }

  seleccionar(sku: string): void {
    const producto = this.inventarioService.productos().find((p) => p.sku === sku);
    if (!producto) return;
    this.productoSeleccionado.set({ sku: producto.sku, nombre: producto.nombre });
    this.busqueda.set('');
    this.redService.cargarDisponibilidad(sku).subscribe({ error: () => {} });
  }

  colorUnidades(unidades: number): string {
    return unidades === 0 ? 'var(--color-danger)' : unidades <= 2 ? 'var(--color-warning)' : 'var(--color-success)';
  }

  solicitarTransferencia(almacen: DisponibilidadAlmacen): void {
    const producto = this.productoSeleccionado();
    if (!producto || this.solicitando()) return;
    this.solicitando.set(almacen.almacen);
    this.redService.solicitarTransferencia({ sku: producto.sku, almacenOrigen: almacen.almacen, cantidad: 1 }).subscribe({
      next: () => {
        this.toast.success(`Transferencia solicitada a ${almacen.almacen}.`);
        this.solicitando.set(null);
      },
      error: () => this.solicitando.set(null),
    });
  }

  estadoBadge(estado: EstadoTransferencia): EstadoBadge {
    return ESTADO_BADGE[estado];
  }

  estadoLabel(estado: EstadoTransferencia): string {
    return ESTADO_LABEL[estado];
  }
}
