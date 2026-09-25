import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import { Venta } from '../../ventas/models/venta.model';
import { Cotizacion, CotizacionPayload, ConversionPayload } from '../models/cotizacion.model';

/** Cotizaciones: precios congelados por 15 días. Convertir en venta despacha al mismo backend real
 * de Ventas (`POST /quotations/{id}/convert` arma y ejecuta un CreateSaleCommand del lado del
 * servidor) — acá solo se pide el resultado, no se duplica nada de la lógica de venta. */
@Injectable({ providedIn: 'root' })
export class CotizacionesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/quotations`;

  private readonly _cotizaciones = signal<Cotizacion[]>([]);
  readonly cotizaciones = this._cotizaciones.asReadonly();

  obtenerCotizacion(id: string): Observable<Cotizacion> {
    return this.http.get<ApiResult<Cotizacion>>(`${this.apiUrl}/${id}`).pipe(map((r) => r.data!));
  }

  cargarCotizaciones(): Observable<Cotizacion[]> {
    return this.http.get<ApiResult<Cotizacion[]>>(this.apiUrl).pipe(
      map((r) => r.data ?? []),
      tap((cotizaciones) => this._cotizaciones.set(cotizaciones)),
    );
  }

  registrarCotizacion(payload: CotizacionPayload): Observable<Cotizacion> {
    return this.http.post<ApiResult<Cotizacion>>(this.apiUrl, payload).pipe(
      map((r) => r.data!),
      tap((cotizacion) => this._cotizaciones.update((lista) => [cotizacion, ...lista])),
    );
  }

  /** Convierte la cotización en una venta real — la respuesta ES la venta ya creada (`Venta`, no
   * `Cotizacion`), lista para navegar a `/ventas/:id`. */
  convertirEnVenta(id: string, payload: ConversionPayload): Observable<Venta> {
    return this.http.post<ApiResult<Venta>>(`${this.apiUrl}/${id}/convert`, payload).pipe(
      map((r) => r.data!),
      tap(() => this._cotizaciones.update((lista) => lista.map((c) => (c.id === id ? { ...c, status: 'Converted' as const } : c)))),
    );
  }

  cancelarCotizacion(id: string): Observable<void> {
    return this.http.patch<ApiResult<void>>(`${this.apiUrl}/${id}/cancel`, {}).pipe(
      map(() => undefined),
      tap(() => this._cotizaciones.update((lista) => lista.map((c) => (c.id === id ? { ...c, status: 'Cancelled' as const } : c)))),
    );
  }
}
