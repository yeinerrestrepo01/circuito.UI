import { Routes } from '@angular/router';
import { BreadcrumbItem } from '../../core/layout/breadcrumb-item.model';

const RAIL_DATA = { railKey: 'ventas' } as const;
const raiz: BreadcrumbItem = { label: 'Ventas', link: '/ventas' };

export const VENTAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/facturacion/facturacion.component').then((m) => m.FacturacionComponent),
    data: { ...RAIL_DATA, breadcrumb: [raiz, { label: 'Nueva venta' }] },
    title: 'Circuito — Nueva venta',
  },
  {
    path: 'historial',
    loadComponent: () => import('./pages/historial/historial.component').then((m) => m.HistorialVentasComponent),
    data: { ...RAIL_DATA, breadcrumb: [raiz, { label: 'Historial' }] },
    title: 'Circuito — Historial de ventas',
  },
  {
    // Debe ir al final: captura cualquier otro segmento como id de venta.
    path: ':id',
    loadComponent: () => import('./pages/venta-detalle/venta-detalle.component').then((m) => m.VentaDetalleComponent),
    data: { ...RAIL_DATA, breadcrumb: [raiz, { label: 'Detalle de venta' }] },
    title: 'Circuito — Detalle de venta',
  },
];
