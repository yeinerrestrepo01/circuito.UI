import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import { Categoria, NuevaCategoriaPayload } from '../models/categoria.model';

/** Catálogo de categorías de producto de la empresa del usuario autenticado (tenant). */
@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = `${inject(API_URL)}/categories`;

  private readonly _categorias = signal<Categoria[]>([]);
  readonly categorias = this._categorias.asReadonly();

  cargarCategorias(): Observable<Categoria[]> {
    const origen$ = this.auth.enModoDemo()
      ? of(this._categorias())
      : this.http.get<ApiResult<Categoria[]>>(this.apiUrl).pipe(map((r) => r.data ?? []));
    return origen$.pipe(tap((categorias) => this._categorias.set(categorias)));
  }

  crearCategoria(payload: NuevaCategoriaPayload): Observable<Categoria> {
    if (this.auth.enModoDemo()) {
      const categoria: Categoria = { id: crypto.randomUUID(), name: payload.name };
      this._categorias.update((lista) => [...lista, categoria]);
      return of(categoria);
    }
    return this.http.post<ApiResult<Categoria>>(this.apiUrl, payload).pipe(
      map((r) => r.data!),
      tap((categoria) => this._categorias.update((lista) => [...lista, categoria])),
    );
  }

  actualizarCategoria(id: string, payload: NuevaCategoriaPayload): Observable<Categoria> {
    if (this.auth.enModoDemo()) {
      const categoria: Categoria = { id, name: payload.name };
      this._categorias.update((lista) => lista.map((c) => (c.id === id ? categoria : c)));
      return of(categoria);
    }
    return this.http.put<ApiResult<Categoria>>(`${this.apiUrl}/${id}`, payload).pipe(
      map((r) => r.data!),
      tap((categoria) => this._categorias.update((lista) => lista.map((c) => (c.id === id ? categoria : c)))),
    );
  }
}
