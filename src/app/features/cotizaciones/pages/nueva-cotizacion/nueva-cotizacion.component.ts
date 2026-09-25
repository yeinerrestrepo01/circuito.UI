import { toSignal } from '@angular/core/rxjs-interop';
import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../../core/services/toast.service';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { formatearMiles, parsearMiles } from '../../../../shared/utils/formato';
import { InventarioService } from '../../../inventario/services/inventario.service';
import { Producto } from '../../../inventario/models/producto.model';
import {
  Cliente,
  OPCIONES_TIPO_DOCUMENTO_CLIENTE,
  TipoDocumentoCliente,
  calcularDigitoVerificacionNit,
} from '../../../clientes/models/cliente.model';
import { ClientesService } from '../../../clientes/services/clientes.service';
import { CotizacionesService } from '../../services/cotizaciones.service';

/** Una línea de la cotización en construcción — a diferencia del carrito de Facturación NO lleva
 * `requiresSerialNumber`/`serialNumbers`: una cotización no toca inventario, los seriales recién
 * hacen falta si/cuando se convierte en venta (ver ConvertQuotationCommand). */
interface ItemCotizacion {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Armar una cotización: mismo patrón de carrito y de cliente que Facturación (selector
 * multi-elección de productos, combobox de cliente con "Nombre propio" rápido + panel completo),
 * pero SIN método de pago, SIN casilla de IVA y SIN crédito — eso se decide recién al convertir en
 * venta, no acá (ver ConvertirCotizacionComponent).
 */
@Component({
  selector: 'app-nueva-cotizacion',
  imports: [RouterLink, RouterLinkActive, ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, FormFieldComponent, CopPipe],
  templateUrl: './nueva-cotizacion.component.html',
  styleUrl: './nueva-cotizacion.component.scss',
})
export class NuevaCotizacionComponent implements OnInit {
  private readonly cotizacionesService = inject(CotizacionesService);
  private readonly inventarioService = inject(InventarioService);
  private readonly clientesService = inject(ClientesService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly clientes = this.clientesService.clientes;
  readonly formatearMiles = formatearMiles;

  readonly carrito = signal<ItemCotizacion[]>([]);
  readonly registrando = signal(false);
  /** Para `app-data-table`: rastrea cada fila por su sku (estable), no por referencia del objeto —
   * ver el mismo comentario en FacturacionComponent (editar el precio recrea objetos en cada tecla). */
  readonly rastrearPorSku = (item: ItemCotizacion): string => item.sku;

  readonly columnas: ColumnDef<ItemCotizacion>[] = [
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'productName', header: 'Producto' },
    { key: 'quantity', header: 'Cant.' },
    { key: 'unitPrice', header: 'Precio' },
    { key: 'lineTotal', header: 'Subtotal' },
    { key: 'acciones', header: '' },
  ];

  subtotalDe(item: ItemCotizacion): number {
    return item.quantity * item.unitPrice;
  }

  readonly subtotal = computed(() => this.carrito().reduce((suma, i) => suma + i.quantity * i.unitPrice, 0));

  // --- Buscador de productos: selector multi-elección, igual que Facturación/Ajustes. ---
  @ViewChild('comboProducto') private readonly comboProductoRef?: ElementRef<HTMLElement>;
  readonly busquedaProducto = new FormControl('', { nonNullable: true });
  private readonly terminoBusquedaProducto = toSignal(this.busquedaProducto.valueChanges, { initialValue: '' });
  readonly mostrarOpcionesProducto = signal(false);
  readonly resultadosBusquedaProducto = computed(() => {
    const termino = this.terminoBusquedaProducto().trim().toLowerCase();
    const productos = this.inventarioService.productos().filter((p) => p.isActive);
    const filtrados = !termino ? productos : productos.filter((p) => p.sku.toLowerCase().includes(termino) || p.name.toLowerCase().includes(termino));
    return filtrados.slice(0, 30);
  });

