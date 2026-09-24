/** Espejo de `PaymentMethod` (Circuito.API). */
export type MetodoPago = 'Cash' | 'Card' | 'Transfer' | 'Other';

export const OPCIONES_METODO_PAGO: { value: MetodoPago; label: string }[] = [
  { value: 'Cash', label: 'Efectivo' },
  { value: 'Card', label: 'Tarjeta' },
  { value: 'Transfer', label: 'Transferencia' },
  { value: 'Other', label: 'Otro' },
];

/** Espejo de `SaleStatus`. */
export type EstadoVenta = 'Completed' | 'Voided';

export const LABEL_ESTADO_VENTA: Record<EstadoVenta, string> = {
  Completed: 'Completada',
  Voided: 'Anulada',
};

/** Espejo de `SaleLineDto`. */
export interface LineaVenta {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** Un valor por unidad vendida — solo presente si el producto tiene `requiresSerialNumber`. */
  serialNumbers?: string[] | null;
}

/** Espejo de `InstallmentStatus`. */
export type EstadoCuota = 'Pending' | 'Paid' | 'Voided';

export const LABEL_ESTADO_CUOTA: Record<EstadoCuota, string> = {
  Pending: 'Pendiente',
  Paid: 'Pagada',
  Voided: 'Anulada',
};

/** Espejo de `InstallmentDto`. */
export interface Cuota {
  id: string;
  number: number;
  dueDate: string;
  amount: number;
  /** Suma de los abonos ya registrados — 0 si no se le ha abonado nada todavía. */
  paidAmount: number;
  /** `amount - paidAmount` — lo que falta por cobrar de esta cuota. */
  balance: number;
  status: EstadoCuota;
  paidAt?: string | null;
}

/** Espejo de `SaleDto`. */
export interface Venta {
  id: string;
  number: number;
  customerId?: string | null;
  /** "Consumidor final" cuando `customerId` es null. */
  customerName: string;
  status: EstadoVenta;
  paymentMethod: MetodoPago;
  discriminatesTax: boolean;
  subtotal: number;
  taxAmount: number;
  total: number;
  lines: LineaVenta[];
  performedByName: string;
  createdAt: string;
  /** Si es true, la venta se paga en cuotas — ver `installments`. Exige `customerId`. */
  isCredit: boolean;
  installmentsCount?: number | null;
  installments: Cuota[];
}

/** Una línea confirmada — espejo de `SaleItemInput`. */
export interface ItemVentaPayload {
  sku: string;
  quantity: number;
  unitPrice: number;
  serialNumbers?: string[];
}

/** Espejo de `CreateSaleCommand`. `customerId` ausente = "Consumidor final" (no permitido a crédito). */
export interface VentaPayload {
  customerId?: string;
  paymentMethod: MetodoPago;
  discriminatesTax: boolean;
  items: ItemVentaPayload[];
  isCredit?: boolean;
  installmentsCount?: number;
}

/** Espejo de `InstallmentPaymentReceiptDto` — el recibo imprimible de un abono puntual. */
export interface ReciboAbono {
  id: string;
  saleId: string;
  saleNumber: number;
  customerName: string;
  installmentNumber: number;
  installmentsCount: number;
  amount: number;
  /** Lo que se abonó en ESTE pago puntual, no el acumulado de la cuota. */
  amountPaid: number;
  /** Saldo de la cuota justo después de este abono — cero si quedó pagada por completo. */
  balanceAfter: number;
  performedByName: string;
  paidAt: string;
}

/** Espejo de `PendingInstallmentDto` — una fila de la Cartera. */
export interface CuotaPendiente {
  id: string;
  saleId: string;
  saleNumber: number;
  customerId?: string | null;
  customerName: string;
  number: number;
  installmentsCount: number;
  dueDate: string;
  /** Monto original de la cuota — ver `balance` para lo que realmente falta cobrar. */
  amount: number;
  paidAmount: number;
  /** Lo que realmente falta cobrar de esta cuota. */
  balance: number;
  isOverdue: boolean;
}
