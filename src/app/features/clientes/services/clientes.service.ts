import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import { Cliente, NuevoClientePayload } from '../models/cliente.model';

/** Catálogo de clientes de la empresa — igual patrón que ProveedoresService. Una venta puede no
 * tener cliente en absoluto ("Consumidor final"); este servicio solo gestiona el catálogo. */
@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/customers`;

  private readonly _clientes = signal<Cliente[]>([]);
  readonly clientes = this._clientes.asReadonly();

  cargarClientes(): Observable<Cliente[]> {
    return this.http.get<ApiResult<Cliente[]>>(this.apiUrl).pipe(
      map((r) => r.data ?? []),
      tap((clientes) => this._clientes.set(clientes)),
    );
  }

  crearCliente(payload: NuevoClientePayload): Observable<Cliente> {
    return this.http.post<ApiResult<Cliente>>(this.apiUrl, payload).pipe(
      map((r) => r.data!),
      tap((cliente) => this._clientes.update((lista) => [...lista, cliente])),
    );
  }
}
