import { Routes } from '@angular/router';

export const COMPATIBILIDAD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/catalogo/catalogo.component').then((m) => m.CatalogoCompatibilidadComponent),
    data: { railKey: 'compatibilidad' },
    title: 'Circuito — Compatibilidad',
  },
];
