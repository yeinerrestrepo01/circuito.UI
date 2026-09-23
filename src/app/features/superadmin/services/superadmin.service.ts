import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import { Empresa, EstadoEmpresa, NuevaEmpresaPayload } from '../models/empresa.model';

/** Estado del nivel plataforma (superadmin): gestión de empresas (tenants). */
@Injectable({ providedIn: 'root' })
export class SuperadminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/superadmin/companies`;

  private readonly _empresas = signal<Empresa[]>([]);
  readonly empresas = this._empresas.asReadonly();

  cargarEmpresas(): Observable<Empresa[]> {
    return this.http.get<ApiResult<Empresa[]>>(this.apiUrl).pipe(
      map((r) => r.data ?? []),
      tap((empresas) => this._empresas.set(empresas)),
    );
  }

  crearEmpresa(payload: NuevaEmpresaPayload): Observable<Empresa> {
    return this.http.post<ApiResult<Empresa>>(this.apiUrl, payload).pipe(
      map((r) => r.data!),
      tap((empresa) => this._empresas.update((lista) => [empresa, ...lista])),
    );
  }

  cambiarEstado(empresaId: string, newStatus: EstadoEmpresa): Observable<void> {
    return this.http.patch<ApiResult<void>>(`${this.apiUrl}/${empresaId}/status`, { newStatus }).pipe(
      map(() => undefined),
      tap(() => this._empresas.update((lista) => lista.map((e) => (e.id === empresaId ? { ...e, status: newStatus } : e)))),
    );
  }

  actualizarLimiteSedes(empresaId: string, newLimit: number): Observable<void> {
    return this.http.patch<ApiResult<void>>(`${this.apiUrl}/${empresaId}/max-locations`, { newLimit }).pipe(
      map(() => undefined),
      tap(() => this._empresas.update((lista) => lista.map((e) => (e.id === empresaId ? { ...e, maxLocations: newLimit } : e)))),
    );
  }
}
