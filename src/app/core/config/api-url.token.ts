import { InjectionToken } from '@angular/core';

/** Base de la API de Circuito. Por defecto '/api' (proxy en dev / mismo origen en prod). */
export const API_URL = new InjectionToken<string>('API_URL', {
  providedIn: 'root',
  factory: () => '/api',
});
