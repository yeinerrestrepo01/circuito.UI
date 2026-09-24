import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-corta.pipe';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { formatearMiles, parsearMiles } from '../../../../shared/utils/formato';
import { CuotaPendiente } from '../../../ventas/models/venta.model';
import { VentasService } from '../../../ventas/services/ventas.service';

/** Un cliente con saldo pendiente — fila de la lista inicial de Cartera (antes de entrar a sus cuotas). */
interface ClienteConSaldo {
  /** `customerId`, o el nombre si por algún motivo no viniera (no debería pasar en la práctica). */
  clave: string;
  customerName: string;
  cuotasCount: number;
  totalBalance: number;
  proximoVencimiento: string;
  tieneVencidas: boolean;
}

/**
 * La Cartera: primero una lista de CLIENTES con saldo pendiente (buscable) — no el listado plano de
 * cuotas — y solo al elegir uno se ven sus cuotas para registrar el abono. Reutiliza el mismo
 * VentasService de Facturación/Historial (el dato ya vive ahí, backend `/installments/pending`).
 */
@Component({
  selector: 'app-cartera',
  imports: [CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent, FechaCortaPipe, CopPipe],
  templateUrl: './cartera.component.html',
  styleUrl: './cartera.component.scss',
})
export class CarteraComponent implements OnInit {
  private readonly ventasService = inject(VentasService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly router = inject(Router);

  readonly cartera = this.ventasService.cartera;
  readonly busqueda = signal('');
  readonly pagando = signal<string | null>(null);
  /** null = viendo la lista de clientes; con valor = viendo las cuotas de ese cliente. */
  readonly clienteSeleccionado = signal<string | null>(null);
  readonly formatearMiles = formatearMiles;
  readonly parsearMiles = parsearMiles;

  readonly totalPendiente = computed(() => this.cartera().reduce((suma, c) => suma + c.balance, 0));

  private clave(c: CuotaPendiente): string {
    return c.customerId ?? c.customerName;
  }

  readonly clientesConSaldo = computed<ClienteConSaldo[]>(() => {
    const porCliente = new Map<string, CuotaPendiente[]>();
    for (const c of this.cartera()) {
      const k = this.clave(c);
      porCliente.set(k, [...(porCliente.get(k) ?? []), c]);
    }
    return [...porCliente.entries()].map(([clave, cuotas]) => ({
      clave,
      customerName: cuotas[0].customerName,
      cuotasCount: cuotas.length,
      totalBalance: cuotas.reduce((suma, c) => suma + c.balance, 0),
      proximoVencimiento: cuotas.reduce((min, c) => (c.dueDate < min ? c.dueDate : min), cuotas[0].dueDate),
      tieneVencidas: cuotas.some((c) => c.isOverdue),
    }));
  });

  readonly clientesFiltrados = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const clientes = this.clientesConSaldo();
    if (!termino) return clientes;
    return clientes.filter((c) => c.customerName.toLowerCase().includes(termino));
  });

  readonly cuotasDelCliente = computed(() => {
    const clave = this.clienteSeleccionado();
    if (!clave) return [];
    return this.cartera()
      .filter((c) => this.clave(c) === clave)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  });

  readonly nombreClienteSeleccionado = computed(() => this.cuotasDelCliente()[0]?.customerName ?? '');

  readonly columnasClientes: ColumnDef<ClienteConSaldo>[] = [
    { key: 'customerName', header: 'Cliente' },
    { key: 'cuotasCount', header: 'Cuotas pendientes' },
    { key: 'proximoVencimiento', header: 'Próximo vencimiento' },
    { key: 'totalBalance', header: 'Saldo total' },
    { key: 'estado', header: '' },
    { key: 'acciones', header: '' },
  ];

  readonly columnasCuotas: ColumnDef<CuotaPendiente>[] = [
    { key: 'saleNumber', header: 'Venta', cell: (c) => `#${c.saleNumber}` },
    { key: 'cuota', header: 'Cuota', cell: (c) => `${c.number}/${c.installmentsCount}` },
    { key: 'dueDate', header: 'Vence' },
    { key: 'balance', header: 'Saldo pendiente' },
    { key: 'estado', header: 'Estado' },
    { key: 'acciones', header: '' },
  ];

  ngOnInit(): void {
    this.ventasService.cargarCartera().subscribe({ error: () => {} });
  }

  elegirCliente(clave: string): void {
    this.clienteSeleccionado.set(clave);
    this.busqueda.set('');
  }

  volverAClientes(): void {
    this.clienteSeleccionado.set(null);
  }

  estadoBadge(cuota: CuotaPendiente): EstadoBadge {
    return cuota.isOverdue ? 'danger' : 'warning';
  }

  estadoLabel(cuota: CuotaPendiente): string {
    return cuota.isOverdue ? 'Vencida' : 'Pendiente';
  }

  verVenta(cuota: CuotaPendiente): void {
    void this.router.navigate(['/ventas', cuota.saleId]);
  }

  /** Reformatea con separador de miles en cada tecla — mismo patrón que el precio en Facturación. */
  onMontoInput(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    input.value = formatearMiles(parsearMiles(input.value) ?? 0);
  }

  /** `monto` viene del input editable de la fila — precargado con el saldo completo, pero la persona
   * puede escribir menos (un abono parcial, ej. pagan 15.000 de una cuota de 20.000). */
  async pagar(cuota: CuotaPendiente, monto: number): Promise<void> {
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
        ? `¿Confirmar el pago completo de la cuota ${cuota.number}/${cuota.installmentsCount} de ${cuota.customerName}? No se puede deshacer.`
        : `¿Registrar un abono de ${monto} sobre la cuota ${cuota.number}/${cuota.installmentsCount} de ${cuota.customerName}? No se puede deshacer.`,
      textoConfirmar: esPagoTotal ? 'Sí, marcar como pagada' : 'Sí, registrar abono',
    });
    if (!confirmado) return;
    this.pagando.set(cuota.id);
    this.ventasService.pagarCuota(cuota.id, monto).subscribe({
      next: (recibo) => {
        this.toast.success(esPagoTotal ? `Cuota ${cuota.number}/${cuota.installmentsCount} de ${cuota.customerName} pagada.` : `Abono de ${monto} registrado.`);
        this.pagando.set(null);
        // Recibo del abono en una pestaña nueva, sin rail/topbar — mismo criterio que imprimir una venta.
        window.open(`/cartera/pagos/${recibo.id}/imprimir`, '_blank');
      },
      error: () => this.pagando.set(null),
    });
  }
}
