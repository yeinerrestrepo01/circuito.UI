import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.tieneSesionValida()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const superadminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.esSuperadmin()) return true;
  return auth.tieneSesionValida()
    ? router.createUrlTree(['/inventario'])
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
