import { Component, input } from '@angular/core';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-corta.pipe';
import { Cuota, LABEL_ESTADO_CUOTA, LABEL_ESTADO_VENTA, OPCIONES_METODO_PAGO, Venta } from '../../models/venta.model';

/**
 * Recibo de una venta, puramente presentacional — sin CUFE/QR (no es factura electrónica). Lo usan
 * dos pantallas distintas: `VentaDetalleComponent` (dentro de la app, con el layout normal) y
 * `ImprimirVentaComponent` (ruta aislada sin layout, la que de verdad se manda a imprimir) — así el
 * markup del recibo vive en un solo lugar.
 */
@Component({
  selector: 'app-recibo-venta',
  imports: [CopPipe, FechaCortaPipe],
  templateUrl: './recibo-venta.component.html',
  styleUrl: './recibo-venta.component.scss',
})
export class ReciboVentaComponent {
  readonly venta = input.required<Venta>();
  readonly nombreNegocio = input.required<string>();
  /** null mientras `EmpresaService.cargarEmpresa()` no ha resuelto todavía. */
  readonly nitEmpresa = input<string | null>(null);

  estadoLabel(venta: Venta): string {
    return LABEL_ESTADO_VENTA[venta.status];
  }

  metodoPagoLabel(venta: Venta): string {
    return OPCIONES_METODO_PAGO.find((m) => m.value === venta.paymentMethod)?.label ?? venta.paymentMethod;
  }

  cuotaLabel(cuota: Cuota): string {
    return LABEL_ESTADO_CUOTA[cuota.status];
  }
}
