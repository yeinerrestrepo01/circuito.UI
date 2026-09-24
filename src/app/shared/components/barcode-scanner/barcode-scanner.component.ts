import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Component, ElementRef, HostListener, OnDestroy, ViewChild, output, signal } from '@angular/core';

/** Mismos formatos que `EscaneoComponent`: EAN/UPC (empaque de fábrica) + Code128/QR (etiquetas propias). */
const FORMATOS_SOPORTADOS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.QR_CODE,
];

export interface CodigoLeido {
  texto: string;
  formato: string;
}

/**
 * Botón compacto (ícono de cámara) que abre un MODAL centrado con el visor de cámara — no se
 * embebe inline en el formulario que lo usa (Nuevo Producto), para no competir por espacio con el
 * resto de campos ni obligar a un layout raro alrededor de un video 4:3. Misma calibración que
 * `EscaneoComponent` (features/inventario/pages/escaneo) — TRY_HARDER, resolución 1920x1080 ideal,
 * autoenfoque continuo, 100ms entre intentos — porque sin eso la detección en cámaras de celular es
 * muy poco confiable (ver la investigación en ese componente). Si se recalibra uno, hacerlo también
 * en el otro.
 */
@Component({
  selector: 'app-barcode-scanner',
  templateUrl: './barcode-scanner.component.html',
  styleUrl: './barcode-scanner.component.scss',
})
export class BarcodeScannerComponent implements OnDestroy {
  @ViewChild('video') private readonly videoRef?: ElementRef<HTMLVideoElement>;

  /** Emite una sola vez por captura exitosa; el propio componente ya se apagó cuando emite. */
  readonly codigoLeido = output<CodigoLeido>();

  readonly soportaCamara = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  readonly escaneando = signal(false);
  readonly capturado = signal(false);

  private readonly reader = new BrowserMultiFormatReader(
    new Map<DecodeHintType, unknown>([
      [DecodeHintType.POSSIBLE_FORMATS, FORMATOS_SOPORTADOS],
      [DecodeHintType.TRY_HARDER, true],
    ]),
    { delayBetweenScanAttempts: 100, delayBetweenScanSuccess: 500 },
  );
  private controles: IScannerControls | null = null;

  async iniciar(): Promise<void> {
    if (!this.soportaCamara) return;
    const video = this.videoRef?.nativeElement;
    if (!video) return;
    this.escaneando.set(true);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
        },
      };
      this.controles = await this.reader.decodeFromConstraints(constraints, video, (resultado) => {
        if (resultado && !this.capturado()) {
          this.capturado.set(true);
          try {
            navigator.vibrate?.(80);
          } catch {
            /* Vibration API no disponible — el flash visual ya basta de feedback. */
          }
          const texto = resultado.getText();
          const formato = BarcodeFormat[resultado.getBarcodeFormat()];
          setTimeout(() => {
            this.detener();
            this.codigoLeido.emit({ texto, formato });
          }, 450);
        }
      });
    } catch {
      this.detener();
    }
  }

  detener(): void {
    this.controles?.stop();
    this.controles = null;
    this.escaneando.set(false);
    this.capturado.set(false);
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.escaneando()) this.detener();
  }

  ngOnDestroy(): void {
    this.detener();
  }
}
