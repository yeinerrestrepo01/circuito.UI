import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

/** Contenedor global de notificaciones; se monta una sola vez en `AppComponent`. */
@Component({
  selector: 'app-toast-host',
  templateUrl: './toast-host.component.html',
  styleUrl: './toast-host.component.scss',
})
export class ToastHostComponent {
  protected readonly toastService = inject(ToastService);
}
