export interface EquivalenciaCompatible {
  sku: string;
  producto: string;
  tipoEquivalencia: string;
  stockPropio: number;
  /** `null` cuando la red no reporta disponibilidad ("—" en el mockup). */
  stockRed: number | null;
}

export interface FiltroVehiculo {
  marca: string;
  linea: string;
  modelo: string;
  anio: string;
}
