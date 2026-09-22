import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { InvitarUsuarioPayload, UsuarioAlmacen } from '../models/usuario-almacen.model';

/** Usuarios del almacén (tenant). */
@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/configuracion`;

  private readonly _usuarios = signal<UsuarioAlmacen[]>([]);
  readonly usuarios = this._usuarios.asReadonly();

  cargarUsuarios(): Observable<UsuarioAlmacen[]> {
    return this.http.get<UsuarioAlmacen[]>(`${this.apiUrl}/usuarios`).pipe(tap((usuarios) => this._usuarios.set(usuarios)));
  }

  invitarUsuario(payload: InvitarUsuarioPayload): Observable<UsuarioAlmacen> {
    return this.http
      .post<UsuarioAlmacen>(`${this.apiUrl}/usuarios`, payload)
      .pipe(tap((usuario) => this._usuarios.update((lista) => [...lista, usuario])));
  }
}