  // --- Combobox de cliente (selección única — "Consumidor final" cuando no hay ninguno elegido) ---
  @ViewChild('comboCliente') private readonly comboClienteRef?: ElementRef<HTMLElement>;
  readonly clienteSeleccionado = signal<Cliente | null>(null);
  readonly mostrarOpcionesCliente = signal(false);
  readonly busquedaCliente = new FormControl('', { nonNullable: true });
  private readonly terminoBusquedaCliente = toSignal(this.busquedaCliente.valueChanges, { initialValue: '' });
  readonly resultadosBusquedaCliente = computed(() => {
    const termino = this.terminoBusquedaCliente().trim().toLowerCase();
    const clientes = this.clientes();
    return !termino ? clientes : clientes.filter((c) => c.name.toLowerCase().includes(termino));
  });

  // --- "Nombre propio" (registro rápido) — igual que Facturación. ---
  readonly mostrarFormRapido = signal(false);
  readonly guardandoRapido = signal(false);
  readonly formRapido = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    documentNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', { nonNullable: true }),
  });

  abrirFormRapido(): void {
    this.mostrarFormRapido.set(true);
  }

  cerrarFormRapido(): void {
    this.mostrarFormRapido.set(false);
    this.formRapido.reset({ name: '', documentNumber: '', phone: '' });
  }

  guardarRapido(): void {
    if (this.formRapido.invalid || this.guardandoRapido()) {
      this.formRapido.markAllAsTouched();
      return;
    }
    const v = this.formRapido.getRawValue();
    this.guardandoRapido.set(true);
    this.clientesService
      .crearCliente({ name: v.name, documentType: 'Cedula', documentNumber: v.documentNumber.trim(), phone: v.phone || undefined })
      .subscribe({
        next: (cliente) => {
          this.toast.success(`Cliente "${cliente.name}" registrado.`);
          this.elegirCliente(cliente); // ya deja formRapido cerrado/reseteado.
          this.guardandoRapido.set(false);
        },
        error: () => this.guardandoRapido.set(false),
      });
  }

  // --- Panel lateral para crear un cliente completo sin perder el carrito — igual que Facturación. ---
  readonly tiposDocumentoCliente = OPCIONES_TIPO_DOCUMENTO_CLIENTE;
  readonly mostrarPanelCliente = signal(false);
  readonly guardandoCliente = signal(false);

  readonly formCliente = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    documentType: new FormControl<TipoDocumentoCliente | ''>('', { nonNullable: true }),
    documentNumber: new FormControl('', { nonNullable: true }),
    address: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
  });

  private readonly tipoDocClienteSeleccionado = toSignal(this.formCliente.controls.documentType.valueChanges, {
    initialValue: this.formCliente.controls.documentType.value,
  });
  private readonly numeroDocClienteIngresado = toSignal(this.formCliente.controls.documentNumber.valueChanges, {
    initialValue: this.formCliente.controls.documentNumber.value,
  });
  readonly digitoVerificacionClientePreview = computed(() => {
    if (this.tipoDocClienteSeleccionado() !== 'Nit') return null;
    return calcularDigitoVerificacionNit(this.numeroDocClienteIngresado());
  });

  ngOnInit(): void {
    this.inventarioService.cargarProductos().subscribe({ error: () => {} });
    this.clientesService.cargarClientes().subscribe({ error: () => {} });
  }

  @HostListener('document:click', ['$event'])
  cerrarOpcionesClienteSiEsAfuera(evento: MouseEvent): void {
    if (this.mostrarOpcionesCliente() && !this.comboClienteRef?.nativeElement.contains(evento.target as Node)) {
      this.mostrarOpcionesCliente.set(false);
      this.cerrarFormRapido();
    }
  }

  @HostListener('document:click', ['$event'])
  cerrarOpcionesProductoSiEsAfuera(evento: MouseEvent): void {
    if (this.mostrarOpcionesProducto() && !this.comboProductoRef?.nativeElement.contains(evento.target as Node)) {
      this.mostrarOpcionesProducto.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.mostrarPanelCliente()) this.cerrarPanelCliente();
    else if (this.mostrarFormRapido()) this.cerrarFormRapido();
    else if (this.mostrarOpcionesCliente()) this.mostrarOpcionesCliente.set(false);
    else if (this.mostrarOpcionesProducto()) this.mostrarOpcionesProducto.set(false);
  }

  abrirOpcionesProducto(): void {
    this.mostrarOpcionesProducto.set(true);
  }

  estaEnCarrito(sku: string): boolean {
    return this.carrito().some((i) => i.sku === sku);
  }

  alternarProducto(producto: Producto): void {
    if (this.estaEnCarrito(producto.sku)) this.quitarItem(producto.sku);
    else this.agregarProducto(producto);
  }

  abrirOpcionesCliente(): void {
    this.mostrarOpcionesCliente.set(true);
  }

  elegirCliente(cliente: Cliente | null): void {
    this.clienteSeleccionado.set(cliente);
    this.mostrarOpcionesCliente.set(false);
    this.busquedaCliente.setValue('');
    this.cerrarFormRapido();
  }

  abrirPanelCliente(): void {
    this.mostrarOpcionesCliente.set(false);
    this.mostrarPanelCliente.set(true);
  }

  cerrarPanelCliente(): void {
    this.mostrarPanelCliente.set(false);
    this.formCliente.reset({ name: '', documentType: '', documentNumber: '', address: '', phone: '', email: '' });
  }

  guardarCliente(): void {
    if (this.formCliente.invalid || this.guardandoCliente()) {
      this.formCliente.markAllAsTouched();
      return;
    }
    const v = this.formCliente.getRawValue();
    if (!!v.documentType !== !!v.documentNumber.trim()) {
      this.toast.error('Si registras un documento, indica el tipo (NIT o Cédula) y el número.');
      return;
    }
    this.guardandoCliente.set(true);
    this.clientesService
      .crearCliente({
        name: v.name,
        documentType: v.documentType || undefined,
        documentNumber: v.documentNumber.trim() || undefined,
        address: v.address || undefined,
        phone: v.phone || undefined,
        email: v.email || undefined,
      })
      .subscribe({
        next: (cliente) => {
          this.toast.success(`Cliente "${cliente.name}" creado.`);
          this.elegirCliente(cliente);
          this.guardandoCliente.set(false);
          this.cerrarPanelCliente();
        },
        error: () => this.guardandoCliente.set(false),
      });
  }

  agregarProducto(producto: Producto): void {
    this.carrito.update((items) => {
      const existente = items.find((i) => i.sku === producto.sku);
      if (existente) return items.map((i) => (i.sku === producto.sku ? { ...i, quantity: i.quantity + 1 } : i));
      return [...items, { sku: producto.sku, productName: producto.name, quantity: 1, unitPrice: producto.salePrice }];
    });
  }

  actualizarCantidad(sku: string, cantidad: number): void {
    const valor = Math.max(1, Math.floor(cantidad) || 1);
    this.carrito.update((items) => items.map((i) => (i.sku === sku ? { ...i, quantity: valor } : i)));
  }

  onPrecioInput(evento: Event, sku: string): void {
    const input = evento.target as HTMLInputElement;
    const numero = parsearMiles(input.value) ?? 0;
    input.value = formatearMiles(numero);
    this.carrito.update((items) => items.map((i) => (i.sku === sku ? { ...i, unitPrice: numero } : i)));
  }

  quitarItem(sku: string): void {
    this.carrito.update((items) => items.filter((i) => i.sku !== sku));
  }

  registrar(): void {
    const items = this.carrito();
    if (items.length === 0 || this.registrando()) return;

    this.registrando.set(true);
    this.cotizacionesService
      .registrarCotizacion({
        customerId: this.clienteSeleccionado()?.id,
        items: items.map((i) => ({ sku: i.sku, quantity: i.quantity, unitPrice: i.unitPrice })),
      })
      .subscribe({
        next: (cotizacion) => {
          this.toast.success(`Cotización #${cotizacion.number} generada — válida hasta ${new Date(cotizacion.expiresAt).toLocaleDateString('es-CO')}.`);
          this.registrando.set(false);
          void this.router.navigate(['/ventas/cotizaciones', cotizacion.id]);
        },
        error: () => this.registrando.set(false),
      });
  }
}
