import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { forkJoin, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { ClasificacionAbc, ProductoObsolescencia } from '../models/inteligencia.model';

/** Clasificación ABC y riesgo de obsolescencia (Fase 2/3, ver Inteligencia.html). */
@Injectable({ providedIn: 'root' })
export class InteligenciaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/inteligencia`;

  private readonly _clasificacionAbc = signal<ClasificacionAbc[]>([]);
  private readonly _obsolescencia = signal<ProductoObsolescencia[]>([]);
  readonly clasificacionAbc = this._clasificacionAbc.asReadonly();
  readonly obsolescencia = this._obsolescencia.asReadonly();

  cargar() {
    return forkJoin({
      clasificacion: this.http.get<ClasificacionAbc[]>(`${this.apiUrl}/clasificacion-abc`),
      obsolescencia: this.http.get<ProductoObsolescencia[]>(`${this.apiUrl}/obsolescencia`),
    }).pipe(
      tap(({ clasificacion, obsolescencia }) => {
        this._clasificacionAbc.set(clasificacion);
        this._obsolescencia.set(obsolescencia);
      }),
    );
  }
}
