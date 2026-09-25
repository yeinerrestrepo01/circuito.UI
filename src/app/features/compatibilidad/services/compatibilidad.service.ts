import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { ApiResult } from '../../../core/models/api-result.model';
import {
  CodigoOem,
  CompatibilidadProducto,
  NuevoVehiculoPayload,
  ProductoCompatible,
  ResultadoOem,
  TipoEquivalencia,
  Vehiculo,
} from '../models/equivalencia.model';

/** Catálogo de compatibilidad: qué productos sirven para un vehículo (o un código OEM), y gestión de
 * las compatibilidades/códigos OEM de un producto puntual (usado también desde Producto-detalle). */
@Injectable({ providedIn: 'root' })
export class CompatibilidadService {
  private readonly http = inject(HttpClient);
  private readonly vehiclesUrl = `${inject(API_URL)}/vehicles`;
  private readonly compatUrl = `${inject(API_URL)}/compatibility`;

  private readonly _vehiculos = signal<Vehiculo[]>([]);
  readonly vehiculos = this._vehiculos.asReadonly();

  private readonly _resultadosVehiculo = signal<ProductoCompatible[]>([]);
  readonly resultadosVehiculo = this._resultadosVehiculo.asReadonly();

  private readonly _resultadosOem = signal<ResultadoOem[]>([]);
  readonly resultadosOem = this._resultadosOem.asReadonly();

  cargarVehiculos(): Observable<Vehiculo[]> {
    return this.http.get<ApiResult<Vehiculo[]>>(this.vehiclesUrl).pipe(
      map((r) => r.data ?? []),
      tap((vehiculos) => this._vehiculos.set(vehiculos)),
    );
  }

  crearVehiculo(payload: NuevoVehiculoPayload): Observable<Vehiculo> {
    return this.http.post<ApiResult<Vehiculo>>(this.vehiclesUrl, payload).pipe(
      map((r) => r.data!),
      tap((vehiculo) => this._vehiculos.update((lista) => [...lista, vehiculo])),
    );
  }

  buscarPorVehiculo(vehicleId: string): Observable<ProductoCompatible[]> {
    return this.http.get<ApiResult<ProductoCompatible[]>>(`${this.compatUrl}/search`, { params: { vehicleId } }).pipe(
      map((r) => r.data ?? []),
      tap((resultados) => this._resultadosVehiculo.set(resultados)),
    );
  }

  buscarPorOem(code: string): Observable<ResultadoOem[]> {
    return this.http.get<ApiResult<ResultadoOem[]>>(`${this.compatUrl}/search/oem/${encodeURIComponent(code)}`).pipe(
      map((r) => r.data ?? []),
      tap((resultados) => this._resultadosOem.set(resultados)),
    );
  }

  // --- Gestión por producto (Producto-detalle) ---

  listarCompatibilidadesProducto(productId: string): Observable<CompatibilidadProducto[]> {
    return this.http
      .get<ApiResult<CompatibilidadProducto[]>>(`${this.compatUrl}/products/${productId}`)
      .pipe(map((r) => r.data ?? []));
  }

  agregarCompatibilidad(productId: string, vehicleId: string, type: TipoEquivalencia): Observable<CompatibilidadProducto> {
    return this.http
      .post<ApiResult<CompatibilidadProducto>>(this.compatUrl, { productId, vehicleId, type })
      .pipe(map((r) => r.data!));
  }

  quitarCompatibilidad(id: string): Observable<void> {
    return this.http.delete<ApiResult<void>>(`${this.compatUrl}/${id}`).pipe(map(() => undefined));
  }

  listarOemProducto(productId: string): Observable<CodigoOem[]> {
    return this.http
      .get<ApiResult<CodigoOem[]>>(`${this.compatUrl}/products/${productId}/oem-codes`)
      .pipe(map((r) => r.data ?? []));
  }

  agregarOem(productId: string, code: string, manufacturer?: string): Observable<CodigoOem> {
    return this.http
      .post<ApiResult<CodigoOem>>(`${this.compatUrl}/oem-codes`, { productId, code, manufacturer })
      .pipe(map((r) => r.data!));
  }

  quitarOem(id: string): Observable<void> {
    return this.http.delete<ApiResult<void>>(`${this.compatUrl}/oem-codes/${id}`).pipe(map(() => undefined));
  }
}
