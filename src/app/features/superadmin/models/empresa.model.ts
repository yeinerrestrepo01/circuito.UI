/** Mismos valores que Circuito.API/src/Circuito.Domain/Enums/CompanyStatus.cs (`.ToString()`). */
export type EstadoEmpresa = 'Trial' | 'Active' | 'Suspended';

/** Mismo shape que CompanyDto (los nombres de campo del backend están en inglés). */
export interface Empresa {
  id: string;
  name: string;
  taxId: string;
  city: string;
  adminEmail: string;
  status: EstadoEmpresa;
  maxLocations: number;
  createdAt: string;
  activatedAt: string | null;
}

/** Mismo shape que CreateCompanyCommand: aprovisiona la empresa, su primera sede y su primer CompanyAdmin. */
export interface NuevaEmpresaPayload {
  name: string;
  taxId: string;
  city: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPhone: string;
  adminPassword: string;
  initialLocationName: string;
}
