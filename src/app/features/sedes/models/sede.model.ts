/** Mismos valores que Circuito.API/src/Circuito.Domain/Enums/LocationStatus.cs. */
export type EstadoSede = 'Active' | 'Inactive';

/** Mismo shape que LocationDto. */
export interface Sede {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  status: EstadoSede;
  createdAt: string;
}

export interface NuevaSedePayload {
  name: string;
  address: string;
  city: string;
  phone: string;
}
