/** Espejo de `CompatibilityType` (Circuito.API). */
export type TipoEquivalencia = 'Original' | 'Generico' | 'Homologado';

export const OPCIONES_TIPO_EQUIVALENCIA: { value: TipoEquivalencia; label: string }[] = [
  { value: 'Original', label: 'Original' },
  { value: 'Generico', label: 'Genérico' },
  { value: 'Homologado', label: 'Homologado' },
];

export const LABEL_TIPO_EQUIVALENCIA: Record<TipoEquivalencia, string> = {
  Original: 'Original',
  Generico: 'Genérico',
  Homologado: 'Homologado',
};

/** Espejo de `VehicleDto`. */
export interface Vehiculo {
  id: string;
  make: string;
  line: string;
  model: string;
  yearFrom: number;
  yearTo?: number | null;
}

/** "Chevrolet Spark GT 2015-2019" (o "2015+" si sigue vigente) — mismo criterio que
 * `CompatibilityMapper.ToLabel` del backend. */
export function etiquetaVehiculo(v: Vehiculo): string {
  return `${v.make} ${v.line} ${v.model} ${v.yearFrom}${v.yearTo ? `-${v.yearTo}` : '+'}`;
}

/** Espejo de `CreateVehicleCommand`. */
export interface NuevoVehiculoPayload {
  make: string;
  line: string;
  model: string;
  yearFrom: number;
  yearTo?: number;
}

/** Espejo de `CompatibleProductDto` — una fila de "buscar por vehículo". */
export interface ProductoCompatible {
  productId: string;
  sku: string;
  productName: string;
  compatibilityType: TipoEquivalencia;
  ownStock: number;
}

/** Espejo de `OemCodeSearchResultDto` — una fila de "buscar por código OEM". */
export interface ResultadoOem {
  productId: string;
  sku: string;
  productName: string;
  code: string;
  manufacturer?: string | null;
  ownStock: number;
}

/** Espejo de `ProductCompatibilityDto` — gestión de compatibilidades desde Producto-detalle. */
export interface CompatibilidadProducto {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  compatibilityType: TipoEquivalencia;
}

/** Espejo de `OemCodeDto`. */
export interface CodigoOem {
  id: string;
  code: string;
  manufacturer?: string | null;
}
