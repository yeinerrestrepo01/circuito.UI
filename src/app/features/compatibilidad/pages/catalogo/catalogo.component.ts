import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { EquivalenciaCompatible } from '../../models/equivalencia.model';
import { CompatibilidadService } from '../../services/compatibilidad.service';

/** Listas estáticas del piloto; en producción cada select depende del anterior (marca→línea→modelo→año). */
const MARCAS = ['Chevrolet', 'Renault', 'Mazda'];
const LINEAS = ['Spark', 'Sail', 'Onix'];
const MODELOS = ['GT', 'LT', 'Activ'];
const ANIOS = ['2015', '2016', '2018', '2019'];

@Component({
  selector: 'app-catalogo-compatibilidad',
  imports: [ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, FormFieldComponent],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss',
})
export class CatalogoCompatibilidadComponent {
  private readonly compatibilidadService = inject(CompatibilidadService);

  readonly marcas = MARCAS;
  readonly lineas = LINEAS;
  readonly modelos = MODELOS;
  readonly anios = ANIOS;
  readonly buscando = signal(false);
  readonly resultados = this.compatibilidadService.resultados;

  readonly filtro = new FormGroup({
    marca: new FormControl(MARCAS[0], { nonNullable: true }),
    linea: new FormControl(LINEAS[0], { nonNullable: true }),
    modelo: new FormControl(MODELOS[0], { nonNullable: true }),
    anio: new FormControl(ANIOS[2], { nonNullable: true }),
  });

  readonly columnas: ColumnDef<EquivalenciaCompatible>[] = [
    { key: 'producto', header: 'Producto' },
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'tipoEquivalencia', header: 'Tipo de equivalencia' },
    { key: 'stockPropio', header: 'Stock en tu almacén' },
    { key: 'stockRed', header: 'Stock en red' },
  ];

  buscar(): void {
    this.buscando.set(true);
    this.compatibilidadService.buscar(this.filtro.getRawValue()).subscribe({
      next: () => this.buscando.set(false),
      error: () => this.buscando.set(false),
    });
  }
}
