import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, of, tap, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { API_URL } from '../../../core/config/api-url.token';
import { MovimientoInventario, RegistrarMovimientoPayload } from '../models/movimiento.model';
import { NuevoProductoPayload, Producto } from '../models/producto.model';
import { crearMovimientosDemo, crearProductosDemo } from './inventario.demo-data';

/**
 * Estado del módulo de Inventario. Expone signals de solo lectura; toda mutación pasa por sus
 * métodos, que llaman a la API y luego reconcilian el estado local (sin store global).
 *
 * En modo demo (sin backend, ver `AuthService.entrarModoDemo`) sirve el catálogo de ejemplo del
 * piloto en vez de llamar a la API, para poder navegar y probar la interacción completa.
 */
@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = `${inject(API_URL)}/inventario`;

  private readonly _productos = signal<Producto[]>([]);
  private readonly _movimientos = signal<MovimientoInventario[]>([]);
  private readonly _cargandoProductos = signal(false);
  private readonly _cargandoMovimientos = signal(false);

  /** Historial completo del almacén en modo demo; `_movimientos` puede contener solo un filtro de esto. */
  private _movimientosDemo: MovimientoInventario[] = [];

  readonly productos = this._productos.asReadonly();
  readonly movimientos = this._movimientos.asReadonly();
  readonly cargandoProductos = this._cargandoProductos.asReadonly();
  readonly cargandoMovimientos = this._cargandoMovimientos.asReadonly();

  readonly productosConAlerta = computed(() => this._productos().filter((p) => p.estado !== 'disponible'));

  constructor() {
    if (this.auth.enModoDemo()) {
      this._productos.set(crearProductosDemo());
      this._movimientosDemo = crearMovimientosDemo();
    }
  }

  /** Trae el catálogo completo y reemplaza el estado local. Se llama al entrar al Dashboard. */
  cargarProductos(): Observable<Producto[]> {
    this._cargandoProductos.set(true);
    const origen$ = this.auth.enModoDemo() ? of(this._productos()) : this.http.get<Producto[]>(`${this.apiUrl}/productos`);
    return origen$.pipe(
      tap((productos) => this._productos.set(productos)),
      finalize(() => this._cargandoProductos.set(false)),
    );
  }

  /** Trae el historial de movimientos; con `sku` filtra al detalle de un producto. */
  cargarMovimientos(sku?: string): Observable<MovimientoInventario[]> {
    this._cargandoMovimientos.set(true);
    let origen$: Observable<MovimientoInventario[]>;
    if (this.auth.enModoDemo()) {
      const todos = this._movimientosDemo;
      origen$ = of(sku ? todos.filter((m) => m.sku === sku) : todos);
    } else {
      const params = sku ? new HttpParams().set('sku', sku) : undefined;
      origen$ = this.http.get<MovimientoInventario[]>(`${this.apiUrl}/movimientos`, { params });
    }
    return origen$.pipe(
      tap((movimientos) => this._movimientos.set(movimientos)),
      finalize(() => this._cargandoMovimientos.set(false)),
    );
  }

  buscarProducto(sku: string): Observable<Producto> {
    if (this.auth.enModoDemo()) {
      const producto = this._productos().find((p) => p.sku.toLowerCase() === sku.toLowerCase());
      return producto
        ? of(producto)
        : throwError(() => new HttpErrorResponse({ status: 404, statusText: 'No encontrado', url: `${this.apiUrl}/productos/${sku}` }));
    }
    return this.http.get<Producto>(`${this.apiUrl}/productos/${sku}`);
  }

  registrarMovimiento(payload: RegistrarMovimientoPayload): Observable<MovimientoInventario> {
    if (this.auth.enModoDemo()) {
      const producto = this._productos().find((p) => p.sku === payload.sku);
      const movimiento: MovimientoInventario = {
        fecha: new Date().toISOString(),
        sku: payload.sku,
        producto: producto?.nombre ?? payload.sku,
        tipo: payload.tipo,
        cantidad: payload.cantidad,
        motivo: payload.motivo,
        usuario: this.auth.usuario()?.nombre ?? 'Usuario demo',
      };
      this._movimientosDemo = [movimiento, ...this._movimientosDemo];
      this._movimientos.update((lista) => [movimiento, ...lista]);
      if (producto) this._productos.update((lista) => lista.map((p) => (p.sku === payload.sku ? aplicarMovimiento(p, movimiento) : p)));
      return of(movimiento);
    }
    return this.http.post<MovimientoInventario>(`${this.apiUrl}/movimientos`, payload).pipe(
      tap((movimiento) => {
        this._movimientos.update((lista) => [movimiento, ...lista]);
        this._productos.update((lista) => lista.map((p) => (p.sku === payload.sku ? aplicarMovimiento(p, movimiento) : p)));
      }),
    );
  }

  crearProducto(payload: NuevoProductoPayload): Observable<Producto> {
    if (this.auth.enModoDemo()) {
      const producto: Producto = { ...payload, estado: estadoDeStock(payload.stockActual, payload.stockMinimo) };
      this._productos.update((lista) => [producto, ...lista]);
      return of(producto);
    }
    return this.http
      .post<Producto>(`${this.apiUrl}/productos`, payload)
      .pipe(tap((producto) => this._productos.update((lista) => [producto, ...lista])));
  }
}

const SIGNO_POR_TIPO: Record<MovimientoInventario['tipo'], 1 | -1> = {
  entrada: 1,
  'ajuste-positivo': 1,
  salida: -1,
  'ajuste-negativo': -1,
  merma: -1,
};

function aplicarMovimiento(producto: Producto, movimiento: MovimientoInventario): Producto {
  const stockActual = Math.max(0, producto.stockActual + SIGNO_POR_TIPO[movimiento.tipo] * movimiento.cantidad);
  return { ...producto, stockActual, estado: estadoDeStock(stockActual, producto.stockMinimo) };
}

function estadoDeStock(stockActual: number, stockMinimo: number): Producto['estado'] {
  if (stockActual <= 0) return 'agotado';
  if (stockActual <= stockMinimo) return 'stock-bajo';
  return 'disponible';
}
