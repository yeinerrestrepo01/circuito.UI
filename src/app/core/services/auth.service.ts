import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API_URL } from '../config/api-url.token';

const TOKEN_KEY = 'circuito.token';
const MODO_DEMO_KEY = 'circuito.modoDemo';

export type RolUsuario = 'superadmin' | 'admin' | 'operador' | string;

interface JwtPayload {
  sub?: string;
  email?: string;
  nombre?: string;
  almacen?: string;
  rol?: RolUsuario;
  exp?: number;
}

export interface UsuarioSesion {
  id: string;
  email: string;
  nombre: string;
  almacen: string;
  rol: RolUsuario;
  iniciales: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
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
    const nombre = payload.nombre ?? email;
    return {
      id: payload.sub ?? email,
      email,
      nombre,
      almacen: payload.almacen ?? '',
      rol: payload.rol ?? 'operador',
      iniciales: iniciales(nombre),
    };
  });

  /** No es un computed a propósito: la expiración depende del reloj, no de una señal. */
  tieneSesionValida(): boolean {
    const payload = decodificar(this._token());
    return !!payload && (payload.exp === undefined || payload.exp * 1000 > Date.now());
  }

  esSuperadmin(): boolean {
    return this.tieneSesionValida() && this.usuario()?.rol === 'superadmin';
  }

  login(credenciales: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credenciales).pipe(
      tap(({ token }) => {
        guardarToken(token);
        this._token.set(token);
      }),
    );
  }

  /**
   * TEMPORAL: crea una sesión local sin backend, para poder navegar la app mientras no existe
   * `POST /auth/login`. El token no está firmado (no sirve contra una API real) y expira en 8h.
   * Quitar este método (y el botón "Modo demo" del login) en cuanto haya autenticación real.
   */
  entrarModoDemo(rol: RolUsuario = 'admin'): void {
    const token = crearTokenDemo(rol);
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
function crearTokenDemo(rol: RolUsuario): string {
  const header = base64UrlDe({ alg: 'none', typ: 'JWT' });
  const payload = base64UrlDe({
    sub: 'demo',
    email: 'demo@autoelectricoleos.com',
    nombre: 'Usuario Demo',
    almacen: 'Auto Eléctrico Leos',
    rol,
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
  } satisfies JwtPayload);
  return `${header}.${payload}.demo`;
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : nombre.trim().slice(0, 2);
  return letras.toUpperCase();
}
