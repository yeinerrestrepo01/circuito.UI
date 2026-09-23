import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { API_URL } from '../config/api-url.token';
import { ApiResult } from '../models/api-result.model';

const TOKEN_KEY = 'circuito.token';

/** Mismo catálogo que Circuito.API/src/Circuito.Domain/Enums/UserType.cs — un solo rol por usuario, incluido Superadmin (ya no es un claim booleano aparte). */
export type TipoUsuario = 'Superadmin' | 'CompanyAdmin' | 'Manager' | 'LocationAdmin' | 'Salesperson' | 'WarehouseStaff';

interface JwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  companyId?: string;
  companyName?: string;
  userType?: TipoUsuario;
  locationId?: string;
  exp?: number;
}

export interface UsuarioSesion {
  id: string;
  email: string;
  nombre: string;
  iniciales: string;
  esSuperadmin: boolean;
  /** null si es superadmin (no pertenece a ninguna empresa). */
  empresaId: string | null;
  empresaNombre: string;
  tipoUsuario: TipoUsuario | null;
  /** null si el rol es de toda la empresa (CompanyAdmin | Manager). */
  sedeId: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = inject(API_URL);

  private readonly _token = signal<string | null>(leerToken());

  readonly token = this._token.asReadonly();
  readonly usuario = computed<UsuarioSesion | null>(() => {
    const payload = decodificar(this._token());
    if (!payload) return null;
    const email = payload.email ?? payload.sub ?? '';
    const nombre = payload.name ?? email;
    return {
      id: payload.sub ?? email,
      email,
      nombre,
      iniciales: iniciales(nombre),
      esSuperadmin: payload.userType === 'Superadmin',
      empresaId: payload.companyId ?? null,
      empresaNombre: payload.companyName ?? '',
      tipoUsuario: payload.userType ?? null,
      sedeId: payload.locationId ?? null,
    };
  });

  /** No es un computed a propósito: la expiración depende del reloj, no de una señal. */
  tieneSesionValida(): boolean {
    const payload = decodificar(this._token());
    return !!payload && (payload.exp === undefined || payload.exp * 1000 > Date.now());
  }

  esSuperadmin(): boolean {
    return this.tieneSesionValida() && this.usuario()?.esSuperadmin === true;
  }

  login(credenciales: LoginRequest) {
    return this.http.post<ApiResult<{ token: string }>>(`${this.apiUrl}/auth/login`, credenciales).pipe(
      map((respuesta) => respuesta.data!.token),
      tap((token) => {
        guardarToken(token);
        this._token.set(token);
      }),
    );
  }

  logout(): void {
    guardarToken(null);
    this._token.set(null);
    void this.router.navigate(['/login']);
  }

  /**
   * Se llama una sola vez al arrancar la app (ver `provideAppInitializer` en app.config.ts): si hay
   * un token guardado, confirma contra `/auth/me` que sigue correspondiendo a un usuario real antes
   * de que el usuario intente hacer algo. Un token puede quedar "vigente" por firma/expiración pero
   * ya inservible si, por ejemplo, la base de datos se reinició — sin esto, el primer síntoma sería
   * un error críptico al guardar algo, no un aviso claro de que hay que volver a iniciar sesión.
   * El interceptor de errores ya desloguea solo ante un 401, así que aquí solo hace falta disparar
   * la llamada y tragarse el error para no romper el arranque de la app.
   */
  verificarSesionVigente(): Observable<void> {
    if (!this._token()) return of(undefined);
    return this.http.get(`${this.apiUrl}/auth/me`).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }
}

function leerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function guardarToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* almacenamiento no disponible: la sesión vive solo en memoria */
  }
}

function decodificar(token: string | null): JwtPayload | null {
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload;
  } catch {
    return null;
  }
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : nombre.trim().slice(0, 2);
  return letras.toUpperCase();
}
