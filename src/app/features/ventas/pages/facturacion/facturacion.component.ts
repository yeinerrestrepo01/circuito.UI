import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../../core/services/toast.service';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { InventarioService } from '../../../inventario/services/inventario.service';
import { ItemVenta } from '../../models/factura.model';
import { VentasService } from '../../services/ventas.service';

@Component({
  selector: 'app-facturacion',
  imports: [ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, FormFieldComponent, CopPipe],
  templateUrl: './facturacion.component.html',
  styleUrl: './facturacion.component.scss',
})
export class FacturacionComponent implements OnInit {
  private readonly ventasService = inject(VentasService);
  private readonly inventarioService = inject(InventarioService);
  private readonly toast = inject(ToastService);

  readonly items = this.ventasService.items;
  readonly subtotal = this.ventasService.subtotal;
  readonly iva = this.ventasService.iva;
  readonly total = this.ventasService.total;
  readonly generando = signal(false);
  readonly busqueda = signal('');

  readonly resultadosBusqueda = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    if (!termino) return [];
    return this.inventarioService
      .productos()
      .filter((p) => p.sku.toLowerCase().includes(termino) || p.name.toLowerCase().includes(termino))
      .slice(0, 5);
  });

  readonly columnas: ColumnDef<ItemVenta>[] = [
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'producto', header: 'Producto' },
    { key: 'cantidad', header: 'Cant.' },
    { key: 'precio', header: 'Precio' },
    { key: 'subtotal', header: 'Subtotal' },
  ];

  readonly cliente = new FormGroup({
    nitOCedula: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    correo: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.inventarioService.cargarProductos().subscribe({ error: () => {} });
  }

  agregar(sku: string): void {
    const producto = this.inventarioService.productos().find((p) => p.sku === sku);
    if (producto) this.ventasService.agregarProducto(producto);
    this.busqueda.set('');
  }

  quitar(sku: string): void {
    this.ventasService.quitarItem(sku);
  }

  generarFactura(): void {
    if (this.cliente.invalid || this.items().length === 0 || this.generando()) {
      this.cliente.markAllAsTouched();
      return;
    }
    this.generando.set(true);
    this.ventasService.generarFactura({ cliente: this.cliente.getRawValue(), items: this.items() }).subscribe({
      next: () => {
        this.toast.success('Factura electrónica generada.');
        this.generando.set(false);
        this.cliente.reset({ nitOCedula: '', nombre: '', correo: '' });
      },
      error: () => this.generando.set(false),
    });
  }
}
