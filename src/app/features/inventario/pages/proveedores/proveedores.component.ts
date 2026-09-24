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
  OPCIONES_TIPO_DOCUMENTO,
  Proveedor,
  TipoDocumentoProveedor,
  calcularDigitoVerificacionNit,
} from '../../models/proveedor.model';
import { ProveedoresService } from '../../services/proveedores.service';

/** Catálogo de proveedores (ver `nuevo-producto.component.ts`: un producto puede tener varios). */
@Component({
  selector: 'app-proveedores',
  imports: [ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, FormFieldComponent],
  templateUrl: './proveedores.component.html',
  styleUrl: './proveedores.component.scss',
})
export class ProveedoresComponent implements OnInit {
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly toast = inject(ToastService);

  readonly proveedores = this.proveedoresService.proveedores;
  readonly tiposDocumento = OPCIONES_TIPO_DOCUMENTO;
  readonly mostrarFormulario = signal(false);
  readonly guardando = signal(false);

  readonly columnas: ColumnDef<Proveedor>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'fullDocument', header: 'Documento' },
    { key: 'address', header: 'Dirección' },
    { key: 'contactName', header: 'Contacto' },
    { key: 'phone', header: 'Teléfono' },
    { key: 'email', header: 'Correo' },
  ];

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    documentType: new FormControl<TipoDocumentoProveedor | ''>('', { nonNullable: true }),
    documentNumber: new FormControl('', { nonNullable: true }),
    address: new FormControl('', { nonNullable: true }),
    contactName: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
  });

  private readonly tipoSeleccionado = toSignal(this.form.controls.documentType.valueChanges, {
    initialValue: this.form.controls.documentType.value,
  });
  private readonly numeroIngresado = toSignal(this.form.controls.documentNumber.valueChanges, {
    initialValue: this.form.controls.documentNumber.value,
  });

  /** Vista previa del dígito de verificación mientras se escribe — solo aplica a NIT; el valor real
   * que se guarda siempre lo calcula el backend (ver NitCheckDigitCalculator). */
  readonly digitoVerificacionPreview = computed(() => {
    if (this.tipoSeleccionado() !== 'Nit') return null;
    return calcularDigitoVerificacionNit(this.numeroIngresado());
  });

  ngOnInit(): void {
    this.proveedoresService.cargarProveedores().subscribe({ error: () => {} });
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
    this.form.reset({ name: '', documentType: '', documentNumber: '', address: '', contactName: '', phone: '', email: '' });
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
    this.proveedoresService
      .crearProveedor({
        name: v.name,
        documentType: v.documentType || undefined,
        documentNumber: v.documentNumber.trim() || undefined,
        address: v.address || undefined,
        contactName: v.contactName || undefined,
        phone: v.phone || undefined,
        email: v.email || undefined,
      })
      .subscribe({
        next: (proveedor) => {
          this.toast.success(`Proveedor "${proveedor.name}" creado.`);
          this.guardando.set(false);
          this.cancelar();
        },
        error: () => this.guardando.set(false),
      });
  }
}
