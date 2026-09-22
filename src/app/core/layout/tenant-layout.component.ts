import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RailNavComponent } from '../../shared/components/rail-nav/rail-nav.component';
import { railDataDeLaHoja } from './rail-key.util';

/**
 * Shell de las pantallas de tenant: rail de navegación oscuro (fijo) + contenido claro.
 * `activeKey`/`accent` del rail se leen de `data` de la ruta hoja activa (`railKey`, `railAccent`).
 */
@Component({
  selector: 'app-tenant-layout',
  imports: [RailNavComponent, RouterOutlet],
  templateUrl: './tenant-layout.component.html',
  styleUrl: './tenant-layout.component.scss',
})
export class TenantLayoutComponent {
  private readonly hojaData = railDataDeLaHoja();

  readonly railKey = () => (this.hojaData()['railKey'] as string) ?? 'inventario';
  readonly railAccent = () => (this.hojaData()['railAccent'] as 'brand' | 'info') ?? 'brand';
}
