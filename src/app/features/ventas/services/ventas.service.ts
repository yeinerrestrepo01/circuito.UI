import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import { CuotaPendiente, ReciboAbono, Venta, VentaPayload } from '../models/venta.model';

/** Historial de ventas de la empresa — el carrito de la venta en curso vive en el propio componente
 * de Facturación (es estado transitorio de una pantalla, no algo que otras pantallas necesiten). */
@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/sales`;
  private readonly installmentsUrl = `${inject(API_URL)}/installments`;

  private readonly _ventas = signal<Venta[]>([]);
  readonly ventas = this._ventas.asReadonly();

  private readonly _cartera = signal<CuotaPendiente[]>([]);
  readonly cartera = this._cartera.asReadonly();

  obtenerVenta(id: string): Observable<Venta> {
    return this.http.get<ApiResult<Venta>>(`${this.apiUrl}/${id}`).pipe(map((r) => r.data!));
  }

  cargarVentas(): Observable<Venta[]> {
    return this.http.get<ApiResult<Venta[]>>(this.apiUrl).pipe(
      map((r) => r.data ?? []),
      tap((ventas) => this._ventas.set(ventas)),
    );
  }

  registrarVenta(payload: VentaPayload): Observable<Venta> {
    return this.http.post<ApiResult<Venta>>(this.apiUrl, payload).pipe(
      map((r) => r.data!),
      tap((venta) => this._ventas.update((lista) => [venta, ...lista])),
    );
  }

  anularVenta(id: string): Observable<void> {
    return this.http.patch<ApiResult<void>>(`${this.apiUrl}/${id}/void`, {}).pipe(
      map(() => undefined),
      tap(() => this._ventas.update((lista) => lista.map((v) => (v.id === id ? { ...v, status: 'Voided' as const } : v)))),
    );
  }

  /** La Cartera: todas las cuotas pendientes de cobro de todo el tenant, ordenadas por vencimiento. */
  cargarCartera(): Observable<CuotaPendiente[]> {
    return this.http.get<ApiResult<CuotaPendiente[]>>(`${this.installmentsUrl}/pending`).pipe(
      map((r) => r.data ?? []),
      tap((cartera) => this._cartera.set(cartera)),
    );
  }

  /** Registra un abono — total o parcial — sobre una cuota. Si `monto` cubre el saldo completo, la
   * cuota se cierra; si no, solo se reduce lo que falta y sigue apareciendo en Cartera. Devuelve el
   * recibo del abono, para imprimirlo de inmediato. */
  pagarCuota(installmentId: string, monto: number): Observable<ReciboAbono> {
    return this.http.patch<ApiResult<ReciboAbono>>(`${this.installmentsUrl}/${installmentId}/pay`, { amount: monto }).pipe(
      map((r) => r.data!),
      tap(() =>
        this._cartera.update((lista) =>
          lista
            .map((c) => (c.id === installmentId ? { ...c, paidAmount: c.paidAmount + monto, balance: c.balance - monto } : c))
            .filter((c) => c.balance > 0),
        ),
      ),
    );
  }

  /** Reabre el recibo de un abono ya registrado — lo usa la página de impresión aislada. */
  obtenerReciboAbono(paymentId: string): Observable<ReciboAbono> {
    return this.http.get<ApiResult<ReciboAbono>>(`${this.installmentsUrl}/payments/${paymentId}`).pipe(map((r) => r.data!));
  }
}
