import { Routes } from '@angular/router';

export const ALERTAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/recordatorios/recordatorios.component').then((m) => m.RecordatoriosComponent),
    data: { railKey: 'alertas' },
    title: 'Circuito — Recordatorios',
  },
];
