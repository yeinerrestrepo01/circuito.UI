import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ToastService } from '../../../../core/services/toast.service';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { FormFieldComponent } from '../../../../shared/components/form-field/form-field.component';
import { Producto } from '../../models/producto.model';
import { InventarioService } from '../../services/inventario.service';

type TipoEscaneo = 'entrada' | 'salida';

@Component({
  selector: 'app-escaneo',
  imports: [ReactiveFormsModule, CardComponent, FormFieldComponent],
  templateUrl: './escaneo.component.html',
  styleUrl: './escaneo.component.scss',
})
export class EscaneoComponent implements OnInit, OnDestroy {
  private readonly inventarioService = inject(InventarioService);
  private readonly toast = inject(ToastService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  @ViewChild('video') private readonly videoRef?: ElementRef<HTMLVideoElement>;

  readonly soportaCamara = typeof window !== 'undefined' && 'BarcodeDetector' in window;
  readonly escaneando = signal(false);
  readonly producto = signal<Producto | null>(null);
  readonly buscandoProducto = signal(false);
  readonly confirmando = signal(false);

  /** Prellenada como en el mockup: referencia típica del piloto, lista para probar sin escanear. */
  readonly referencia = new FormControl('BAT-12V-75AH', { nonNullable: true, validators: [Validators.required] });
  readonly form = new FormGroup({
    tipo: new FormControl<TipoEscaneo>('entrada', { nonNullable: true }),
    cantidad: new FormControl(1, { nonNullable: true, validators: [Validators.min(1)] }),
  });

  private stream: MediaStream | null = null;
  private detectorTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.buscarPorReferencia();
  }

  volver(): void {
    this.location.back();
  }

  seleccionarTipo(tipo: TipoEscaneo): void {
    this.form.controls.tipo.setValue(tipo);
  }

  sumarCantidad(delta: number): void {
    const actual = this.form.controls.cantidad.value;
    this.form.controls.cantidad.setValue(Math.max(1, actual + delta));
  }

  buscarPorReferencia(): void {
    const sku = this.referencia.value.trim();
    if (!sku) return;
    this.buscandoProducto.set(true);
    this.inventarioService.buscarProducto(sku).subscribe({
      next: (producto) => {
        this.producto.set(producto);
        this.buscandoProducto.set(false);
      },
      error: () => {
        this.producto.set(null);
        this.buscandoProducto.set(false);
      },
    });
  }

  async iniciarEscaneo(): Promise<void> {
    if (!this.soportaCamara) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = this.videoRef?.nativeElement;
      if (!video) return;
      video.srcObject = this.stream;
      await video.play();
      this.escaneando.set(true);

      const detector = new BarcodeDetector();
      this.detectorTimer = setInterval(async () => {
        if (!video.videoWidth) return;
        const codigos = await detector.detect(video);
        if (codigos.length > 0) {
          this.referencia.setValue(codigos[0].rawValue);
          this.buscarPorReferencia();
          this.detenerEscaneo();
        }
      }, 400);
    } catch {
      this.toast.error('No se pudo acceder a la cámara. Ingresa la referencia manualmente.');
      this.detenerEscaneo();
    }
  }

  detenerEscaneo(): void {
    if (this.detectorTimer) clearInterval(this.detectorTimer);
    this.detectorTimer = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.escaneando.set(false);
  }

  confirmar(): void {
    const producto = this.producto();
    if (!producto || this.form.invalid || this.confirmando()) return;
    this.confirmando.set(true);
    const { tipo, cantidad } = this.form.getRawValue();
    this.inventarioService
      .registrarMovimiento({
        sku: producto.sku,
        tipo,
        cantidad,
        motivo: tipo === 'entrada' ? 'Transferencia recibida' : 'Venta',
      })
      .subscribe({
        next: () => {
          this.toast.success('Movimiento registrado.');
          void this.router.navigate(['/inventario', producto.sku]);
        },
        error: () => this.confirmando.set(false),
      });
  }

  ngOnDestroy(): void {
    this.detenerEscaneo();
  }
}
