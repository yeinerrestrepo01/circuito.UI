import { Component, input } from '@angular/core';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-corta.pipe';
import { Cotizacion, LABEL_ESTADO_COTIZACION } from '../../models/cotizacion.model';

/**
 * Recibo de una cotización, puramente presentacional — sin CUFE/QR (no es factura electrónica),
 * mismo criterio que `ReciboVentaComponent`. No lleva método de pago ni IVA: eso no se decide hasta
 * convertir en venta. Lo usan dos pantallas: `CotizacionDetalleComponent` (dentro de la app) y
 * `ImprimirCotizacionComponent` (ruta aislada sin layout, la que de verdad se manda a imprimir).
 */
@Component({
  selector: 'app-recibo-cotizacion',
  imports: [CopPipe, FechaCortaPipe],
  templateUrl: './recibo-cotizacion.component.html',
  styleUrl: './recibo-cotizacion.component.scss',
})
export class ReciboCotizacionComponent {
  readonly cotizacion = input.required<Cotizacion>();
  readonly nombreNegocio = input.required<string>();
  readonly nitEmpresa = input<string | null>(null);

  estadoLabel(cotizacion: Cotizacion): string {
    if (cotizacion.status === 'Pending') return cotizacion.isExpired ? 'Vencida' : 'Pendiente';
    return LABEL_ESTADO_COTIZACION[cotizacion.status];
  }
}
