import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../../core/services/toast.service';
import { Categoria } from '../../models/categoria.model';
import { CategoriasService } from '../../services/categorias.service';

/** Catálogo de categorías de producto (ver `nuevo-producto.component.ts`, que las consume para el campo Categoría). */
@Component({
  selector: 'app-categorias',
  imports: [ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, FormFieldComponent],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.scss',
})
export class CategoriasComponent implements OnInit {
  private readonly categoriasService = inject(CategoriasService);
  private readonly toast = inject(ToastService);

  readonly categorias = this.categoriasService.categorias;
  readonly mostrarFormulario = signal(false);
  readonly guardando = signal(false);
  /** Categoría en edición, o `null` si el formulario está creando una nueva. */
  readonly editando = signal<Categoria | null>(null);

  readonly columnas: ColumnDef<Categoria>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'acciones', header: '' },
  ];

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  ngOnInit(): void {
    this.categoriasService.cargarCategorias().subscribe({ error: () => {} });
  }

  abrirFormulario(): void {
    this.editando.set(null);
    this.form.reset({ name: '' });
    this.mostrarFormulario.set(true);
  }

  editar(categoria: Categoria): void {
    this.editando.set(categoria);
    this.form.setValue({ name: categoria.name });
    this.mostrarFormulario.set(true);
  }

  cancelar(): void {
    this.mostrarFormulario.set(false);
    this.editando.set(null);
    this.form.reset({ name: '' });
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const payload = this.form.getRawValue();
    const enEdicion = this.editando();
    const peticion$ = enEdicion
      ? this.categoriasService.actualizarCategoria(enEdicion.id, payload)
      : this.categoriasService.crearCategoria(payload);

    peticion$.subscribe({
      next: (categoria) => {
        this.toast.success(enEdicion ? `Categoría renombrada a "${categoria.name}".` : `Categoría "${categoria.name}" creada.`);
        this.guardando.set(false);
        this.cancelar();
      },
      error: () => this.guardando.set(false),
    });
  }
}
