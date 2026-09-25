import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { EmpresaService } from '../../../../core/services/empresa.service';
import { ReciboCotizacionComponent } from '../../components/recibo-cotizacion/recibo-cotizacion.component';
import { Cotizacion } from '../../models/cotizacion.model';
import { CotizacionesService } from '../../services/cotizaciones.service';

/**
 * Página de impresión aislada — a propósito FUERA del layout de tenant (ver app.routes.ts, mismo
 * criterio que `ventas/:id/imprimir`): sin rail lateral ni topbar, así `window.print()` saca
 * exclusivamente el recibo. Se abre en una pestaña nueva desde el historial/detalle de cotizaciones.
 */
@Component({
  selector: 'app-imprimir-cotizacion',
  imports: [ReciboCotizacionComponent],
  templateUrl: './imprimir-cotizacion.component.html',
  styleUrl: './imprimir-cotizacion.component.scss',
})
export class ImprimirCotizacionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cotizacionesService = inject(CotizacionesService);
  private readonly authService = inject(AuthService);
  private readonly empresaService = inject(EmpresaService);

  readonly cotizacion = signal<Cotizacion | null>(null);
  readonly nombreNegocio = this.authService.usuario()?.empresaNombre ?? '';
  readonly nitEmpresa = computed(() => this.empresaService.empresa()?.taxId ?? null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.cotizacionesService.obtenerCotizacion(id).subscribe({
      next: (cotizacion) => {
        this.cotizacion.set(cotizacion);
        setTimeout(() => window.print(), 300);
      },
      error: () => {},
    });
    this.empresaService.cargarEmpresa().subscribe({ error: () => {} });
  }

  imprimir(): void {
    window.print();
  }
}
