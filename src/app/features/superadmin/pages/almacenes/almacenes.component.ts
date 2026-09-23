import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ToastService } from '../../../../core/services/toast.service';
import { Empresa, EstadoEmpresa, NuevaEmpresaPayload } from '../../models/empresa.model';
import { SuperadminService } from '../../services/superadmin.service';

const ESTADO_BADGE: Record<EstadoEmpresa, EstadoBadge> = { Active: 'success', Trial: 'warning', Suspended: 'danger' };
const ESTADO_LABEL: Record<EstadoEmpresa, string> = { Trial: 'Prueba', Active: 'Activo', Suspended: 'Suspendido' };
const ESTADOS: EstadoEmpresa[] = ['Trial', 'Active', 'Suspended'];

@Component({
  selector: 'app-almacenes',
  imports: [ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent, FormFieldComponent],
  templateUrl: './almacenes.component.html',
  styleUrl: './almacenes.component.scss',
})
export class AlmacenesComponent implements OnInit {
  private readonly superadminService = inject(SuperadminService);
  private readonly toast = inject(ToastService);

  readonly empresas = this.superadminService.empresas;
  readonly estados = ESTADOS;
  readonly creando = signal(false);
  /** Id de la empresa cuyo límite de sedes se está guardando (para deshabilitar su fila). */
  readonly actualizandoLimite = signal<string | null>(null);

  readonly activas = computed(() => this.empresas().filter((e) => e.status === 'Active').length);
  readonly enPrueba = computed(() => this.empresas().filter((e) => e.status === 'Trial').length);
  readonly suspendidas = computed(() => this.empresas().filter((e) => e.status === 'Suspended').length);

  readonly columnas: ColumnDef<Empresa>[] = [
    { key: 'name', header: 'Empresa' },
    { key: 'taxId', header: 'NIT', mono: true },
    { key: 'city', header: 'Ciudad' },
    { key: 'status', header: 'Estado' },
    { key: 'maxLocations', header: 'Límite de sedes' },
  ];

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    taxId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    adminEmail: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    adminFirstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    adminLastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    adminPhone: new FormControl('', { nonNullable: true }),
    adminPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    initialLocationName: new FormControl('Sede principal', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    this.superadminService.cargarEmpresas().subscribe({ error: () => {} });
  }

  estadoBadge(estado: EstadoEmpresa): EstadoBadge {
    return ESTADO_BADGE[estado];
  }

  estadoLabel(estado: EstadoEmpresa): string {
    return ESTADO_LABEL[estado];
  }

  crear(): void {
    if (this.form.invalid || this.creando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.creando.set(true);
    const payload: NuevaEmpresaPayload = this.form.getRawValue();
    this.superadminService.crearEmpresa(payload).subscribe({
      next: (empresa) => {
        this.toast.success(`Empresa ${empresa.name} creada.`);
        this.creando.set(false);
        this.form.reset({
          name: '',
          taxId: '',
          city: '',
          adminEmail: '',
          adminFirstName: '',
          adminLastName: '',
          adminPhone: '',
          adminPassword: '',
          initialLocationName: 'Sede principal',
        });
      },
      error: () => this.creando.set(false),
    });
  }

  cambiarEstado(empresa: Empresa, nuevoEstado: string): void {
    if (nuevoEstado === empresa.status) return;
    this.superadminService.cambiarEstado(empresa.id, nuevoEstado as EstadoEmpresa).subscribe({
      next: () => this.toast.success(`${empresa.name} ahora está ${this.estadoLabel(nuevoEstado as EstadoEmpresa)}.`),
    });
  }

  actualizarLimiteSedes(empresa: Empresa): void {
    const respuesta = prompt(`Nuevo límite de sedes para ${empresa.name}`, String(empresa.maxLocations));
    const nuevoLimite = Number(respuesta);
    if (!respuesta || !Number.isInteger(nuevoLimite) || nuevoLimite < 1) return;

    this.actualizandoLimite.set(empresa.id);
    this.superadminService.actualizarLimiteSedes(empresa.id, nuevoLimite).subscribe({
      next: () => {
        this.toast.success('Límite de sedes actualizado.');
        this.actualizandoLimite.set(null);
      },
      error: () => this.actualizandoLimite.set(null),
    });
  }
}
