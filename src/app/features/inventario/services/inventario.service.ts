import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, map, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import { MovimientoInventario, RegistrarMovimientoPayload, RegistrarMovimientosLotePayload } from '../models/movimiento.model';
import { ActualizarProductoPayload, NuevoProductoPayload, Producto } from '../models/producto.model';

/**
 * Estado del módulo de Inventario. Expone signals de solo lectura; toda mutación pasa por sus
 * métodos, que llaman a la API (`/products`, `/inventory-movements`) y luego reconcilian el
 * estado local (sin store global).
 */
@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  private readonly _productos = signal<Producto[]>([]);
  private readonly _movimientos = signal<MovimientoInventario[]>([]);
  private readonly _cargandoProductos = signal(false);
  private readonly _cargandoMovimientos = signal(false);

  readonly productos = this._productos.asReadonly();
  readonly movimientos = this._movimientos.asReadonly();
  readonly cargandoProductos = this._cargandoProductos.asReadonly();
  readonly cargandoMovimientos = this._cargandoMovimientos.asReadonly();

  readonly productosConAlerta = computed(() => this._productos().filter((p) => p.status !== 'Available'));

  /** Trae el catálogo completo y reemplaza el estado local. Se llama al entrar al Dashboard. */
  cargarProductos(): Observable<Producto[]> {
    this._cargandoProductos.set(true);
    return this.http.get<ApiResult<Producto[]>>(`${this.apiUrl}/products`).pipe(
      map((r) => r.data ?? []),
      tap((productos) => this._productos.set(productos)),
      finalize(() => this._cargandoProductos.set(false)),
    );
  }

  /** Trae el historial de movimientos; con `sku` filtra al detalle de un producto. */
  cargarMovimientos(sku?: string): Observable<MovimientoInventario[]> {
    this._cargandoMovimientos.set(true);
    const params = sku ? new HttpParams().set('sku', sku) : undefined;
    return this.http.get<ApiResult<MovimientoInventario[]>>(`${this.apiUrl}/inventory-movements`, { params }).pipe(
      map((r) => r.data ?? []),
      tap((movimientos) => this._movimientos.set(movimientos)),
      finalize(() => this._cargandoMovimientos.set(false)),
    );
  }

  buscarProducto(sku: string): Observable<Producto> {
    return this.http.get<ApiResult<Producto>>(`${this.apiUrl}/products/${sku}`).pipe(map((r) => r.data!));
  }

  /** Un solo producto — la usa la pantalla de Escaneo, que siempre resuelve exactamente un producto antes de registrar. */
  registrarMovimiento(payload: RegistrarMovimientoPayload): Observable<MovimientoInventario> {
    return this.http.post<ApiResult<MovimientoInventario>>(`${this.apiUrl}/inventory-movements`, payload).pipe(
      map((r) => r.data!),
      tap((movimiento) => {
        this._movimientos.update((lista) => [movimiento, ...lista]);
        this._productos.update((lista) => lista.map((p) => (p.sku === payload.sku ? aplicarMovimiento(p, movimiento) : p)));
      }),
    );
  }

  /** Varios productos a la vez, mismo tipo/motivo/proveedor — la usa la pantalla de Ajustes. */
  registrarMovimientos(payload: RegistrarMovimientosLotePayload): Observable<MovimientoInventario[]> {
    return this.http.post<ApiResult<MovimientoInventario[]>>(`${this.apiUrl}/inventory-movements/batch`, payload).pipe(
      map((r) => r.data ?? []),
      tap((movimientos) => {
        this._movimientos.update((lista) => [...movimientos, ...lista]);
        this._productos.update((lista) =>
          lista.map((p) => {
            const movimiento = movimientos.find((m) => m.productSku === p.sku);
            return movimiento ? aplicarMovimiento(p, movimiento) : p;
          }),
        );
      }),
    );
  }

  crearProducto(payload: NuevoProductoPayload): Observable<Producto> {
    return this.http.post<ApiResult<Producto>>(`${this.apiUrl}/products`, payload).pipe(
      map((r) => r.data!),
      tap((producto) => this._productos.update((lista) => [producto, ...lista])),
    );
  }

  actualizarProducto(id: string, payload: ActualizarProductoPayload): Observable<Producto> {
    return this.http.put<ApiResult<Producto>>(`${this.apiUrl}/products/${id}`, payload).pipe(
      map((r) => r.data!),
      tap((producto) => this._reemplazarEnLista(producto)),
    );
  }

  /** Activar/inactivar sin borrar nada del historial — ver `Producto.isActive`. */
  cambiarEstadoProducto(id: string, isActive: boolean): Observable<Producto> {
    return this.http.patch<ApiResult<Producto>>(`${this.apiUrl}/products/${id}/status`, { isActive }).pipe(
      map((r) => r.data!),
      tap((producto) => this._reemplazarEnLista(producto)),
    );
  }

  private _reemplazarEnLista(producto: Producto): void {
    this._productos.update((lista) => lista.map((p) => (p.id === producto.id ? producto : p)));
  }
}

const SIGNO_POR_TIPO: Record<MovimientoInventario['type'], 1 | -1> = {
  Inflow: 1,
  PositiveAdjustment: 1,
  Outflow: -1,
  NegativeAdjustment: -1,
  Shrinkage: -1,
};

function aplicarMovimiento(producto: Producto, movimiento: MovimientoInventario): Producto {
  const stockQuantity = Math.max(0, producto.stockQuantity + SIGNO_POR_TIPO[movimiento.type] * movimiento.quantity);
  return { ...producto, stockQuantity, status: estadoDeStock(stockQuantity, producto.minStock) };
}

function estadoDeStock(stockQuantity: number, minStock: number): Producto['status'] {
  if (stockQuantity <= 0) return 'OutOfStock';
  if (stockQuantity <= minStock) return 'LowStock';
  return 'Available';
}
