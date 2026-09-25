import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './core/layout/admin-layout.component';
import { TenantLayoutComponent } from './core/layout/tenant-layout.component';
import { authGuard, superadminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    // Vista móvil independiente: sin el rail de tenant, aunque sigue exigiendo sesión.
    path: 'inventario/escaneo',
    canActivate: [authGuard],
    loadComponent: () => import('./features/inventario/pages/escaneo/escaneo.component').then((m) => m.EscaneoComponent),
    title: 'Circuito — Registrar movimiento',
  },
  {
    // Página de impresión aislada: sin rail ni topbar, para que window.print() no saque el resto de
    // la app — se abre en una pestaña nueva desde VentaDetalleComponent.
    path: 'ventas/:id/imprimir',
    canActivate: [authGuard],
    loadComponent: () => import('./features/ventas/pages/imprimir/imprimir.component').then((m) => m.ImprimirVentaComponent),
    title: 'Circuito — Imprimir venta',
  },
  {
    // Recibo de un abono a una cuota — mismo criterio: sin rail ni topbar, se abre en pestaña nueva
    // justo al registrar el abono (Cartera / detalle de venta).
    path: 'cartera/pagos/:id/imprimir',
    canActivate: [authGuard],
    loadComponent: () => import('./features/ventas/pages/imprimir-abono/imprimir-abono.component').then((m) => m.ImprimirAbonoComponent),
    title: 'Circuito — Recibo de abono',
  },
  {
    // Recibo de cotización — mismo criterio de impresión aislada.
    path: 'ventas/cotizaciones/:id/imprimir',
    canActivate: [authGuard],
    loadComponent: () => import('./features/cotizaciones/pages/imprimir/imprimir-cotizacion.component').then((m) => m.ImprimirCotizacionComponent),
    title: 'Circuito — Imprimir cotización',
  },
  {
    // Nivel plataforma: su propio rail y layout, nunca el de tenant.
    path: 'admin',
    canActivate: [superadminGuard],
    component: AdminLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('./features/superadmin/superadmin.routes').then((m) => m.SUPERADMIN_ROUTES),
      },
    ],
  },
  {
    // Todas las pantallas de tenant comparten este layout (rail oscuro + contenido claro).
    path: '',
    canActivate: [authGuard],
    component: TenantLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inventario' },
      {
        path: 'inventario',
        loadChildren: () => import('./features/inventario/inventario.routes').then((m) => m.INVENTARIO_ROUTES),
      },
      {
        path: 'compras',
        loadChildren: () => import('./features/compras/compras.routes').then((m) => m.COMPRAS_ROUTES),
      },
      {
        path: 'ventas',
        loadChildren: () => import('./features/ventas/ventas.routes').then((m) => m.VENTAS_ROUTES),
      },
      {
        path: 'clientes',
        loadChildren: () => import('./features/clientes/clientes.routes').then((m) => m.CLIENTES_ROUTES),
      },
      {
        path: 'cartera',
        loadChildren: () => import('./features/cartera/cartera.routes').then((m) => m.CARTERA_ROUTES),
      },
      {
        path: 'compatibilidad',
        loadChildren: () => import('./features/compatibilidad/compatibilidad.routes').then((m) => m.COMPATIBILIDAD_ROUTES),
      },
      {
        path: 'alertas',
        loadChildren: () => import('./features/alertas/alertas.routes').then((m) => m.ALERTAS_ROUTES),
      },
      {
        path: 'red',
        loadChildren: () => import('./features/red/red.routes').then((m) => m.RED_ROUTES),
      },
      {
        path: 'inteligencia',
        loadChildren: () => import('./features/inteligencia/inteligencia.routes').then((m) => m.INTELIGENCIA_ROUTES),
      },
      {
        path: 'configuracion',
        loadChildren: () => import('./features/configuracion/configuracion.routes').then((m) => m.CONFIGURACION_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'inventario' },
];
