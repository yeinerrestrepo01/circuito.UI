import { toSignal } from '@angular/core/rxjs-interop';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../../core/services/toast.service';
import {
  Cliente,
  OPCIONES_TIPO_DOCUMENTO_CLIENTE,
  TipoDocumentoCliente,
  calcularDigitoVerificacionNit,
} from '../../models/cliente.model';
import { ClientesService } from '../../services/clientes.service';

/** Catálogo de clientes — su propia sección del menú (usada desde Ventas, pero no anidada bajo
 * /ventas). Mismo patrón que ProveedoresComponent (panel lateral flotante + preview en vivo del
 * dígito de verificación de NIT). */
@Component({
  selector: 'app-clientes',
  imports: [ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, FormFieldComponent],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.scss',
})
export class ClientesComponent implements OnInit {
  private readonly clientesService = inject(ClientesService);
  private readonly toast = inject(ToastService);

  readonly clientes = this.clientesService.clientes;
  readonly tiposDocumento = OPCIONES_TIPO_DOCUMENTO_CLIENTE;
  readonly mostrarFormulario = signal(false);
  readonly guardando = signal(false);

  readonly columnas: ColumnDef<Cliente>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'fullDocument', header: 'Documento' },
    { key: 'address', header: 'Dirección' },
    { key: 'phone', header: 'Teléfono' },
    { key: 'email', header: 'Correo' },
  ];

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    documentType: new FormControl<TipoDocumentoCliente | ''>('', { nonNullable: true }),
    documentNumber: new FormControl('', { nonNullable: true }),
    address: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
  });

  private readonly tipoSeleccionado = toSignal(this.form.controls.documentType.valueChanges, {
    initialValue: this.form.controls.documentType.value,
  });
  private readonly numeroIngresado = toSignal(this.form.controls.documentNumber.valueChanges, {
    initialValue: this.form.controls.documentNumber.value,
  });

  readonly digitoVerificacionPreview = computed(() => {
    if (this.tipoSeleccionado() !== 'Nit') return null;
    return calcularDigitoVerificacionNit(this.numeroIngresado());
  });

  ngOnInit(): void {
    this.clientesService.cargarClientes().subscribe({ error: () => {} });
  }

  abrirFormulario(): void {
    this.mostrarFormulario.set(true);
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.mostrarFormulario()) this.cancelar();
  }

  cancelar(): void {
    this.mostrarFormulario.set(false);
    this.form.reset({ name: '', documentType: '', documentNumber: '', address: '', phone: '', email: '' });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (!!v.documentType !== !!v.documentNumber.trim()) {
      this.toast.error('Si registras un documento, indica el tipo (NIT o Cédula) y el número.');
      return;
    }
    this.guardando.set(true);
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
          this.guardando.set(false);
          this.cancelar();
        },
        error: () => this.guardando.set(false),
      });
  }
}
