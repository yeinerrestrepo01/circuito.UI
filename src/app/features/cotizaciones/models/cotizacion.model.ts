/** Espejo de `QuotationStatus`. */
export type EstadoCotizacion = 'Pending' | 'Converted' | 'Cancelled';

export const LABEL_ESTADO_COTIZACION: Record<EstadoCotizacion, string> = {
  Pending: 'Pendiente',
  Converted: 'Convertida',
  Cancelled: 'Cancelada',
};

/** Espejo de `QuotationLineDto`. */
export interface LineaCotizacion {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** Espejo de `QuotationDto`. */
export interface Cotizacion {
  id: string;
  number: number;
  customerId?: string | null;
  /** "Consumidor final" cuando `customerId` es null. */
  customerName: string;
  status: EstadoCotizacion;
  /** `status === 'Pending'` pero `expiresAt` ya pasó — no es un estado guardado, se calcula. */
  isExpired: boolean;
  expiresAt: string;
  subtotal: number;
  lines: LineaCotizacion[];
  performedByName: string;
  createdAt: string;
  convertedSaleId?: string | null;
}

/** Una línea confirmada — espejo de `QuotationItemInput`. */
export interface ItemCotizacionPayload {
  sku: string;
  quantity: number;
  unitPrice: number;
}

/** Espejo de `CreateQuotationCommand`. */
export interface CotizacionPayload {
  customerId?: string;
  items: ItemCotizacionPayload[];
}

/** Espejo de `ConvertQuotationItemInput` — solo lleva seriales, cantidad/precio ya están congelados. */
export interface ItemConversionPayload {
  sku: string;
  serialNumbers?: string[];
}

/** Espejo del body de `POST /quotations/{id}/convert`. */
export interface ConversionPayload {
  paymentMethod: string;
  discriminatesTax: boolean;
  items: ItemConversionPayload[];
  isCredit?: boolean;
  installmentsCount?: number;
}
