import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { EmpresaService } from '../../../../core/services/empresa.service';
import { ReciboVentaComponent } from '../../components/recibo-venta/recibo-venta.component';
import { Venta } from '../../models/venta.model';
import { VentasService } from '../../services/ventas.service';

/**
 * Página de impresión aislada — a propósito FUERA del layout de tenant (ver app.routes.ts, mismo
 * criterio que `inventario/escaneo`): sin rail lateral ni topbar, así `window.print()` saca
 * exclusivamente el recibo, no el resto de la app. Se abre en una pestaña nueva desde
 * `VentaDetalleComponent`.
 */
@Component({
  selector: 'app-imprimir-venta',
  imports: [ReciboVentaComponent],
  templateUrl: './imprimir.component.html',
  styleUrl: './imprimir.component.scss',
})
export class ImprimirVentaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ventasService = inject(VentasService);
  private readonly authService = inject(AuthService);
  private readonly empresaService = inject(EmpresaService);

  readonly venta = signal<Venta | null>(null);
  readonly nombreNegocio = this.authService.usuario()?.empresaNombre ?? '';
  readonly nitEmpresa = computed(() => this.empresaService.empresa()?.taxId ?? null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.ventasService.obtenerVenta(id).subscribe({ next: (venta) => this.venta.set(venta), error: () => {} });
    this.empresaService.cargarEmpresa().subscribe({ error: () => {} });
  }

  imprimir(): void {
    window.print();
  }
}
