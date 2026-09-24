import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../config/api-url.token';
import { ApiResult } from '../models/api-result.model';

export interface EmpresaInfo {
  name: string;
  taxId: string;
  city: string;
}

/** Datos de la propia empresa del tenant (no del catálogo de Superadmin) — hoy solo se usa para
 * mostrar el NIT en el recibo de venta; el nombre para el resto de la app ya viene en el JWT
 * (`AuthService.usuario().empresaNombre`), pero el NIT no está ahí, así que se trae con esto. */
@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/company`;

  private readonly _empresa = signal<EmpresaInfo | null>(null);
  readonly empresa = this._empresa.asReadonly();

  cargarEmpresa(): Observable<EmpresaInfo> {
    return this.http.get<ApiResult<EmpresaInfo>>(this.apiUrl).pipe(
      map((r) => r.data!),
      tap((empresa) => this._empresa.set(empresa)),
    );
  }
}
