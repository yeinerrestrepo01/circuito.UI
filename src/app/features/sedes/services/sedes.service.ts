import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import { NuevaSedePayload, Sede } from '../models/sede.model';

/**
 * Sedes (locations) de la empresa del usuario autenticado. Hoy solo lo consume el selector de
 * sede al invitar un usuario en Configuración — `POST /locations` ya valida el límite de sedes
 * de la empresa en el backend.
 */
@Injectable({ providedIn: 'root' })
export class SedesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/locations`;

  private readonly _sedes = signal<Sede[]>([]);
  readonly sedes = this._sedes.asReadonly();

  cargarSedes(): Observable<Sede[]> {
    return this.http.get<ApiResult<Sede[]>>(this.apiUrl).pipe(
      map((r) => r.data ?? []),
      tap((sedes) => this._sedes.set(sedes)),
    );
  }

  crearSede(payload: NuevaSedePayload): Observable<Sede> {
    return this.http.post<ApiResult<Sede>>(this.apiUrl, payload).pipe(
      map((r) => r.data!),
      tap((sede) => this._sedes.update((lista) => [...lista, sede])),
    );
  }
}
