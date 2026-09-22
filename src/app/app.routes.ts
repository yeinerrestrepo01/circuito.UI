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
