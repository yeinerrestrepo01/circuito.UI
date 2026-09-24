import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { EmpresaService } from '../../../../core/services/empresa.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-corta.pipe';
import { formatearMiles, parsearMiles } from '../../../../shared/utils/formato';
import { ReciboVentaComponent } from '../../components/recibo-venta/recibo-venta.component';
import { Cuota, LABEL_ESTADO_CUOTA, Venta } from '../../models/venta.model';
import { VentasService } from '../../services/ventas.service';

/**
 * Vista del recibo DENTRO de la app (con el layout/navegación normales) — para IMPRIMIR de verdad se
 * abre una pestaña aparte (`ImprimirVentaComponent`, ruta sin layout): imprimir esta misma página con
 * `window.print()` también saca el rail lateral y el topbar, porque los pinta el layout padre, no
 * esta pantalla — de ahí que la impresión real viva en una página aislada.
 */
@Component({
  selector: 'app-venta-detalle',
  imports: [RouterLink, CardComponent, ReciboVentaComponent, CopPipe, FechaCortaPipe],
  templateUrl: './venta-detalle.component.html',
  styleUrl: './venta-detalle.component.scss',
})
export class VentaDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ventasService = inject(VentasService);
  private readonly authService = inject(AuthService);
  private readonly empresaService = inject(EmpresaService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  readonly venta = signal<Venta | null>(null);
  readonly nombreNegocio = this.authService.usuario()?.empresaNombre ?? '';
  readonly nitEmpresa = computed(() => this.empresaService.empresa()?.taxId ?? null);
  readonly pagando = signal<string | null>(null);
  readonly formatearMiles = formatearMiles;
  readonly parsearMiles = parsearMiles;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    // El toast de error ya lo muestra el interceptor global; el handler vacío solo evita
    // que RxJS relance la excepción como "unhandled" al no encontrar un observer de error.
    this.ventasService.obtenerVenta(id).subscribe({ next: (venta) => this.venta.set(venta), error: () => {} });
    this.empresaService.cargarEmpresa().subscribe({ error: () => {} });
  }

  abrirImpresion(id: string): void {
    window.open(`/ventas/${id}/imprimir`, '_blank');
  }

  cuotaLabel(cuota: Cuota): string {
    return LABEL_ESTADO_CUOTA[cuota.status];
  }

  /** Reformatea con separador de miles en cada tecla — mismo patrón que el precio en Facturación. */
  onMontoInput(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    input.value = formatearMiles(parsearMiles(input.value) ?? 0);
  }

  /** Pagar (total o parcialmente) una cuota directamente desde el detalle de la venta — la misma
   * acción que en Cartera, solo que sin salir de esta pantalla. Actualiza el recibo en memoria (no
   * hace falta recargar). `monto` viene del input editable de la fila, precargado con el saldo. */
  async pagarCuota(cuota: Cuota, monto: number): Promise<void> {
    if (!monto || monto <= 0) {
      this.toast.error('Indica un monto mayor a cero.');
      return;
    }
    if (monto > cuota.balance) {
      this.toast.error(`El abono no puede superar el saldo pendiente (${cuota.balance}).`);
      return;
    }
    const esPagoTotal = monto >= cuota.balance;
    const confirmado = await this.confirmDialog.confirmar({
      titulo: esPagoTotal ? 'Marcar cuota como pagada' : 'Registrar abono',
      mensaje: esPagoTotal
        ? `¿Confirmar el pago completo de la cuota ${cuota.number}? No se puede deshacer.`
        : `¿Registrar un abono de ${monto} sobre la cuota ${cuota.number}? No se puede deshacer.`,
      textoConfirmar: esPagoTotal ? 'Sí, marcar como pagada' : 'Sí, registrar abono',
    });
    if (!confirmado) return;
    this.pagando.set(cuota.id);
    this.ventasService.pagarCuota(cuota.id, monto).subscribe({
      next: (recibo) => {
        this.toast.success(esPagoTotal ? `Cuota ${cuota.number} pagada.` : `Abono de ${monto} registrado.`);
        // Recibo del abono en una pestaña nueva, sin rail/topbar — mismo criterio que imprimir una venta.
        window.open(`/cartera/pagos/${recibo.id}/imprimir`, '_blank');
        this.venta.update((v) =>
          v
            ? {
                ...v,
                installments: v.installments.map((c) =>
                  c.id === cuota.id
                    ? {
                        ...c,
                        paidAmount: c.paidAmount + monto,
                        balance: c.balance - monto,
                        status: c.balance - monto <= 0 ? 'Paid' : c.status,
                        paidAt: c.balance - monto <= 0 ? new Date().toISOString() : c.paidAt,
                      }
                    : c,
                ),
              }
            : v,
        );
        this.pagando.set(null);
      },
      error: () => this.pagando.set(null),
    });
  }
}
