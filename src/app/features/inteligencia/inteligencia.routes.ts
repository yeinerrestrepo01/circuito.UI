import { Routes } from '@angular/router';

export const INTELIGENCIA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/panel/panel.component').then((m) => m.PanelInteligenciaComponent),
    data: { railKey: 'inteligencia' },
    title: 'Circuito — Inteligencia',
  },
];
