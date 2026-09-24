import { Component, HostListener, inject } from '@angular/core';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';

/** Contenedor global del modal de confirmación; se monta una sola vez en `App` (mismo patrón que
 * `ToastHostComponent`). No se usa directamente — se dispara desde `ConfirmDialogService.confirmar()`. */
@Component({
  selector: 'app-confirm-dialog-host',
  templateUrl: './confirm-dialog-host.component.html',
  styleUrl: './confirm-dialog-host.component.scss',
})
export class ConfirmDialogHostComponent {
  protected readonly confirmDialogService = inject(ConfirmDialogService);

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.confirmDialogService.dialogo()) this.confirmDialogService.responder(false);
  }
}
