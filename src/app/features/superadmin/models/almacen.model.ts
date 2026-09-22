export type EstadoAlmacen = 'activo' | 'prueba' | 'suspendido';
export type PlanAlmacen = 'Piloto' | 'Básico' | 'Estándar';

export interface Almacen {
  id: string;
  razonSocial: string;
  nit: string;
  ciudad: string;
  estado: EstadoAlmacen;
  ultimoAcceso: string;
  plan: PlanAlmacen;
}

export interface NuevoAlmacenPayload {
  razonSocial: string;
  nit: string;
  ciudad: string;
  correoAdministrador: string;
  plan: PlanAlmacen;
}
