import { Injectable, signal } from '@angular/core';

export type ToastTipo = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  tipo: ToastTipo;
  mensaje: string;
}

const DURACION_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private siguienteId = 0;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(mensaje: string): void { this.mostrar('success', mensaje); }
  error(mensaje: string): void { this.mostrar('error', mensaje); }
  info(mensaje: string): void { this.mostrar('info', mensaje); }

  cerrar(id: number): void {
    this._toasts.update((lista) => lista.filter((t) => t.id !== id));
  }

  private mostrar(tipo: ToastTipo, mensaje: string): void {
    const id = ++this.siguienteId;
    this._toasts.update((lista) => [...lista, { id, tipo, mensaje }]);
    setTimeout(() => this.cerrar(id), DURACION_MS);
  }
}
