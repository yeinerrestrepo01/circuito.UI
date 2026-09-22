import { Routes } from '@angular/router';

export const VENTAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/facturacion/facturacion.component').then((m) => m.FacturacionComponent),
    data: { railKey: 'ventas' },
    title: 'Circuito — Facturación',
  },
];
