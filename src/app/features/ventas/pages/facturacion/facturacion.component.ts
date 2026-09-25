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
import { MetodoPago, OPCIONES_METODO_PAGO } from '../../models/venta.model';
import { VentasService } from '../../services/ventas.service';

/** Una línea del carrito en construcción — no es lo mismo que `LineaVenta` (esa es la línea ya
 * registrada, del lado del backend): acá `serialNumbers` es un array de tamaño `quantity` que se va
 * llenando, con huecos vacíos mientras no se han escrito todos. */
interface ItemCarrito {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  requiresSerialNumber: boolean;
  serialNumbers: string[];
}

@Component({
  selector: 'app-facturacion',
  imports: [RouterLink, RouterLinkActive, ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, FormFieldComponent, CopPipe],
  templateUrl: './facturacion.component.html',
  styleUrl: './facturacion.component.scss',
})
export class FacturacionComponent implements OnInit {
  private readonly ventasService = inject(VentasService);
  private readonly inventarioService = inject(InventarioService);
  private readonly clientesService = inject(ClientesService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly opcionesMetodoPago = OPCIONES_METODO_PAGO;
  readonly clientes = this.clientesService.clientes;
  readonly formatearMiles = formatearMiles;

  readonly carrito = signal<ItemCarrito[]>([]);
  readonly registrando = signal(false);
  /** Para `app-data-table`: rastrea cada fila por su sku (estable) en vez de por referencia del
   * objeto — `carrito.update()` crea objetos nuevos en cada tecla (precio/cantidad/serial editables),
   * y rastrear por referencia destruiría y recrearía el input enfocado en cada pulsación. */
  readonly rastrearPorSku = (item: ItemCarrito): string => item.sku;

  readonly columnas: ColumnDef<ItemCarrito>[] = [
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'productName', header: 'Producto' },
    { key: 'quantity', header: 'Cant.' },
    { key: 'unitPrice', header: 'Precio' },
    { key: 'series', header: 'Series' },
    { key: 'lineTotal', header: 'Subtotal' },
    { key: 'acciones', header: '' },
  ];

  /** Para la columna "Subtotal" (no es un campo propio de `ItemCarrito`, se calcula al vuelo). */
  subtotalDe(item: ItemCarrito): number {
    return item.quantity * item.unitPrice;
  }

  readonly metodoPago = new FormControl<MetodoPago>('Cash', { nonNullable: true });
  readonly discriminaIva = new FormControl(false, { nonNullable: true });
  readonly discriminaIvaSignal = toSignal(this.discriminaIva.valueChanges, { initialValue: this.discriminaIva.value });

  readonly subtotal = computed(() => this.carrito().reduce((suma, i) => suma + i.quantity * i.unitPrice, 0));
  readonly iva = computed(() => (this.discriminaIvaSignal() ? Math.round(this.subtotal() * 0.19) : 0));
  readonly total = computed(() => this.subtotal() + this.iva());

