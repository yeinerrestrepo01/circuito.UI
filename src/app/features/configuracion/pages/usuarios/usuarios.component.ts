import { toSignal } from '@angular/core/rxjs-interop';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ToastService } from '../../../../core/services/toast.service';
import { SedesService } from '../../../sedes/services/sedes.service';
import {
  EstadoUsuario,
  InvitarUsuarioPayload,
  TIPOS_QUE_REQUIEREN_SEDE,
  TipoUsuarioEmpresa,
  UsuarioEmpresa,
} from '../../models/usuario-empresa.model';
import { ConfiguracionService } from '../../services/configuracion.service';

const ESTADO_BADGE: Record<EstadoUsuario, EstadoBadge> = {
  Active: 'success',
  PendingInvitation: 'warning',
  Inactive: 'danger',
};
const ESTADO_LABEL: Record<EstadoUsuario, string> = {
  Active: 'Activo',
  PendingInvitation: 'Invitación pendiente',
  Inactive: 'Inactivo',
};

const TIPO_LABEL: Record<TipoUsuarioEmpresa, string> = {
  CompanyAdmin: 'Administrador de empresa',
  Manager: 'Gestor',
  LocationAdmin: 'Administrador de sede',
  Salesperson: 'Vendedor',
  WarehouseStaff: 'Bodega',
};
const TIPOS: TipoUsuarioEmpresa[] = ['CompanyAdmin', 'Manager', 'LocationAdmin', 'Salesperson', 'WarehouseStaff'];

type Pestana = 'usuarios' | 'general' | 'notificaciones' | 'integraciones';

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent, FormFieldComponent],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss',
})
export class UsuariosComponent implements OnInit {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly sedesService = inject(SedesService);
  private readonly toast = inject(ToastService);

  readonly usuarios = this.configuracionService.usuarios;
  readonly sedes = this.sedesService.sedes;
  readonly pestanaActiva = signal<Pestana>('usuarios');
  readonly tipos = TIPOS;
  readonly mostrarFormulario = signal(false);
  readonly invitando = signal(false);

  readonly activos = computed(() => this.usuarios().filter((u) => u.status === 'Active').length);

  readonly columnas: ColumnDef<UsuarioEmpresa>[] = [
    { key: 'fullName', header: 'Nombre' },
    { key: 'type', header: 'Rol' },
    { key: 'email', header: 'Correo' },
    { key: 'status', header: 'Estado' },
  ];

  readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    type: new FormControl<TipoUsuarioEmpresa>('Salesperson', { nonNullable: true }),
    locationId: new FormControl('', { nonNullable: true }),
  });

  private readonly tipoSeleccionado = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });
  /** true si el tipo elegido exige asignar una sede (LocationAdmin, Salesperson, WarehouseStaff). */
  readonly requiereSede = computed(() => TIPOS_QUE_REQUIEREN_SEDE.includes(this.tipoSeleccionado()));

  ngOnInit(): void {
    this.configuracionService.cargarUsuarios().subscribe({ error: () => {} });
    this.sedesService.cargarSedes().subscribe({
      next: (sedes) => {
        if (sedes.length > 0 && !this.form.controls.locationId.value) this.form.controls.locationId.setValue(sedes[0].id);
      },
      error: () => {},
    });
  }

  estadoBadge(estado: EstadoUsuario): EstadoBadge {
    return ESTADO_BADGE[estado];
  }

  estadoLabel(estado: EstadoUsuario): string {
    return ESTADO_LABEL[estado];
  }

  tipoLabel(tipo: TipoUsuarioEmpresa): string {
    return TIPO_LABEL[tipo];
  }

  abrirFormulario(): void {
    this.mostrarFormulario.set(true);
  }

  cancelar(): void {
    this.mostrarFormulario.set(false);
    this.form.reset({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
      type: 'Salesperson',
      locationId: this.sedes()[0]?.id ?? '',
    });
  }

  invitar(): void {
    if (this.form.invalid || this.invitando()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const necesitaSede = this.requiereSede();
    if (necesitaSede && !v.locationId) {
      this.toast.error('Selecciona una sede.');
      return;
    }

    this.invitando.set(true);
    const payload: InvitarUsuarioPayload = {
      firstName: v.firstName,
      lastName: v.lastName,
      phone: v.phone,
      email: v.email,
      password: v.password,
      type: v.type,
      locationId: necesitaSede ? v.locationId : null,
    };

    this.configuracionService.invitarUsuario(payload).subscribe({
      next: () => {
        this.toast.success(`Invitación enviada a ${payload.email}.`);
        this.invitando.set(false);
        this.cancelar();
      },
      error: () => this.invitando.set(false),
    });
  }
}
