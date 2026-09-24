import { Routes } from '@angular/router';
import { BreadcrumbItem } from '../../core/layout/breadcrumb-item.model';

const RAIL_DATA = { railKey: 'inventario' } as const;
const raiz: BreadcrumbItem = { label: 'Inventario', link: '/inventario' };

/** Rutas del módulo de Inventario, montadas bajo /inventario dentro del layout de tenant. */
export const INVENTARIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    data: RAIL_DATA,
    title: 'Circuito — Inventario',
  },
  {
    path: 'nuevo',
    loadComponent: () => import('./pages/nuevo-producto/nuevo-producto.component').then((m) => m.NuevoProductoComponent),
    data: { ...RAIL_DATA, breadcrumb: [raiz, { label: 'Nuevo producto' }] },
    title: 'Circuito — Nuevo producto',
  },
  {
    path: 'ajustes',
    loadComponent: () => import('./pages/ajustes/ajustes.component').then((m) => m.AjustesInventarioComponent),
    data: { ...RAIL_DATA, breadcrumb: [raiz, { label: 'Movimientos y ajustes' }] },
    title: 'Circuito — Movimientos y ajustes',
  },
  {
    path: 'categorias',
    loadComponent: () => import('./pages/categorias/categorias.component').then((m) => m.CategoriasComponent),
    data: { ...RAIL_DATA, breadcrumb: [raiz, { label: 'Categorías' }] },
    title: 'Circuito — Categorías',
  },
  {
    path: 'proveedores',
    loadComponent: () => import('./pages/proveedores/proveedores.component').then((m) => m.ProveedoresComponent),
    data: { ...RAIL_DATA, breadcrumb: [raiz, { label: 'Proveedores' }] },
    title: 'Circuito — Proveedores',
  },
  {
    // Debe ir antes del catch-all de abajo: dos segmentos (":sku/editar") nunca calzarían con la
    // ruta de un solo segmento ":sku", pero se deja explícito por claridad.
    path: ':sku/editar',
    loadComponent: () => import('./pages/nuevo-producto/nuevo-producto.component').then((m) => m.NuevoProductoComponent),
    data: { ...RAIL_DATA, breadcrumb: [raiz] },
    title: 'Circuito — Editar producto',
  },
  {
    // Debe ir al final: captura cualquier otro segmento como SKU. El tramo del SKU en sí (dinámico)
    // lo agrega ProductoDetalleComponent vía BreadcrumbService, no la ruta.
    path: ':sku',
    loadComponent: () => import('./pages/producto-detalle/producto-detalle.component').then((m) => m.ProductoDetalleComponent),
    data: { ...RAIL_DATA, breadcrumb: [raiz] },
    title: 'Circuito — Detalle de producto',
  },
];
