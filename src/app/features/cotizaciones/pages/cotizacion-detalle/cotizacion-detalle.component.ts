import { toSignal } from '@angular/core/rxjs-interop';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { EmpresaService } from '../../../../core/services/empresa.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { InventarioService } from '../../../inventario/services/inventario.service';
import { MetodoPago, OPCIONES_METODO_PAGO } from '../../../ventas/models/venta.model';
import { ReciboCotizacionComponent } from '../../components/recibo-cotizacion/recibo-cotizacion.component';
import { Cotizacion } from '../../models/cotizacion.model';
import { CotizacionesService } from '../../services/cotizaciones.service';

/**
 * Detalle de una cotización — recibo +, si sigue pendiente y vigente, el panel para "Convertir en
 * venta": acá es donde recién se deciden método de pago, IVA y crédito (la cotización no los lleva),
 * y donde se piden los números de serie de los productos que lo requieran (tampoco los pedía la
 * cotización — no toca inventario para nada hasta este momento).
 */
@Component({
  selector: 'app-cotizacion-detalle',
  imports: [RouterLink, ReactiveFormsModule, CardComponent, ReciboCotizacionComponent, FormFieldComponent],
  templateUrl: './cotizacion-detalle.component.html',
  styleUrl: './cotizacion-detalle.component.scss',
})
export class CotizacionDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cotizacionesService = inject(CotizacionesService);
  private readonly inventarioService = inject(InventarioService);
  private readonly authService = inject(AuthService);
  private readonly empresaService = inject(EmpresaService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly cotizacion = signal<Cotizacion | null>(null);
  readonly nombreNegocio = this.authService.usuario()?.empresaNombre ?? '';
  readonly nitEmpresa = computed(() => this.empresaService.empresa()?.taxId ?? null);
  readonly opcionesMetodoPago = OPCIONES_METODO_PAGO;

  readonly puedeConvertir = computed(() => {
    const c = this.cotizacion();
    return !!c && c.status === 'Pending' && !c.isExpired;
  });

  private readonly productosPorSku = computed(() => new Map(this.inventarioService.productos().map((p) => [p.sku, p])));

  // --- Panel de conversión ---
  readonly mostrarConversion = signal(false);
  readonly convirtiendo = signal(false);
  readonly metodoPago = new FormControl<MetodoPago>('Cash', { nonNullable: true });
  readonly discriminaIva = new FormControl(false, { nonNullable: true });
  readonly esCredito = new FormControl(false, { nonNullable: true });
  readonly esCreditoSignal = toSignal(this.esCredito.valueChanges, { initialValue: this.esCredito.value });
  readonly numeroCuotas = new FormControl(2, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(36)] });
  /** Una entrada por sku que requiere serie, con tantos huecos como la cantidad de esa línea. */
  readonly serialesPorSku = signal<Record<string, string[]>>({});

  readonly faltaClienteParaCredito = computed(() => this.esCreditoSignal() && !this.cotizacion()?.customerId);

  /** Líneas de la cotización que exigen número de serie — se resuelve cruzando con el catálogo, la
   * cotización en sí no guarda ese dato (nunca tocó inventario). */
  readonly lineasConSerie = computed(() => {
    const c = this.cotizacion();
    if (!c) return [];
    const productos = this.productosPorSku();
    return c.lines.filter((l) => productos.get(l.sku)?.requiresSerialNumber);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.cotizacionesService.obtenerCotizacion(id).subscribe({ next: (cotizacion) => this.cotizacion.set(cotizacion), error: () => {} });
    this.inventarioService.cargarProductos().subscribe({ error: () => {} });
    this.empresaService.cargarEmpresa().subscribe({ error: () => {} });
  }

  abrirImpresion(id: string): void {
    window.open(`/ventas/cotizaciones/${id}/imprimir`, '_blank');
  }

  abrirConversion(): void {
    const seriales: Record<string, string[]> = {};
    for (const linea of this.lineasConSerie()) seriales[linea.sku] = new Array(linea.quantity).fill('');
    this.serialesPorSku.set(seriales);
    this.mostrarConversion.set(true);
  }

  cerrarConversion(): void {
    this.mostrarConversion.set(false);
  }

  actualizarSerial(sku: string, indice: number, valor: string): void {
    this.serialesPorSku.update((mapa) => {
      const copia = [...(mapa[sku] ?? [])];
      copia[indice] = valor;
      return { ...mapa, [sku]: copia };
    });
  }

  convertir(): void {
    const cotizacion = this.cotizacion();
    if (!cotizacion || this.convirtiendo()) return;

    if (this.esCredito.value) {
      if (!cotizacion.customerId) {
        this.toast.error('Esta cotización es a "Consumidor final" — una venta a crédito exige un cliente identificado.');
        return;
      }
      if (!this.numeroCuotas.value || this.numeroCuotas.value < 1) {
        this.toast.error('Indica en cuántas cuotas se paga la venta.');
        return;
      }
    }

    const seriales = this.serialesPorSku();
    for (const linea of this.lineasConSerie()) {
      const valores = seriales[linea.sku] ?? [];
      if (valores.some((s) => !s.trim())) {
        this.toast.error(`Completa el número de serie de cada unidad de "${linea.productName}".`);
        return;
      }
      if (new Set(valores.map((s) => s.trim())).size !== valores.length) {
        this.toast.error(`Hay números de serie repetidos en "${linea.productName}".`);
        return;
      }
    }

    this.convirtiendo.set(true);
    this.cotizacionesService
      .convertirEnVenta(cotizacion.id, {
        paymentMethod: this.metodoPago.value,
        discriminatesTax: this.discriminaIva.value,
        items: cotizacion.lines.map((l) => ({
          sku: l.sku,
          serialNumbers: seriales[l.sku] ? seriales[l.sku].map((s) => s.trim()) : undefined,
        })),
        isCredit: this.esCredito.value,
        installmentsCount: this.esCredito.value ? this.numeroCuotas.value : undefined,
      })
      .subscribe({
        next: (venta) => {
          this.toast.success(`Cotización #${cotizacion.number} convertida en venta #${venta.number}.`);
          this.convirtiendo.set(false);
          void this.router.navigate(['/ventas', venta.id]);
        },
        error: () => this.convirtiendo.set(false),
      });
  }
}
