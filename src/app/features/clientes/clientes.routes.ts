import { Routes } from '@angular/router';
import { BreadcrumbItem } from '../../core/layout/breadcrumb-item.model';

const raiz: BreadcrumbItem = { label: 'Clientes', link: '/clientes' };

export const CLIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/clientes/clientes.component').then((m) => m.ClientesComponent),
    data: { railKey: 'clientes', breadcrumb: [raiz] },
    title: 'Circuito — Clientes',
  },
];