  // --- Venta a crédito: sin interés, solo amortización en cuotas mensuales del total. Exige cliente. ---
  readonly esCredito = new FormControl(false, { nonNullable: true });
  readonly esCreditoSignal = toSignal(this.esCredito.valueChanges, { initialValue: this.esCredito.value });
  readonly numeroCuotas = new FormControl(2, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(36)] });
  /** Vista previa del valor de cada cuota — misma cuenta que CreateSaleCommandHandler.BuildInstallments
   * (última cuota absorbe el residuo del redondeo), solo para que la persona vea qué está prometiendo. */
  readonly valorCuotaPreview = computed(() => {
    const n = this.numeroCuotas.value;
    if (!this.esCreditoSignal() || !n || n < 1) return null;
    return Math.round((this.total() / n) * 100) / 100;
  });
  readonly faltaClienteParaCredito = computed(() => this.esCreditoSignal() && !this.clienteSeleccionado());

  // --- Buscador de productos: tipo selector (igual patrón que el combobox multi-selección de
  // Ajustes) — el desplegable se queda abierto entre un clic y el siguiente, así se pueden ir
  // marcando varios productos de una sola búsqueda sin que se cierre cada vez. ---
  @ViewChild('comboProducto') private readonly comboProductoRef?: ElementRef<HTMLElement>;
  readonly busquedaProducto = new FormControl('', { nonNullable: true });
  private readonly terminoBusquedaProducto = toSignal(this.busquedaProducto.valueChanges, { initialValue: '' });
  readonly mostrarOpcionesProducto = signal(false);
  /** Sin texto escrito muestra el catálogo completo (como al abrir un <select>); con texto, lo
   * filtra. No excluye los ya agregados al carrito — se quedan marcados con ✓. */
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

  // --- "Nombre propio" (registro rápido): solo cédula + nombre + teléfono, directo en el desplegable
  // del cliente — para el caso de "no es Consumidor final pero tampoco necesito cargar dirección/correo
  // ahora", más rápido que abrir el panel completo. Igual que este, registra al cliente de una vez y lo
  // deja elegido para la venta en curso. ---
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
      .crearCliente({
        name: v.name,
        documentType: 'Cedula',
        documentNumber: v.documentNumber.trim(),
        phone: v.phone || undefined,
      })
      .subscribe({
        next: (cliente) => {
          this.toast.success(`Cliente "${cliente.name}" registrado.`);
          this.elegirCliente(cliente); // ya deja formRapido cerrado/reseteado.
          this.guardandoRapido.set(false);
        },
        error: () => this.guardandoRapido.set(false),
      });
  }

  // --- Panel lateral para crear un cliente sin salir de la venta en curso (no pierde el carrito) ---
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
    // El toast de error ya lo muestra el interceptor global; estos handlers solo evitan
    // que RxJS relance la excepción como "unhandled" al no encontrar un observer de error.
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

  /** Cada resultado del selector alterna: si no estaba en el carrito lo agrega, si ya estaba lo
   * quita — igual criterio que el combobox multi-selección de Ajustes. Para subir la cantidad de
   * algo ya agregado se usa el input de cantidad de la fila, no volver a tocar el selector. */
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

  /** Abre el panel de "nuevo cliente" sin abandonar la venta en curso (el carrito no se pierde). */
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
          // Se selecciona de una vez para la venta en curso — para eso es el panel: no perder el
          // carrito yendo a la pantalla de Clientes y volviendo.
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
      if (existente) return items.map((i) => (i.sku === producto.sku ? this.conCantidad(i, i.quantity + 1) : i));
      const base: ItemCarrito = {
        sku: producto.sku,
        productName: producto.name,
        quantity: 1,
        unitPrice: producto.salePrice,
        requiresSerialNumber: producto.requiresSerialNumber,
        serialNumbers: [],
      };
      return [...items, this.conCantidad(base, 1)];
    });
    // No se limpia el buscador — así se pueden ir marcando varios resultados de la misma búsqueda
    // sin que el selector se resetee entre uno y otro (ver alternarProducto).
  }

  /** Ajusta `serialNumbers` al tamaño de `cantidad` (mismo criterio que EscaneoComponent). */
  private conCantidad(item: ItemCarrito, cantidad: number): ItemCarrito {
    if (!item.requiresSerialNumber) return { ...item, quantity: cantidad };
    const copia = item.serialNumbers.slice(0, cantidad);
    while (copia.length < cantidad) copia.push('');
    return { ...item, quantity: cantidad, serialNumbers: copia };
  }

  actualizarCantidad(sku: string, cantidad: number): void {
    const valor = Math.max(1, Math.floor(cantidad) || 1);
    this.carrito.update((items) => items.map((i) => (i.sku === sku ? this.conCantidad(i, valor) : i)));
  }

  onPrecioInput(evento: Event, sku: string): void {
    const input = evento.target as HTMLInputElement;
    const numero = parsearMiles(input.value) ?? 0;
    input.value = formatearMiles(numero);
    this.carrito.update((items) => items.map((i) => (i.sku === sku ? { ...i, unitPrice: numero } : i)));
  }

  actualizarSerial(sku: string, indice: number, valor: string): void {
    this.carrito.update((items) =>
      items.map((i) => {
        if (i.sku !== sku) return i;
        const copia = [...i.serialNumbers];
        copia[indice] = valor;
        return { ...i, serialNumbers: copia };
      }),
    );
  }

  quitarItem(sku: string): void {
    this.carrito.update((items) => items.filter((i) => i.sku !== sku));
  }

  registrar(): void {
    const items = this.carrito();
    if (items.length === 0 || this.registrando()) return;

    if (this.esCredito.value) {
      if (!this.clienteSeleccionado()) {
        this.toast.error('Una venta a crédito exige elegir un cliente — "Consumidor final" no aplica.');
        return;
      }
      if (!this.numeroCuotas.value || this.numeroCuotas.value < 1) {
        this.toast.error('Indica en cuántas cuotas se paga la venta.');
        return;
      }
    }

    for (const item of items) {
      if (!item.requiresSerialNumber) continue;
      if (item.serialNumbers.some((s) => !s.trim())) {
        this.toast.error(`Completa el número de serie de cada unidad de "${item.productName}".`);
        return;
      }
      if (new Set(item.serialNumbers.map((s) => s.trim())).size !== item.serialNumbers.length) {
        this.toast.error(`Hay números de serie repetidos en "${item.productName}".`);
        return;
      }
    }

    this.registrando.set(true);
    this.ventasService
      .registrarVenta({
        customerId: this.clienteSeleccionado()?.id,
        paymentMethod: this.metodoPago.value,
        discriminatesTax: this.discriminaIva.value,
        items: items.map((i) => ({
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          serialNumbers: i.requiresSerialNumber ? i.serialNumbers.map((s) => s.trim()) : undefined,
        })),
        isCredit: this.esCredito.value,
        installmentsCount: this.esCredito.value ? this.numeroCuotas.value : undefined,
      })
      .subscribe({
        next: (venta) => {
          this.toast.success(
            venta.isCredit ? `Venta #${venta.number} registrada a crédito en ${venta.installmentsCount} cuotas.` : `Venta #${venta.number} registrada.`,
          );
          this.registrando.set(false);
          void this.router.navigate(['/ventas', venta.id]);
        },
        error: () => this.registrando.set(false),
      });
  }
}
