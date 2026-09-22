import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ToastService } from '../../../../core/services/toast.service';
import { EstadoUsuarioAlmacen, RolAlmacen, UsuarioAlmacen } from '../../models/usuario-almacen.model';
import { ConfiguracionService } from '../../services/configuracion.service';

const ESTADO_BADGE: Record<EstadoUsuarioAlmacen, EstadoBadge> = {
  activo: 'success',
  'invitacion-pendiente': 'warning',
  inactivo: 'danger',
};
const ESTADO_LABEL: Record<EstadoUsuarioAlmacen, string> = {
  activo: 'Activo',
  'invitacion-pendiente': 'Invitación pendiente',
  inactivo: 'Inactivo',
};

const ROLES: RolAlmacen[] = ['Administrador', 'Vendedor', 'Bodega'];

type Pestana = 'usuarios' | 'general' | 'notificaciones' | 'integraciones';

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent, FormFieldComponent],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss',
})
export class UsuariosComponent implements OnInit {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly toast = inject(ToastService);

  readonly usuarios = this.configuracionService.usuarios;
  readonly pestanaActiva = signal<Pestana>('usuarios');
  readonly roles = ROLES;
  readonly mostrarFormulario = signal(false);
  readonly invitando = signal(false);

  readonly activos = computed(() => this.usuarios().filter((u) => u.estado === 'activo').length);

  readonly columnas: ColumnDef<UsuarioAlmacen>[] = [
    { key: 'nombre', header: 'Nombre' },
    { key: 'rol', header: 'Rol' },
    { key: 'correo', header: 'Correo' },
    { key: 'estado', header: 'Estado' },
  ];

  readonly form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    apellido: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    telefono: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    correo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    contrasena: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    rol: new FormControl<RolAlmacen>('Vendedor', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.configuracionService.cargarUsuarios().subscribe({ error: () => {} });
  }

  estadoBadge(estado: EstadoUsuarioAlmacen): EstadoBadge {
    return ESTADO_BADGE[estado];
  }

  estadoLabel(estado: EstadoUsuarioAlmacen): string {
    return ESTADO_LABEL[estado];
  }

  abrirFormulario(): void {
    this.mostrarFormulario.set(true);
  }

  cancelar(): void {
    this.mostrarFormulario.set(false);
    this.form.reset({ nombre: '', apellido: '', telefono: '', correo: '', contrasena: '', rol: 'Vendedor' });
  }

  invitar(): void {
    if (this.form.invalid || this.invitando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.invitando.set(true);
    const payload = this.form.getRawValue();
    this.configuracionService.invitarUsuario(payload).subscribe({
      next: () => {
        this.toast.success(`Invitación enviada a ${payload.correo}.`);
        this.invitando.set(false);
        this.cancelar();
      },
      error: () => this.invitando.set(false),
    });
  }
}
