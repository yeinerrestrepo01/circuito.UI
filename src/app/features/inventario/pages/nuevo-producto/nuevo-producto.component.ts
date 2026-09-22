import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { ToastService } from '../../../../core/services/toast.service';
import { NuevoProductoPayload } from '../../models/producto.model';
import { InventarioService } from '../../services/inventario.service';

const CATEGORIAS_VIDA_UTIL = [
  'Batería (12–13 meses)',
  'Pastillas de freno (por kilometraje)',
  'Aceite (por tiempo o km)',
  'Personalizada',
];
const VENTANAS_AVISO: { label: string; dias: number[] }[] = [
  { label: '30 y 7 días antes', dias: [30, 7] },
  { label: '15 días antes', dias: [15] },
  { label: 'Solo al vencer', dias: [0] },
];

@Component({
  selector: 'app-nuevo-producto',
  imports: [RouterLink, ReactiveFormsModule, CardComponent, FormFieldComponent],
  templateUrl: './nuevo-producto.component.html',
  styleUrl: './nuevo-producto.component.scss',
})
export class NuevoProductoComponent implements OnInit {
  private readonly inventarioService = inject(InventarioService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly categorias = ['Batería', 'Alternador', 'Motor de arranque', 'Filtro', 'Otro'];
  readonly unidades = ['Unidad', 'Caja', 'Litro', 'Metro'];
  readonly proveedores = ['Baterías del Huila', 'Distribuidora Eléctrica Sur'];
  readonly categoriasVidaUtil = CATEGORIAS_VIDA_UTIL;
  readonly ventanasAviso = VENTANAS_AVISO;
  readonly equivalencias = signal<string[]>(['MF-D26-80', 'NS70-80']);
  readonly guardando = signal(false);

  readonly form = new FormGroup({
    sku: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    categoria: new FormControl(this.categorias[0], { nonNullable: true }),
    marca: new FormControl('', { nonNullable: true }),
    unidadMedida: new FormControl(this.unidades[0], { nonNullable: true }),
    vidaUtilAplica: new FormControl(true, { nonNullable: true }),
    vidaUtilCategoria: new FormControl(CATEGORIAS_VIDA_UTIL[0], { nonNullable: true }),
    vidaUtilVentana: new FormControl(VENTANAS_AVISO[0].label, { nonNullable: true }),
    ubicacion: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    stockInicial: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    stockMinimo: new FormControl(5, { nonNullable: true, validators: [Validators.min(0)] }),
    proveedorPrincipal: new FormControl(this.proveedores[0], { nonNullable: true }),
    costoCompra: new FormControl<number | null>(null),
    precioVenta: new FormControl<number | null>(null, { validators: [Validators.required] }),
  });

  ngOnInit(): void {
    // El checkbox no solo oculta la sección con CSS: los selects se deshabilitan de verdad
    // para que no viajen en el payload cuando el recordatorio de vida útil no aplica.
    this.form.controls.vidaUtilAplica.valueChanges.subscribe((aplica) => this.actualizarVidaUtil(aplica));
    this.actualizarVidaUtil(this.form.controls.vidaUtilAplica.value);
  }

  private actualizarVidaUtil(aplica: boolean): void {
    const metodo = aplica ? 'enable' : 'disable';
    this.form.controls.vidaUtilCategoria[metodo]({ emitEvent: false });
    this.form.controls.vidaUtilVentana[metodo]({ emitEvent: false });
  }

  agregarEquivalencia(): void {
    const referencia = prompt('Referencia OEM equivalente')?.trim();
    if (referencia) this.equivalencias.update((lista) => [...lista, referencia]);
  }

  guardar(): void {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.inventarioService.crearProducto(this.construirPayload()).subscribe({
      next: (producto) => {
        this.toast.success(`Producto ${producto.sku} creado.`);
        void this.router.navigate(['/inventario', producto.sku]);
      },
      error: () => this.guardando.set(false),
    });
  }

  private construirPayload(): NuevoProductoPayload {
    const v = this.form.getRawValue();
    const ventana = this.ventanasAviso.find((w) => w.label === v.vidaUtilVentana);
    return {
      sku: v.sku,
      nombre: v.nombre,
      categoria: v.categoria,
      marca: v.marca,
      ubicacion: v.ubicacion,
      stockActual: v.stockInicial,
      stockMinimo: v.stockMinimo,
      precioVenta: v.precioVenta ?? 0,
      proveedorPrincipal: v.proveedorPrincipal,
      costoCompra: v.costoCompra ?? undefined,
      vidaUtil: v.vidaUtilAplica ? { categoria: v.vidaUtilCategoria, ventanaAvisoDias: ventana?.dias ?? [] } : undefined,
    };
  }
}
