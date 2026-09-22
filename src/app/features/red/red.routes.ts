import { Routes } from '@angular/router';

export const RED_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/red-almacenes/red-almacenes.component').then((m) => m.RedAlmacenesComponent),
    data: { railKey: 'red' },
    title: 'Circuito — Red interalmacenes',
  },
];
