import { Routes } from '@angular/router';
import { BreadcrumbItem } from '../../core/layout/breadcrumb-item.model';

const RAIL_DATA = { railKey: 'ventas' } as const;
const raizVentas: BreadcrumbItem = { label: 'Ventas', link: '/ventas' };
const raiz: BreadcrumbItem = { label: 'Cotizaciones', link: '/ventas/cotizaciones' };

export const COTIZACIONES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/cotizaciones-historial/cotizaciones-historial.component').then((m) => m.CotizacionesHistorialComponent),
    data: { ...RAIL_DATA, breadcrumb: [raizVentas, raiz] },
    title: 'Circuito — Cotizaciones',
  },
  {
    path: 'nueva',
    loadComponent: () => import('./pages/nueva-cotizacion/nueva-cotizacion.component').then((m) => m.NuevaCotizacionComponent),
    data: { ...RAIL_DATA, breadcrumb: [raizVentas, raiz, { label: 'Nueva cotización' }] },
    title: 'Circuito — Nueva cotización',
  },
  {
    // Debe ir al final: captura cualquier otro segmento como id de cotización.
    path: ':id',
    loadComponent: () => import('./pages/cotizacion-detalle/cotizacion-detalle.component').then((m) => m.CotizacionDetalleComponent),
    data: { ...RAIL_DATA, breadcrumb: [raizVentas, raiz, { label: 'Detalle de cotización' }] },
    title: 'Circuito — Detalle de cotización',
  },
];
