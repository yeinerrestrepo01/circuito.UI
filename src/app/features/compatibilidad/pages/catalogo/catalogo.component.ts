import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { CellDefDirective } from '../../../../shared/components/data-table/cell-def.directive';
import { ColumnDef } from '../../../../shared/components/data-table/column-def';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table.component';
import { EstadoBadge, StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../../core/services/toast.service';
import { LABEL_TIPO_EQUIVALENCIA, ProductoCompatible, ResultadoOem, TipoEquivalencia, Vehiculo, etiquetaVehiculo } from '../../models/equivalencia.model';
import { CompatibilidadService } from '../../services/compatibilidad.service';

const BADGE_TIPO_EQUIVALENCIA: Record<TipoEquivalencia, EstadoBadge> = {
  Original: 'success',
  Homologado: 'info',
  Generico: 'warning',
};

const AÑO_ACTUAL = new Date().getFullYear();

/**
 * "¿Qué le sirve a este vehículo?" (o "¿qué tengo para este código OEM?") — el buscador principal
 * del Módulo de Compatibilidad. Los selects en cascada (marca→línea→modelo→año) se arman en el
 * frontend con valores distintos de `cargarVehiculos()` — no hay endpoints por nivel, el catálogo de
 * vehículos es chico y curado a mano por cada negocio (ver plan).
 */
@Component({
  selector: 'app-catalogo-compatibilidad',
  imports: [FormsModule, ReactiveFormsModule, CardComponent, DataTableComponent, CellDefDirective, StatusBadgeComponent, FormFieldComponent],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss',
})
export class CatalogoCompatibilidadComponent implements OnInit {
  private readonly compatibilidadService = inject(CompatibilidadService);
  private readonly toast = inject(ToastService);

  readonly modo = signal<'vehiculo' | 'oem'>('vehiculo');
  readonly buscando = signal(false);
  readonly vehiculos = this.compatibilidadService.vehiculos;
  readonly resultadosVehiculo = this.compatibilidadService.resultadosVehiculo;
  readonly resultadosOem = this.compatibilidadService.resultadosOem;
  readonly etiquetaVehiculo = etiquetaVehiculo;

  // --- Selects en cascada ---
  readonly marca = signal('');
  readonly linea = signal('');
  readonly modelo = signal('');
  readonly vehiculoId = signal('');

  readonly marcas = computed(() => [...new Set(this.vehiculos().map((v) => v.make))].sort());
  readonly lineas = computed(() => {
    const marca = this.marca();
    if (!marca) return [];
    return [...new Set(this.vehiculos().filter((v) => v.make === marca).map((v) => v.line))].sort();
  });
  readonly modelos = computed(() => {
    const marca = this.marca();
    const linea = this.linea();
    if (!marca || !linea) return [];
    return [...new Set(this.vehiculos().filter((v) => v.make === marca && v.line === linea).map((v) => v.model))].sort();
  });
  /** Puede haber más de un vehículo para la misma Marca/Línea/Modelo — uno por cada rango de años
   * cargado (ej. "Spark GT 2015-2016" y "Spark GT 2017-2019" como filas distintas). */
  readonly opcionesAnio = computed<Vehiculo[]>(() => {
    const marca = this.marca();
    const linea = this.linea();
    const modelo = this.modelo();
    if (!marca || !linea || !modelo) return [];
    return this.vehiculos()
      .filter((v) => v.make === marca && v.line === linea && v.model === modelo)
      .sort((a, b) => b.yearFrom - a.yearFrom);
  });

  readonly columnasVehiculo: ColumnDef<ProductoCompatible>[] = [
    { key: 'productName', header: 'Producto' },
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'compatibilityType', header: 'Tipo de equivalencia' },
    { key: 'ownStock', header: 'Stock en tu almacén' },
  ];

  readonly columnasOem: ColumnDef<ResultadoOem>[] = [
    { key: 'productName', header: 'Producto' },
    { key: 'sku', header: 'Referencia', mono: true },
    { key: 'code', header: 'Código OEM', mono: true },
    { key: 'manufacturer', header: 'Fabricante', cell: (r) => r.manufacturer ?? '—' },
    { key: 'ownStock', header: 'Stock en tu almacén' },
  ];

  readonly busquedaOem = new FormControl('', { nonNullable: true });

  // --- "+ Agregar vehículo" (panel flotante) ---
  readonly mostrarPanelVehiculo = signal(false);
  readonly guardandoVehiculo = signal(false);
  readonly formVehiculo = new FormGroup({
    make: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    line: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    model: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    yearFrom: new FormControl(AÑO_ACTUAL, { nonNullable: true, validators: [Validators.required] }),
    yearTo: new FormControl<number | null>(null, { nonNullable: false }),
  });

  ngOnInit(): void {
    this.compatibilidadService.cargarVehiculos().subscribe({ error: () => {} });
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.mostrarPanelVehiculo()) this.cerrarPanelVehiculo();
  }

  cambiarModo(modo: 'vehiculo' | 'oem'): void {
    this.modo.set(modo);
  }

  elegirMarca(valor: string): void {
    this.marca.set(valor);
    this.linea.set('');
    this.modelo.set('');
    this.vehiculoId.set('');
  }

  elegirLinea(valor: string): void {
    this.linea.set(valor);
    this.modelo.set('');
    this.vehiculoId.set('');
  }

  elegirModelo(valor: string): void {
    this.modelo.set(valor);
    this.vehiculoId.set('');
  }

  tipoLabel(tipo: TipoEquivalencia): string {
    return LABEL_TIPO_EQUIVALENCIA[tipo];
  }

  tipoBadge(tipo: TipoEquivalencia): EstadoBadge {
    return BADGE_TIPO_EQUIVALENCIA[tipo];
  }

  buscarPorVehiculo(): void {
    const id = this.vehiculoId();
    if (!id || this.buscando()) return;
    this.buscando.set(true);
    this.compatibilidadService.buscarPorVehiculo(id).subscribe({
      next: () => this.buscando.set(false),
      error: () => this.buscando.set(false),
    });
  }

  buscarPorOem(): void {
    const codigo = this.busquedaOem.value.trim();
    if (!codigo || this.buscando()) return;
    this.buscando.set(true);
    this.compatibilidadService.buscarPorOem(codigo).subscribe({
      next: () => this.buscando.set(false),
      error: () => this.buscando.set(false),
    });
  }

  abrirPanelVehiculo(): void {
    this.mostrarPanelVehiculo.set(true);
  }

  cerrarPanelVehiculo(): void {
    this.mostrarPanelVehiculo.set(false);
    this.formVehiculo.reset({ make: this.marca() || '', line: this.linea() || '', model: this.modelo() || '', yearFrom: AÑO_ACTUAL, yearTo: null });
  }

  guardarVehiculo(): void {
    if (this.formVehiculo.invalid || this.guardandoVehiculo()) {
      this.formVehiculo.markAllAsTouched();
      return;
    }
    const v = this.formVehiculo.getRawValue();
    this.guardandoVehiculo.set(true);
    this.compatibilidadService
      .crearVehiculo({ make: v.make, line: v.line, model: v.model, yearFrom: v.yearFrom, yearTo: v.yearTo ?? undefined })
      .subscribe({
        next: (vehiculo) => {
          this.toast.success(`"${etiquetaVehiculo(vehiculo)}" agregado.`);
          // Deja el buscador listo para buscar justo lo que se acaba de cargar.
          this.marca.set(vehiculo.make);
          this.linea.set(vehiculo.line);
          this.modelo.set(vehiculo.model);
          this.vehiculoId.set(vehiculo.id);
          this.guardandoVehiculo.set(false);
          this.cerrarPanelVehiculo();
        },
        error: () => this.guardandoVehiculo.set(false),
      });
  }
}
