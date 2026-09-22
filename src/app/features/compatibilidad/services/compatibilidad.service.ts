import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { EquivalenciaCompatible, FiltroVehiculo } from '../models/equivalencia.model';

/** Catálogo de compatibilidad: referencias equivalentes por vehículo o código OEM. */
@Injectable({ providedIn: 'root' })
export class CompatibilidadService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/compatibilidad`;

  private readonly _resultados = signal<EquivalenciaCompatible[]>([]);
  readonly resultados = this._resultados.asReadonly();

  buscar(filtro: FiltroVehiculo): Observable<EquivalenciaCompatible[]> {
    const params = new HttpParams({ fromObject: { ...filtro } });
    return this.http
      .get<EquivalenciaCompatible[]>(`${this.apiUrl}/equivalencias`, { params })
      .pipe(tap((resultados) => this._resultados.set(resultados)));
  }
}
