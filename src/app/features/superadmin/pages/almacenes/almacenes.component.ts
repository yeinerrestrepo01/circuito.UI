import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ToastService } from '../../../../core/services/toast.service';
import { Almacen, EstadoAlmacen, PlanAlmacen } from '../../models/almacen.model';
import { SuperadminService } from '../../services/superadmin.service';

const ESTADO_BADGE: Record<EstadoAlmacen, EstadoBadge> = { activo: 'success', prueba: 'warning', suspendido: 'danger' };
const ESTADO_LABEL: Record<EstadoAlmacen, string> = { activo: 'Activo', prueba: 'Prueba', suspendido: 'Suspendido' };
const PLANES: PlanAlmacen[] = ['Piloto', 'Básico', 'Estándar'];

@Component({
  selector: 'app-almacenes',
  imports: [ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent, FormFieldComponent],
  templateUrl: './almacenes.component.html',
  styleUrl: './almacenes.component.scss',
})
export class AlmacenesComponent implements OnInit {
  private readonly superadminService = inject(SuperadminService);
  private readonly toast = inject(ToastService);

  readonly almacenes = this.superadminService.almacenes;
  readonly planes = PLANES;
  readonly creando = signal(false);

  readonly activos = computed(() => this.almacenes().filter((a) => a.estado === 'activo').length);
  readonly enPrueba = computed(() => this.almacenes().filter((a) => a.estado === 'prueba').length);
  readonly suspendidos = computed(() => this.almacenes().filter((a) => a.estado === 'suspendido').length);

  readonly columnas: ColumnDef<Almacen>[] = [
    { key: 'razonSocial', header: 'Almacén' },
    { key: 'nit', header: 'NIT', mono: true },
    { key: 'ciudad', header: 'Ciudad' },
    { key: 'estado', header: 'Estado' },
    { key: 'ultimoAcceso', header: 'Último acceso' },
    { key: 'plan', header: 'Plan' },
  ];

  readonly form = new FormGroup({
    razonSocial: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    nit: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    ciudad: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    correoAdministrador: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    plan: new FormControl<PlanAlmacen>('Piloto', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.superadminService.cargarAlmacenes().subscribe({ error: () => {} });
  }

  estadoBadge(estado: EstadoAlmacen): EstadoBadge {
    return ESTADO_BADGE[estado];
  }

  estadoLabel(estado: EstadoAlmacen): string {
    return ESTADO_LABEL[estado];
  }

  crear(): void {
    if (this.form.invalid || this.creando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.creando.set(true);
    this.superadminService.crearAlmacen(this.form.getRawValue()).subscribe({
      next: (almacen) => {
        this.toast.success(`Almacén ${almacen.razonSocial} creado.`);
        this.creando.set(false);
        this.form.reset({ razonSocial: '', nit: '', ciudad: '', correoAdministrador: '', plan: 'Piloto' });
      },
      error: () => this.creando.set(false),
    });
  }
}
