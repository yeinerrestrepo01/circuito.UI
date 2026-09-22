import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { OrdenCompraPayload, SugerenciaCompra } from '../models/sugerencia.model';

/** Sugerencia de compras basada en rotación y vencimientos (ver Compras.html). */
@Injectable({ providedIn: 'root' })
export class ComprasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/compras`;

  private readonly _sugerencias = signal<SugerenciaCompra[]>([]);
  readonly sugerencias = this._sugerencias.asReadonly();

  cargarSugerencias(): Observable<SugerenciaCompra[]> {
    return this.http
      .get<SugerenciaCompra[]>(`${this.apiUrl}/sugerencias`)
      .pipe(tap((sugerencias) => this._sugerencias.set(sugerencias)));
  }

  generarOrdenCompra(payload: OrdenCompraPayload): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/ordenes`, payload);
  }
}
