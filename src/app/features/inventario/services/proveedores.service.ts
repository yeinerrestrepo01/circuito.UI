import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import { NuevoProveedorPayload, Proveedor } from '../models/proveedor.model';

/** Catálogo de proveedores de la empresa del usuario autenticado (tenant). Un producto puede
 * tener varios proveedores a la vez (ver `ProductoProveedor`); este servicio solo gestiona el
 * catálogo, no la relación producto-proveedor (eso vive en `InventarioService`). */
@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = `${inject(API_URL)}/suppliers`;

  private readonly _proveedores = signal<Proveedor[]>([]);
  readonly proveedores = this._proveedores.asReadonly();

  cargarProveedores(): Observable<Proveedor[]> {
    const origen$ = this.auth.enModoDemo()
      ? of(this._proveedores())
      : this.http.get<ApiResult<Proveedor[]>>(this.apiUrl).pipe(map((r) => r.data ?? []));
    return origen$.pipe(tap((proveedores) => this._proveedores.set(proveedores)));
  }

  crearProveedor(payload: NuevoProveedorPayload): Observable<Proveedor> {
    if (this.auth.enModoDemo()) {
      const proveedor: Proveedor = { id: crypto.randomUUID(), ...payload };
      this._proveedores.update((lista) => [...lista, proveedor]);
      return of(proveedor);
    }
    return this.http.post<ApiResult<Proveedor>>(this.apiUrl, payload).pipe(
      map((r) => r.data!),
      tap((proveedor) => this._proveedores.update((lista) => [...lista, proveedor])),
    );
  }
}
