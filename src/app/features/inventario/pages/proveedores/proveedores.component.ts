import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../../core/services/toast.service';
import { Proveedor } from '../../models/proveedor.model';
import { ProveedoresService } from '../../services/proveedores.service';

/** Catálogo de proveedores (ver `nuevo-producto.component.ts`: un producto puede tener varios). */
@Component({
  selector: 'app-proveedores',
  imports: [RouterLink, ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, FormFieldComponent],
  templateUrl: './proveedores.component.html',
  styleUrl: './proveedores.component.scss',
})
export class ProveedoresComponent implements OnInit {
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly toast = inject(ToastService);

  readonly proveedores = this.proveedoresService.proveedores;
  readonly mostrarFormulario = signal(false);
  readonly guardando = signal(false);

  readonly columnas: ColumnDef<Proveedor>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'taxId', header: 'NIT' },
    { key: 'address', header: 'Dirección' },
    { key: 'contactName', header: 'Contacto' },
    { key: 'phone', header: 'Teléfono' },
    { key: 'email', header: 'Correo' },
  ];

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    taxId: new FormControl('', { nonNullable: true }),
    address: new FormControl('', { nonNullable: true }),
    contactName: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
  });

  ngOnInit(): void {
    this.proveedoresService.cargarProveedores().subscribe({ error: () => {} });
  }

  abrirFormulario(): void {
    this.mostrarFormulario.set(true);
  }

  cancelar(): void {
    this.mostrarFormulario.set(false);
    this.form.reset({ name: '', taxId: '', address: '', contactName: '', phone: '', email: '' });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const v = this.form.getRawValue();
    this.proveedoresService
      .crearProveedor({
        name: v.name,
        taxId: v.taxId || undefined,
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
