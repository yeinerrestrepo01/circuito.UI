import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import { RecordatorioPendiente, RecordatorioProducto } from '../models/recordatorio.model';

/** Recordatorios de vida útil — generados solos al vender un producto con `hasLifecycleReminder` a un
 * cliente identificado (ver CreateSaleCommandHandler del backend). El contacto es manual por
 * WhatsApp (`wa.me`, gratis) — no hay integración con ninguna API de mensajería. */
@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/reminders`;

  private readonly _recordatorios = signal<RecordatorioPendiente[]>([]);
  readonly recordatorios = this._recordatorios.asReadonly();

  cargarRecordatorios(): Observable<RecordatorioPendiente[]> {
    return this.http.get<ApiResult<RecordatorioPendiente[]>>(`${this.apiUrl}/pending`).pipe(
      map((r) => r.data ?? []),
      tap((recordatorios) => this._recordatorios.set(recordatorios)),
    );
  }

  cargarRecordatoriosDeProducto(productId: string): Observable<RecordatorioProducto[]> {
    return this.http.get<ApiResult<RecordatorioProducto[]>>(`${this.apiUrl}/products/${productId}`).pipe(map((r) => r.data ?? []));
  }

  marcarContactado(id: string): Observable<void> {
    return this.http.patch<ApiResult<void>>(`${this.apiUrl}/${id}/contacted`, {}).pipe(
      map(() => undefined),
      tap(() => this._recordatorios.update((lista) => lista.filter((r) => r.id !== id))),
    );
  }
}
