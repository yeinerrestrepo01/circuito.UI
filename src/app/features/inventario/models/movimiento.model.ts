export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste-positivo' | 'ajuste-negativo' | 'merma';

export interface MovimientoInventario {
  fecha: string;
  sku: string;
  producto: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
  usuario: string;
}

export interface RegistrarMovimientoPayload {
  sku: string;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string;
  observaciones?: string;
}

export const MOTIVOS_ENTRADA = ['Compra a proveedor', 'Devolución de cliente', 'Transferencia recibida'] as const;
export const MOTIVOS_SALIDA = ['Venta', 'Transferencia enviada'] as const;
export const MOTIVOS_AJUSTE = ['Conteo físico', 'Corrección de registro'] as const;
export const MOTIVOS_MERMA = ['Producto dañado', 'Producto vencido', 'Pérdida'] as const;

/** Opciones del campo "Motivo" según el tipo de movimiento elegido (ver Ajustes-Inventario.html). */
export const MOTIVOS_POR_TIPO: Record<TipoMovimiento, readonly string[]> = {
  entrada: MOTIVOS_ENTRADA,
  salida: MOTIVOS_SALIDA,
  'ajuste-positivo': MOTIVOS_AJUSTE,
  'ajuste-negativo': MOTIVOS_AJUSTE,
  merma: MOTIVOS_MERMA,
};

export const OPCIONES_TIPO_MOVIMIENTO: { tipo: TipoMovimiento; label: string }[] = [
  { tipo: 'entrada', label: 'Entrada' },
  { tipo: 'salida', label: 'Salida' },
  { tipo: 'ajuste-positivo', label: 'Ajuste +' },
  { tipo: 'ajuste-negativo', label: 'Ajuste −' },
  { tipo: 'merma', label: 'Merma' },
];

/** Etiqueta amigable de cada tipo de movimiento, para columnas de tabla (ver `OPCIONES_TIPO_MOVIMIENTO`). */
export const LABEL_TIPO_MOVIMIENTO: Record<TipoMovimiento, string> = Object.fromEntries(
  OPCIONES_TIPO_MOVIMIENTO.map(({ tipo, label }) => [tipo, label]),
) as Record<TipoMovimiento, string>;
