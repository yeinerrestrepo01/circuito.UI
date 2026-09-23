import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import { InvitarUsuarioPayload, UsuarioEmpresa } from '../models/usuario-empresa.model';

/** Usuarios de la empresa del usuario autenticado (tenant). */
@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/users`;

  private readonly _usuarios = signal<UsuarioEmpresa[]>([]);
  readonly usuarios = this._usuarios.asReadonly();

  cargarUsuarios(): Observable<UsuarioEmpresa[]> {
    return this.http.get<ApiResult<UsuarioEmpresa[]>>(this.apiUrl).pipe(
      map((r) => r.data ?? []),
      tap((usuarios) => this._usuarios.set(usuarios)),
    );
  }

  invitarUsuario(payload: InvitarUsuarioPayload): Observable<UsuarioEmpresa> {
    return this.http.post<ApiResult<UsuarioEmpresa>>(this.apiUrl, payload).pipe(
      map((r) => r.data!),
      tap((usuario) => this._usuarios.update((lista) => [...lista, usuario])),
    );
  }
}
