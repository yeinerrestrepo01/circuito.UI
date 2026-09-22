export interface DisponibilidadAlmacen {
  almacen: string;
  ciudad: string;
  distanciaKm: number;
  unidades: number;
  /** El propio almacén del usuario no admite solicitar transferencia hacia sí mismo. */
  esPropio: boolean;
}

export type EstadoTransferencia = 'pendiente' | 'en-transito' | 'completada' | 'rechazada';

export interface SolicitudTransferencia {
  producto: string;
  origen: string;
  destino: string;
  cantidad: number;
  estado: EstadoTransferencia;
}

export interface SolicitarTransferenciaPayload {
  sku: string;
  almacenOrigen: string;
  cantidad: number;
}
