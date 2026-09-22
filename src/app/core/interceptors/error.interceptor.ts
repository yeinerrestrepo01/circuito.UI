import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/** Manejo centralizado de errores HTTP: log + toast. Un 401 fuera del login cierra la sesión. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error(`[HTTP ${error.status}] ${req.method} ${req.url}`, error);
      const esLogin = req.url.endsWith('/auth/login');

      if (error.status === 401 && !esLogin) {
        toast.error('Tu sesión expiró. Inicia sesión de nuevo.');
        auth.logout();
      } else if (!esLogin) {
        toast.error(mensajeDe(error));
      }
      return throwError(() => error);
    }),
  );
};

function mensajeDe(error: HttpErrorResponse): string {
  if (error.status === 0) return 'No hay conexión con el servidor.';
  const detalle = error.error?.message ?? error.error?.title;
  return typeof detalle === 'string' ? detalle : `Error inesperado (${error.status}).`;
}
