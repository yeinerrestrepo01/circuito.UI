import { Injectable, signal } from '@angular/core';

export interface OpcionesConfirmacion {
  /** Opcional — sin título, el modal solo muestra el mensaje. */
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  /** true = botón de confirmar en rojo (cancelar/inactivar/borrar); false = color de marca (acciones normales). */
  peligroso?: boolean;
}

interface DialogoActivo extends OpcionesConfirmacion {
  resolver: (valor: boolean) => void;
}

/**
 * Reemplaza `window.confirm()` por un modal propio, con el mismo estilo del resto de la app —
 * `ConfirmDialogHostComponent` (montado una sola vez en `App`) lee `dialogo()` y se dibuja solo,
 * igual patrón que `ToastService`/`ToastHostComponent`.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly _dialogo = signal<DialogoActivo | null>(null);
  readonly dialogo = this._dialogo.asReadonly();

  /** Se resuelve en `true` si la persona confirma, `false` si cancela o cierra el modal. */
  confirmar(opciones: OpcionesConfirmacion): Promise<boolean> {
    // Si ya hay uno abierto (no debería pasar en la práctica), se cancela el anterior antes de abrir el nuevo.
    this._dialogo()?.resolver(false);
    return new Promise((resolver) => this._dialogo.set({ ...opciones, resolver }));
  }

  responder(valor: boolean): void {
    this._dialogo()?.resolver(valor);
    this._dialogo.set(null);
  }
}
