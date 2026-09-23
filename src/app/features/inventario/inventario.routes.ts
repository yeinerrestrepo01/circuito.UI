import { Routes } from '@angular/router';

const RAIL_DATA = { railKey: 'inventario' } as const;

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
    data: RAIL_DATA,
    title: 'Circuito — Nuevo producto',
  },
  {
    path: 'ajustes',
    loadComponent: () => import('./pages/ajustes/ajustes.component').then((m) => m.AjustesInventarioComponent),
    data: RAIL_DATA,
    title: 'Circuito — Movimientos y ajustes',
  },
  {
    path: 'categorias',
    loadComponent: () => import('./pages/categorias/categorias.component').then((m) => m.CategoriasComponent),
    data: RAIL_DATA,
    title: 'Circuito — Categorías',
  },
  {
    path: 'proveedores',
    loadComponent: () => import('./pages/proveedores/proveedores.component').then((m) => m.ProveedoresComponent),
    data: RAIL_DATA,
    title: 'Circuito — Proveedores',
  },
  {
    // Debe ir al final: captura cualquier otro segmento como SKU.
    path: ':sku',
    loadComponent: () => import('./pages/producto-detalle/producto-detalle.component').then((m) => m.ProductoDetalleComponent),
    data: RAIL_DATA,
    title: 'Circuito — Detalle de producto',
  },
];
