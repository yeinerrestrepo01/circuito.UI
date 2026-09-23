import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, map, of, tap, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import { MovimientoInventario, RegistrarMovimientoPayload, RegistrarMovimientosLotePayload } from '../models/movimiento.model';
import { NuevoProductoPayload, Producto } from '../models/producto.model';
import { CategoriasService } from './categorias.service';
import { ProveedoresService } from './proveedores.service';

/**
 * Estado del módulo de Inventario. Expone signals de solo lectura; toda mutación pasa por sus
 * métodos, que llaman a la API (`/products`, `/inventory-movements`) y luego reconcilian el
 * estado local (sin store global).
 *
 * En modo demo (sin backend, ver `AuthService.entrarModoDemo`) el catálogo empieza vacío — sin
 * datos de ejemplo precargados — y se llena con lo que el usuario cree desde la UI, igual que
 * `CategoriasService`/`ProveedoresService`.
 */
@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = inject(API_URL);
  private readonly categoriasService = inject(CategoriasService);
  private readonly proveedoresService = inject(ProveedoresService);

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

  readonly productosConAlerta = computed(() => this._productos().filter((p) => p.status !== 'Available'));

  /** Trae el catálogo completo y reemplaza el estado local. Se llama al entrar al Dashboard. */
  cargarProductos(): Observable<Producto[]> {
    this._cargandoProductos.set(true);
    const origen$ = this.auth.enModoDemo()
      ? of(this._productos())
      : this.http.get<ApiResult<Producto[]>>(`${this.apiUrl}/products`).pipe(map((r) => r.data ?? []));
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
      origen$ = of(sku ? todos.filter((m) => m.productSku === sku) : todos);
    } else {
      const params = sku ? new HttpParams().set('sku', sku) : undefined;
      origen$ = this.http
        .get<ApiResult<MovimientoInventario[]>>(`${this.apiUrl}/inventory-movements`, { params })
        .pipe(map((r) => r.data ?? []));
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
        : throwError(() => new HttpErrorResponse({ status: 404, statusText: 'No encontrado', url: `${this.apiUrl}/products/${sku}` }));
    }
    return this.http.get<ApiResult<Producto>>(`${this.apiUrl}/products/${sku}`).pipe(map((r) => r.data!));
  }

  /** Un solo producto — la usa la pantalla de Escaneo, que siempre resuelve exactamente un producto antes de registrar. */
  registrarMovimiento(payload: RegistrarMovimientoPayload): Observable<MovimientoInventario> {
    if (this.auth.enModoDemo()) {
      const producto = this._productos().find((p) => p.sku === payload.sku);
      const proveedor = payload.supplierId ? this.proveedoresService.proveedores().find((p) => p.id === payload.supplierId) : undefined;
      const movimiento: MovimientoInventario = {
        id: crypto.randomUUID(),
        productId: producto?.id ?? payload.sku,
        productSku: payload.sku,
        productName: producto?.name ?? payload.sku,
        type: payload.type,
        quantity: payload.quantity,
        reason: payload.reason,
        notes: payload.notes,
        supplierId: payload.supplierId,
        supplierName: proveedor?.name,
        performedByName: this.auth.usuario()?.nombre ?? 'Usuario demo',
        createdAt: new Date().toISOString(),
      };
      this._movimientosDemo = [movimiento, ...this._movimientosDemo];
      this._movimientos.update((lista) => [movimiento, ...lista]);
      if (producto) this._productos.update((lista) => lista.map((p) => (p.sku === payload.sku ? aplicarMovimiento(p, movimiento) : p)));
      return of(movimiento);
    }
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
    if (this.auth.enModoDemo()) {
      const proveedor = payload.supplierId ? this.proveedoresService.proveedores().find((p) => p.id === payload.supplierId) : undefined;
      const movimientos: MovimientoInventario[] = payload.items.map((item) => {
        const producto = this._productos().find((p) => p.sku === item.sku);
        return {
          id: crypto.randomUUID(),
          productId: producto?.id ?? item.sku,
          productSku: item.sku,
          productName: producto?.name ?? item.sku,
          type: payload.type,
          quantity: item.quantity,
          reason: payload.reason,
          notes: payload.notes,
          supplierId: payload.supplierId,
          supplierName: proveedor?.name,
          performedByName: this.auth.usuario()?.nombre ?? 'Usuario demo',
          createdAt: new Date().toISOString(),
        };
      });
      this._movimientosDemo = [...movimientos, ...this._movimientosDemo];
      this._movimientos.update((lista) => [...movimientos, ...lista]);
      this._productos.update((lista) =>
        lista.map((p) => {
          const movimiento = movimientos.find((m) => m.productSku === p.sku);
          return movimiento ? aplicarMovimiento(p, movimiento) : p;
        }),
      );
      return of(movimientos);
    }
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
    if (this.auth.enModoDemo()) {
      const categoria = this.categoriasService.categorias().find((c) => c.id === payload.categoryId);
      const proveedoresPorId = new Map(this.proveedoresService.proveedores().map((p) => [p.id, p]));
      const producto: Producto = {
        id: crypto.randomUUID(),
        sku: payload.sku,
        name: payload.name,
        categoryId: payload.categoryId,
        categoryName: categoria?.name ?? '',
        brand: payload.brand,
        storageLocation: payload.storageLocation,
        stockQuantity: payload.initialStock,
        minStock: payload.minStock,
        status: estadoDeStock(payload.initialStock, payload.minStock),
        salePrice: payload.salePrice,
        unitOfMeasure: payload.unitOfMeasure,
        unitsPerBox: payload.unitsPerBox,
        suppliers: payload.suppliers.map((s) => ({
          supplierId: s.supplierId,
          supplierName: proveedoresPorId.get(s.supplierId)?.name ?? '',
          purchaseCost: s.purchaseCost,
          isPrimary: s.isPrimary,
        })),
        compatibleVehicleCount: 0,
        hasLifecycleReminder: payload.hasLifecycleReminder ?? false,
        lifecycleCategory: payload.lifecycleCategory,
        lifecycleReminderWindowDays: payload.lifecycleReminderWindowDays,
        createdAt: new Date().toISOString(),
      };
      this._productos.update((lista) => [producto, ...lista]);
      return of(producto);
    }
    return this.http.post<ApiResult<Producto>>(`${this.apiUrl}/products`, payload).pipe(
      map((r) => r.data!),
      tap((producto) => this._productos.update((lista) => [producto, ...lista])),
    );
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
