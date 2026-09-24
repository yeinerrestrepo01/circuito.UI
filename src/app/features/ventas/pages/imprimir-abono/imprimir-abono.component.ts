import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { EmpresaService } from '../../../../core/services/empresa.service';
import { ReciboAbonoComponent } from '../../components/recibo-abono/recibo-abono.component';
import { ReciboAbono } from '../../models/venta.model';
import { VentasService } from '../../services/ventas.service';

/**
 * Página de impresión aislada de un recibo de abono — a propósito FUERA del layout de tenant (ver
 * app.routes.ts, mismo criterio que `ventas/:id/imprimir`): sin rail lateral ni topbar, así
 * `window.print()` saca exclusivamente el recibo. Se abre en una pestaña nueva justo al registrar el
 * abono (Cartera / detalle de venta), o para reimprimirlo después.
 */
@Component({
  selector: 'app-imprimir-abono',
  imports: [ReciboAbonoComponent],
  templateUrl: './imprimir-abono.component.html',
  styleUrl: './imprimir-abono.component.scss',
})
export class ImprimirAbonoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ventasService = inject(VentasService);
  private readonly authService = inject(AuthService);
  private readonly empresaService = inject(EmpresaService);

  readonly recibo = signal<ReciboAbono | null>(null);
  readonly nombreNegocio = this.authService.usuario()?.empresaNombre ?? '';
  readonly nitEmpresa = computed(() => this.empresaService.empresa()?.taxId ?? null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.ventasService.obtenerReciboAbono(id).subscribe({ next: (recibo) => this.recibo.set(recibo), error: () => {} });
    this.empresaService.cargarEmpresa().subscribe({ error: () => {} });
  }

  imprimir(): void {
    window.print();
  }
}
