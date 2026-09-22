import { Routes } from '@angular/router';

/** Rutas del nivel plataforma, montadas bajo /admin dentro de AdminLayoutComponent. */
export const SUPERADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/almacenes/almacenes.component').then((m) => m.AlmacenesComponent),
    data: { railKey: 'almacenes' },
    title: 'Circuito — Almacenes',
  },
  {
    path: 'catalogo',
    loadComponent: () => import('../../shared/components/en-construccion/en-construccion.component').then((m) => m.EnConstruccionComponent),
    data: { railKey: 'catalogo', modulo: 'Catálogo (superadmin)' },
    title: 'Circuito — Catálogo',
  },
  {
    path: 'auditoria',
    loadComponent: () => import('../../shared/components/en-construccion/en-construccion.component').then((m) => m.EnConstruccionComponent),
    data: { railKey: 'auditoria', modulo: 'Auditoría' },
    title: 'Circuito — Auditoría',
  },
  {
    path: 'metricas',
    loadComponent: () => import('../../shared/components/en-construccion/en-construccion.component').then((m) => m.EnConstruccionComponent),
    data: { railKey: 'metricas', modulo: 'Métricas' },
    title: 'Circuito — Métricas',
  },
];
