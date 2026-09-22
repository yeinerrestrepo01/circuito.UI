export type CategoriaAbc = 'A' | 'B' | 'C';

export interface ClasificacionAbc {
  categoria: CategoriaAbc;
  etiqueta: string;
  porcentajeSku: number;
  porcentajeValor: number;
}

export interface ProductoObsolescencia {
  sku: string;
  producto: string;
  diasSinMovimiento: number;
  valorInmovilizado: number;
}
