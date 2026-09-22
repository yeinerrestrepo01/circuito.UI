import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { Producto } from '../../inventario/models/producto.model';
import { Factura, FacturaPayload, ItemVenta, TASA_IVA } from '../models/factura.model';

/** Carrito de la venta en curso (un tenant factura una venta a la vez en este piloto). */
@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/ventas`;

  private readonly _items = signal<ItemVenta[]>([]);
  readonly items = this._items.asReadonly();

  readonly subtotal = computed(() => this._items().reduce((suma, i) => suma + i.cantidad * i.precio, 0));
  readonly iva = computed(() => Math.round(this.subtotal() * TASA_IVA));
  readonly total = computed(() => this.subtotal() + this.iva());

  agregarProducto(producto: Producto): void {
    this._items.update((items) => {
      const existente = items.find((i) => i.sku === producto.sku);
      if (existente) {
        return items.map((i) => (i.sku === producto.sku ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [...items, { sku: producto.sku, producto: producto.nombre, cantidad: 1, precio: producto.precioVenta }];
    });
  }

  actualizarCantidad(sku: string, cantidad: number): void {
    if (cantidad < 1) return;
    this._items.update((items) => items.map((i) => (i.sku === sku ? { ...i, cantidad } : i)));
  }

  quitarItem(sku: string): void {
    this._items.update((items) => items.filter((i) => i.sku !== sku));
  }

  vaciarCarrito(): void {
    this._items.set([]);
  }

  generarFactura(payload: FacturaPayload): Observable<Factura> {
    return this.http.post<Factura>(`${this.apiUrl}/facturas`, payload).pipe(tap(() => this.vaciarCarrito()));
  }
}
