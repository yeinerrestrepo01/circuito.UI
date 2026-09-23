import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs';
import { API_URL } from '../config/api-url.token';
import { ApiResult } from '../models/api-result.model';

const TOKEN_KEY = 'circuito.token';
const MODO_DEMO_KEY = 'circuito.modoDemo';

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

  /**
   * TEMPORAL: crea una sesión local sin backend, para poder navegar la app sin depender de que
   * `Circuito.API` esté corriendo. El token no está firmado (no sirve contra la API real) y
   * expira en 8h. Quitar este método (y el botón "Modo demo" del login) cuando ya no haga falta.
   */
  entrarModoDemo(): void {
    const token = crearTokenDemo();
    guardarToken(token);
    this._token.set(token);
    try {
      localStorage.setItem(MODO_DEMO_KEY, '1');
    } catch {
      /* almacenamiento no disponible */
    }
  }

  /** Los servicios de dominio lo consultan para servir datos de ejemplo en vez de llamar a la API. */
  enModoDemo(): boolean {
    try {
      return localStorage.getItem(MODO_DEMO_KEY) === '1';
    } catch {
      return false;
    }
  }

  logout(): void {
    guardarToken(null);
    this._token.set(null);
    try {
      localStorage.removeItem(MODO_DEMO_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
    void this.router.navigate(['/login']);
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

function base64UrlDe(objeto: unknown): string {
  const json = JSON.stringify(objeto);
  const base64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** JWT con firma vacía: solo para decodificar localmente, nunca se envía a una API real como válido. */
function crearTokenDemo(): string {
  const header = base64UrlDe({ alg: 'none', typ: 'JWT' });
  const payload = base64UrlDe({
    sub: 'demo',
    email: 'demo@autoelectricoleos.com',
    name: 'Usuario Demo',
    companyId: 'demo-empresa',
    companyName: 'Auto Eléctrico Leos',
    userType: 'CompanyAdmin',
    locationId: undefined,
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
  } satisfies JwtPayload);
  return `${header}.${payload}.demo`;
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : nombre.trim().slice(0, 2);
  return letras.toUpperCase();
}
