export interface SugerenciaCompra {
  sku: string;
  producto: string;
  proveedor: string;
  stockActual: number;
  sugerido: number;
  motivo: string;
}

export interface OrdenCompraPayload {
  skus: string[];
}
