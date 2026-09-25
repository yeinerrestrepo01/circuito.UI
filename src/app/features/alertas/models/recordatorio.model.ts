/** Espejo de `LifecycleReminderStatus`. */
export type EstadoRecordatorio = 'Pending' | 'Contacted';

export const LABEL_ESTADO_RECORDATORIO: Record<EstadoRecordatorio, string> = {
  Pending: 'Pendiente',
  Contacted: 'Contactado',
};

/** Espejo de `PendingReminderDto` — una fila de la lista principal de Alertas. */
export interface RecordatorioPendiente {
  id: string;
  saleId: string;
  saleNumber: number;
  customerId: string;
  customerName: string;
  /** Null si el cliente no tiene teléfono cargado — se oculta el botón de WhatsApp en ese caso. */
  customerPhone?: string | null;
  productId: string;
  productName: string;
  sku: string;
  expiryDate: string;
  notifyDate: string;
  /** `expiryDate` ya pasó — el producto ya cumplió su vida útil esperada, no solo se acerca. */
  isOverdue: boolean;
}

/** Espejo de `ProductReminderDto` — para la pestaña "Recordatorios enviados" de Producto-detalle. */
export interface RecordatorioProducto {
  id: string;
  customerName: string;
  saleNumber: number;
  expiryDate: string;
  notifyDate: string;
  status: EstadoRecordatorio;
  contactedAt?: string | null;
  isOverdue: boolean;
}
