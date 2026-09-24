import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import { OrdenCompra, OrdenCompraPayload, SugerenciaCompra } from '../models/sugerencia.model';

/** Sugerencia de compras: productos con stock igual o por debajo de su mínimo, agrupados por
 * proveedor principal (ver PurchaseSuggestionCalculator en el backend). */
@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/purchasing`;

  private readonly _sugerencias = signal<SugerenciaCompra[]>([]);
  readonly sugerencias = this._sugerencias.asReadonly();
  private readonly _ordenes = signal<OrdenCompra[]>([]);
  readonly ordenes = this._ordenes.asReadonly();

  cargarSugerencias(): Observable<SugerenciaCompra[]> {
    return this.http.get<ApiResult<SugerenciaCompra[]>>(`${this.apiUrl}/suggestions`).pipe(
      map((r) => r.data ?? []),
      tap((sugerencias) => this._sugerencias.set(sugerencias)),
    );
  }

  /** Todas las órdenes generadas hasta ahora, más recientes primero. */
  cargarOrdenes(): Observable<OrdenCompra[]> {
    return this.http.get<ApiResult<OrdenCompra[]>>(`${this.apiUrl}/orders`).pipe(
      map((r) => r.data ?? []),
      tap((ordenes) => this._ordenes.set(ordenes)),
    );
  }

  /** Una orden por proveedor distinto entre los Skus marcados — ver OrdenCompra. */
  generarOrdenCompra(payload: OrdenCompraPayload): Observable<OrdenCompra[]> {
    return this.http.post<ApiResult<OrdenCompra[]>>(`${this.apiUrl}/orders`, payload).pipe(map((r) => r.data ?? []));
  }

  /** Registra la mercancía como entrada real de inventario (un Inflow por línea) y marca la orden
   * como recibida — ver ReceivePurchaseOrderCommand en el backend. */
  recibirOrden(id: string): Observable<void> {
    return this.http.patch<ApiResult<void>>(`${this.apiUrl}/orders/${id}/receive`, {}).pipe(
      map(() => undefined),
      tap(() => this._marcarEstado(id, 'Received')),
    );
  }

  cancelarOrden(id: string): Observable<void> {
    return this.http.patch<ApiResult<void>>(`${this.apiUrl}/orders/${id}/cancel`, {}).pipe(
      map(() => undefined),
      tap(() => this._marcarEstado(id, 'Cancelled')),
    );
  }

  private _marcarEstado(id: string, status: OrdenCompra['status']): void {
    this._ordenes.update((lista) => lista.map((o) => (o.id === id ? { ...o, status } : o)));
  }
}
