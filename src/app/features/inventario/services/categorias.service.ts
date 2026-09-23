import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import { Categoria, NuevaCategoriaPayload } from '../models/categoria.model';

/** Catálogo de categorías de producto de la empresa del usuario autenticado (tenant). */
@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/categories`;

  private readonly _categorias = signal<Categoria[]>([]);
  readonly categorias = this._categorias.asReadonly();

  cargarCategorias(): Observable<Categoria[]> {
    return this.http.get<ApiResult<Categoria[]>>(this.apiUrl).pipe(
      map((r) => r.data ?? []),
      tap((categorias) => this._categorias.set(categorias)),
    );
  }

  crearCategoria(payload: NuevaCategoriaPayload): Observable<Categoria> {
    return this.http.post<ApiResult<Categoria>>(this.apiUrl, payload).pipe(
      map((r) => r.data!),
      tap((categoria) => this._categorias.update((lista) => [...lista, categoria])),
    );
  }

  actualizarCategoria(id: string, payload: NuevaCategoriaPayload): Observable<Categoria> {
    return this.http.put<ApiResult<Categoria>>(`${this.apiUrl}/${id}`, payload).pipe(
      map((r) => r.data!),
      tap((categoria) => this._categorias.update((lista) => lista.map((c) => (c.id === id ? categoria : c)))),
    );
  }
}
