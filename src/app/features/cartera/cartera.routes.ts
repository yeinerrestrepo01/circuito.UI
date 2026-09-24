import { Routes } from '@angular/router';
import { BreadcrumbItem } from '../../core/layout/breadcrumb-item.model';

const raiz: BreadcrumbItem = { label: 'Cartera', link: '/cartera' };

export const CARTERA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/cartera/cartera.component').then((m) => m.CarteraComponent),
    data: { railKey: 'cartera', breadcrumb: [raiz] },
    title: 'Circuito — Cartera',
  },
];
