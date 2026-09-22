import { toSignal } from '@angular/core/rxjs-interop';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../../core/services/toast.service';
import { FechaCortaPipe } from '../../../../shared/pipes/fecha-corta.pipe';
import {
  LABEL_TIPO_MOVIMIENTO,
  MOTIVOS_POR_TIPO,
  MovimientoInventario,
  OPCIONES_TIPO_MOVIMIENTO,
  TipoMovimiento,
} from '../../models/movimiento.model';
import { InventarioService } from '../../services/inventario.service';

@Component({
  selector: 'app-ajustes-inventario',
  imports: [RouterLink, ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, FechaCortaPipe, FormFieldComponent],
  templateUrl: './ajustes.component.html',
  styleUrl: './ajustes.component.scss',
})
export class AjustesInventarioComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly inventarioService = inject(InventarioService);
  private readonly toast = inject(ToastService);

  readonly opcionesTipo = OPCIONES_TIPO_MOVIMIENTO;
  readonly busqueda = signal('');
  readonly registrando = signal(false);

  readonly form = new FormGroup({
    producto: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipo: new FormControl<TipoMovimiento>('entrada', { nonNullable: true }),
    cantidad: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    motivo: new FormControl(MOTIVOS_POR_TIPO.entrada[0], { nonNullable: true }),
    observaciones: new FormControl('', { nonNullable: true }),
  });

  private readonly tipoSeleccionado = toSignal(this.form.controls.tipo.valueChanges, {
    initialValue: this.form.controls.tipo.value,
  });
  readonly motivosDisponibles = computed(() => MOTIVOS_POR_TIPO[this.tipoSeleccionado()]);

  readonly columnas: ColumnDef<MovimientoInventario>[] = [
    { key: 'fecha', header: 'Fecha' },
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'producto', header: 'Producto' },
    { key: 'tipo', header: 'Tipo' },
    { key: 'cantidad', header: 'Cant.' },
    { key: 'motivo', header: 'Motivo' },
    { key: 'usuario', header: 'Usuario' },
  ];

  readonly movimientosFiltrados = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const movimientos = this.inventarioService.movimientos();
    if (!termino) return movimientos;
    return movimientos.filter(
      (m) => m.sku.toLowerCase().includes(termino) || m.producto.toLowerCase().includes(termino) || m.usuario.toLowerCase().includes(termino),
    );
  });

  ngOnInit(): void {
    // El toast de error ya lo muestra el interceptor global; este handler solo evita
    // que RxJS relance la excepción como "unhandled" al no encontrar un observer de error.
    this.inventarioService.cargarMovimientos().subscribe({ error: () => {} });

    const sku = this.route.snapshot.queryParamMap.get('sku');
    if (sku) this.form.controls.producto.setValue(sku);

    // El motivo depende del tipo: al cambiar de tipo, se propone el primer motivo válido.
    this.form.controls.tipo.valueChanges.subscribe((tipo) => {
      this.form.controls.motivo.setValue(MOTIVOS_POR_TIPO[tipo][0]);
    });
  }

  seleccionarTipo(tipo: TipoMovimiento): void {
    this.form.controls.tipo.setValue(tipo);
  }

  colorTipo(tipo: MovimientoInventario['tipo']): string {
    return tipo === 'entrada' || tipo === 'ajuste-positivo'
      ? 'var(--color-success)'
      : tipo === 'ajuste-negativo'
        ? 'var(--color-warning)'
        : 'var(--color-danger)';
  }

  labelTipo(tipo: MovimientoInventario['tipo']): string {
    return LABEL_TIPO_MOVIMIENTO[tipo];
  }

  registrar(): void {
    if (this.form.invalid || this.registrando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.registrando.set(true);
    const v = this.form.getRawValue();
    this.inventarioService
      .registrarMovimiento({ sku: v.producto, tipo: v.tipo, cantidad: v.cantidad, motivo: v.motivo, observaciones: v.observaciones })
      .subscribe({
        next: () => {
          this.toast.success('Movimiento registrado.');
          this.registrando.set(false);
          this.form.reset({ producto: '', tipo: 'entrada', cantidad: 1, motivo: MOTIVOS_POR_TIPO.entrada[0], observaciones: '' });
        },
        error: () => this.registrando.set(false),
      });
  }
}
