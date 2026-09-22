import { Routes } from '@angular/router';

export const COMPRAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/sugerencias/sugerencias.component').then((m) => m.SugerenciasCompraComponent),
    data: { railKey: 'compras' },
    title: 'Circuito — Sugerencia de compras',
  },
];
