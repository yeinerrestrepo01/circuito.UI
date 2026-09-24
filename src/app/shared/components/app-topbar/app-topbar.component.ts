import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BreadcrumbService } from '../../../core/services/breadcrumb.service';
import { BreadcrumbItem } from '../../../core/layout/breadcrumb-item.model';
import { railDataDeLaHoja } from '../../../core/layout/rail-key.util';

/**
 * Header transversal: se monta una sola vez en cada layout (tenant/superadmin) — nunca por página —
 * para que el nombre del negocio, la miga de pan y la sesión activa se vean siempre igual. Antes
 * cada página traía su propio "eyebrow" con el nombre de la empresa escrito literalmente en el HTML
 * (siempre el mismo texto sin importar qué empresa hubiera iniciado sesión) y su propia miga de pan
 * repetida a mano.
 */
@Component({
  selector: 'app-topbar',
  imports: [RouterLink],
  templateUrl: './app-topbar.component.html',
  styleUrl: './app-topbar.component.scss',
})
export class AppTopbarComponent {
  private readonly auth = inject(AuthService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly hojaData = railDataDeLaHoja();

  readonly usuario = this.auth.usuario;
  readonly nombreNegocio = computed(() => (this.usuario()?.esSuperadmin ? 'Panel de administración' : (this.usuario()?.empresaNombre ?? '')));
  readonly menuAbierto = signal(false);

  /** Tramos estáticos de `data.breadcrumb` de la ruta hoja, más el tramo dinámico (p. ej. un SKU) si la página lo fijó. */
  readonly breadcrumb = computed<BreadcrumbItem[]>(() => {
    const estaticos = (this.hojaData()['breadcrumb'] as BreadcrumbItem[] | undefined) ?? [];
    const extra = this.breadcrumbService.extra();
    return extra ? [...estaticos, { label: extra }] : estaticos;
  });

  toggleMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.menuAbierto()) this.cerrarMenu();
  }

  /** Cierra el menú al hacer clic fuera, sin bloquear el clic en sí (a diferencia de los paneles
   * laterales, esto es un desplegable pequeño: debe poder cerrarse Y dejar que el clic navegue). */
  @HostListener('document:click', ['$event'])
  cerrarSiEsAfuera(evento: MouseEvent): void {
    if (this.menuAbierto() && !this.elementRef.nativeElement.contains(evento.target as Node)) this.cerrarMenu();
  }

  cerrarSesion(): void {
    this.auth.logout();
  }
}
