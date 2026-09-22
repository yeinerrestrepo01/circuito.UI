export interface ItemVenta {
  sku: string;
  producto: string;
  cantidad: number;
  precio: number;
}

export interface ClienteFactura {
  nitOCedula: string;
  nombre: string;
  correo?: string;
}

export interface FacturaPayload {
  cliente: ClienteFactura;
  items: ItemVenta[];
}

export interface Factura {
  id: string;
  cufe: string;
  qrUrl: string;
}

export const TASA_IVA = 0.19;
