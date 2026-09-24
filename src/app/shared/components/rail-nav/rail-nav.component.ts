import { Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

export interface RailNavItem {
  key: string;
  label: string;
  ruta: string;
  /** Trazo del ícono en formato `d` de SVG (viewBox 0 0 24 24). Varios `<path>` se separan con `|`. */
  icono: string;
}

/** Ítems fijos del rail de tenant, en el orden del mockup. */
export const TENANT_RAIL_ITEMS: RailNavItem[] = [
  { key: 'inventario', label: 'Stock', ruta: '/inventario', icono: 'M4 7l8-4 8 4-8 4-8-4z|M4 7v10l8 4V11|M20 7v10l-8 4' },
  { key: 'compras', label: 'Compras', ruta: '/compras', icono: 'M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6' },
  { key: 'ventas', label: 'Ventas', ruta: '/ventas', icono: 'M7 3h10v18l-2-1-2 1-2-1-2 1-2-1-2 1V3z|M9 8h6M9 12h6' },
  { key: 'clientes', label: 'Clientes', ruta: '/clientes', icono: 'M12 12a4 4 0 100-8 4 4 0 000 8z|M4 20c0-4 4-6 8-6s8 2 8 6' },
  { key: 'cartera', label: 'Cartera', ruta: '/cartera', icono: 'M3 6h18v12H3z|M3 10h18|M7 15h4' },
  { key: 'compatibilidad', label: 'Compat.', ruta: '/compatibilidad', icono: 'M9 15l6-6|M8 12l-2 2a3 3 0 104 4l2-2|M16 12l2-2a3 3 0 10-4-4l-2 2' },
  { key: 'alertas', label: 'Alertas', ruta: '/alertas', icono: 'M6 16v-5a6 6 0 1112 0v5l1.5 2h-15z|M10.4 20a1.6 1.6 0 003.2 0' },
  { key: 'red', label: 'Red', ruta: '/red', icono: 'M7 7h10M17 7l-3-3M17 7l-3 3|M17 17H7M7 17l3 3M7 17l3-3' },
  { key: 'inteligencia', label: 'Datos', ruta: '/inteligencia', icono: 'M4 20V10M10 20V4M16 20v-7|M3 20h17' },
];

/** Ítems del rail de superadmin (nivel plataforma, ver Superadmin.html). */
export const SUPERADMIN_RAIL_ITEMS: RailNavItem[] = [
  { key: 'almacenes', label: 'Almacenes', ruta: '/admin', icono: 'M3 10l9-6 9 6|M3 10v10h18V10' },
  { key: 'catalogo', label: 'Catálogo', ruta: '/admin/catalogo', icono: 'M9 15l6-6|M8 12l-2 2a3 3 0 104 4l2-2|M16 12l2-2a3 3 0 10-4-4l-2 2' },
  { key: 'auditoria', label: 'Auditoría', ruta: '/admin/auditoria', icono: 'M9 12l2 2 4-4|M21 12a9 9 0 11-9-9A9 9 0 0121 12z' },
  { key: 'metricas', label: 'Métricas', ruta: '/admin/metricas', icono: 'M4 20V10M10 20V4M16 20v-7|M3 20h17' },
];

@Component({
  selector: 'app-rail-nav',
  imports: [RouterLink],
  templateUrl: './rail-nav.component.html',
  styleUrl: './rail-nav.component.scss',
})
export class RailNavComponent {
  private readonly auth = inject(AuthService);

  /** Clave del ítem activo (coincide con `RailNavItem.key`); resalta con el color de `accent`. */
  readonly activeKey = input.required<string>();
  /** Acento del rail: 'brand' (cobre, módulos de tenant) o 'info' (voltio, superadmin). */
  readonly accent = input<'brand' | 'info'>('brand');
  /** Ítems a renderizar; por defecto los del tenant. Superadmin pasa `SUPERADMIN_RAIL_ITEMS`. */
  readonly items = input<RailNavItem[]>(TENANT_RAIL_ITEMS);
  /** El rail de superadmin no tiene enlace a Configuración de tenant. */
  readonly showSettings = input(true, { transform: booleanAttribute });

  readonly iniciales = computed(() => this.auth.usuario()?.iniciales ?? '--');
  readonly accentVar = computed(() =>
    this.accent() === 'info' ? 'var(--color-info-dark)' : 'var(--color-brand-dark)',
  );

  trayectos(icono: string): string[] {
    return icono.split('|');
  }
}
