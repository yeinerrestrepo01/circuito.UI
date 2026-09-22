import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { Almacen, NuevoAlmacenPayload } from '../models/almacen.model';

/** Estado del nivel plataforma (superadmin): gestión de almacenes (tenants). */
@Injectable({ providedIn: 'root' })
export class SuperadminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/superadmin`;

  private readonly _almacenes = signal<Almacen[]>([]);
  readonly almacenes = this._almacenes.asReadonly();

  cargarAlmacenes(): Observable<Almacen[]> {
    return this.http
      .get<Almacen[]>(`${this.apiUrl}/almacenes`)
      .pipe(tap((almacenes) => this._almacenes.set(almacenes)));
  }

  crearAlmacen(payload: NuevoAlmacenPayload): Observable<Almacen> {
    return this.http
      .post<Almacen>(`${this.apiUrl}/almacenes`, payload)
      .pipe(tap((almacen) => this._almacenes.update((lista) => [almacen, ...lista])));
  }
}
