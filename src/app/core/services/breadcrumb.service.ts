import { Injectable, signal } from '@angular/core';

/**
 * Último tramo dinámico de la miga de pan (p. ej. el SKU en el detalle de un producto), que no se
 * puede resolver desde `data.breadcrumb` de la ruta porque solo existe en tiempo de ejecución. La
 * página lo fija en `ngOnInit` y lo limpia en `ngOnDestroy` para no dejarlo pegado en otra pantalla.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly _extra = signal<string | null>(null);
  readonly extra = this._extra.asReadonly();

  setExtra(texto: string | null): void {
    this._extra.set(texto);
  }
}
