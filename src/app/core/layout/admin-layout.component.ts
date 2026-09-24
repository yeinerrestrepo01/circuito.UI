import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppTopbarComponent } from '../../shared/components/app-topbar/app-topbar.component';
import { RailNavComponent, SUPERADMIN_RAIL_ITEMS } from '../../shared/components/rail-nav/rail-nav.component';
import { railDataDeLaHoja } from './rail-key.util';

/**
 * Shell de la plataforma (nivel superadmin): su propio rail (ítems e ícono distintos, acento
 * `info`, sin enlace a Configuración de tenant), nunca el rail de tenant. Ver Superadmin.html.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RailNavComponent, AppTopbarComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  private readonly hojaData = railDataDeLaHoja();

  readonly items = SUPERADMIN_RAIL_ITEMS;
  readonly railKey = () => (this.hojaData()['railKey'] as string) ?? 'almacenes';
}
