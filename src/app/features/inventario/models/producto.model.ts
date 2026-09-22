export type EstadoProducto = 'disponible' | 'stock-bajo' | 'agotado';

export interface VidaUtilProducto {
  categoria: string;
  /** Días antes del vencimiento en los que se envía cada recordatorio, p. ej. [30, 7]. */
  ventanaAvisoDias: number[];
}

export interface Producto {
  sku: string;
  nombre: string;
  categoria: string;
  marca: string;
  ubicacion: string;
  stockActual: number;
  stockMinimo: number;
  estado: EstadoProducto;
  precioVenta: number;
  proveedorPrincipal?: string;
  costoCompra?: number;
  vehiculosCompatibles?: number;
  vidaUtil?: VidaUtilProducto;
}

/** Payload de creación: el backend calcula `estado` a partir del stock inicial y el mínimo. */
export type NuevoProductoPayload = Omit<Producto, 'estado'>;
