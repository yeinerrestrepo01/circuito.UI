import { Routes } from '@angular/router';
import { BreadcrumbItem } from '../../core/layout/breadcrumb-item.model';

const RAIL_DATA = { railKey: 'compras' } as const;
const raiz: BreadcrumbItem = { label: 'Compras', link: '/compras' };

export const COMPRAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/sugerencias/sugerencias.component').then((m) => m.SugerenciasCompraComponent),
    data: { ...RAIL_DATA, breadcrumb: [raiz, { label: 'Sugerencia de compras' }] },
    title: 'Circuito — Sugerencia de compras',
  },
  {
    path: 'ordenes',
    loadComponent: () => import('./pages/ordenes/ordenes.component').then((m) => m.OrdenesCompraComponent),
    data: { ...RAIL_DATA, breadcrumb: [raiz, { label: 'Órdenes de compra' }] },
    title: 'Circuito — Órdenes de compra',
  },
];
