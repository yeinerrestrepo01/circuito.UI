/** Espejo de `MovementType` (Circuito.API). */
export type TipoMovimiento = 'Inflow' | 'Outflow' | 'PositiveAdjustment' | 'NegativeAdjustment' | 'Shrinkage';

/** Espejo de `Circuito.Application.Features.InventoryMovements.DTOs.InventoryMovementDto`. */
export interface MovimientoInventario {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  type: TipoMovimiento;
  quantity: number;
  reason: string;
  notes?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  /** Solo tiene valor cuando el movimiento es una compra a proveedor. */
  purchaseCost?: number | null;
  performedByName: string;
  createdAt: string;
}

/** Espejo de `RegisterMovementCommand` — un solo producto (lo usa la pantalla de Escaneo). */
export interface RegistrarMovimientoPayload {
  sku: string;
  type: TipoMovimiento;
  quantity: number;
  reason: string;
  notes?: string;
  supplierId?: string;
  purchaseCost?: number;
}

/** Una línea de producto dentro de un registro por lote — espejo de `BatchMovementItem`. */
export interface ItemMovimientoLote {
  sku: string;
  quantity: number;
  /** Costo de compra de esta línea — solo aplica cuando el motivo es "Compra a proveedor". */
  purchaseCost?: number;
}

/** Espejo de `RegisterMovementsBatchCommand` — varios productos, mismo tipo/motivo/proveedor (pantalla de Ajustes). */
export interface RegistrarMovimientosLotePayload {
  items: ItemMovimientoLote[];
  type: TipoMovimiento;
  reason: string;
  notes?: string;
  supplierId?: string;
}

/** Motivo cuyo movimiento implica una compra: activa el selector de proveedor en el formulario. */
export const MOTIVO_COMPRA_PROVEEDOR = 'Compra a proveedor';

export const MOTIVOS_ENTRADA = [MOTIVO_COMPRA_PROVEEDOR, 'Devolución de cliente', 'Transferencia recibida'] as const;
export const MOTIVOS_SALIDA = ['Venta', 'Transferencia enviada'] as const;
export const MOTIVOS_AJUSTE = ['Conteo físico', 'Corrección de registro'] as const;
export const MOTIVOS_MERMA = ['Producto dañado', 'Producto vencido', 'Pérdida'] as const;

/** Opciones del campo "Motivo" según el tipo de movimiento elegido (ver Ajustes-Inventario.html). */
export const MOTIVOS_POR_TIPO: Record<TipoMovimiento, readonly string[]> = {
  Inflow: MOTIVOS_ENTRADA,
  Outflow: MOTIVOS_SALIDA,
  PositiveAdjustment: MOTIVOS_AJUSTE,
  NegativeAdjustment: MOTIVOS_AJUSTE,
  Shrinkage: MOTIVOS_MERMA,
};

export const OPCIONES_TIPO_MOVIMIENTO: { tipo: TipoMovimiento; label: string }[] = [
  { tipo: 'Inflow', label: 'Entrada' },
  { tipo: 'Outflow', label: 'Salida' },
  { tipo: 'PositiveAdjustment', label: 'Ajuste +' },
  { tipo: 'NegativeAdjustment', label: 'Ajuste −' },
  { tipo: 'Shrinkage', label: 'Merma' },
];

/** Etiqueta amigable de cada tipo de movimiento, para columnas de tabla (ver `OPCIONES_TIPO_MOVIMIENTO`). */
export const LABEL_TIPO_MOVIMIENTO: Record<TipoMovimiento, string> = Object.fromEntries(
  OPCIONES_TIPO_MOVIMIENTO.map(({ tipo, label }) => [tipo, label]),
) as Record<TipoMovimiento, string>;
