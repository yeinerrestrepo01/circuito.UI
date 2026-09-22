import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { DisponibilidadAlmacen, SolicitarTransferenciaPayload, SolicitudTransferencia } from '../models/red.model';

/** Disponibilidad y transferencias entre almacenes de la misma red (Fase 2/3). */
@Injectable({ providedIn: 'root' })
export class RedService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/red`;

  private readonly _disponibilidad = signal<DisponibilidadAlmacen[]>([]);
  private readonly _solicitudes = signal<SolicitudTransferencia[]>([]);
  readonly disponibilidad = this._disponibilidad.asReadonly();
  readonly solicitudes = this._solicitudes.asReadonly();

  cargarDisponibilidad(sku: string): Observable<DisponibilidadAlmacen[]> {
    return this.http
      .get<DisponibilidadAlmacen[]>(`${this.apiUrl}/disponibilidad/${sku}`)
      .pipe(tap((disponibilidad) => this._disponibilidad.set(disponibilidad)));
  }

  cargarSolicitudes(): Observable<SolicitudTransferencia[]> {
    return this.http
      .get<SolicitudTransferencia[]>(`${this.apiUrl}/solicitudes`)
      .pipe(tap((solicitudes) => this._solicitudes.set(solicitudes)));
  }

  solicitarTransferencia(payload: SolicitarTransferenciaPayload): Observable<SolicitudTransferencia> {
    return this.http
      .post<SolicitudTransferencia>(`${this.apiUrl}/solicitudes`, payload)
      .pipe(tap((solicitud) => this._solicitudes.update((lista) => [solicitud, ...lista])));
  }
}
