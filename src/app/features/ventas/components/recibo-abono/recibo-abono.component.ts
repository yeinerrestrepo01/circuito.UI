import { Component, input } from '@angular/core';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-corta.pipe';
import { ReciboAbono } from '../../models/venta.model';

/**
 * Recibo de un abono a una cuota de venta a crédito — puramente presentacional, mismo criterio que
 * `ReciboVentaComponent` (sin CUFE/QR, no es factura electrónica). Lo usa `ImprimirAbonoComponent`
 * (la única pantalla que lo consume, ruta aislada sin layout, la que de verdad se manda a imprimir).
 */
@Component({
  selector: 'app-recibo-abono',
  imports: [CopPipe, FechaCortaPipe],
  templateUrl: './recibo-abono.component.html',
  styleUrl: './recibo-abono.component.scss',
})
export class ReciboAbonoComponent {
  readonly recibo = input.required<ReciboAbono>();
  readonly nombreNegocio = input.required<string>();
  /** null mientras `EmpresaService.cargarEmpresa()` no ha resuelto todavía. */
  readonly nitEmpresa = input<string | null>(null);
}
