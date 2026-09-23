/** Mismos catálogos que Circuito.API/src/Circuito.Domain/Enums (UserType, UserStatus). */
export type TipoUsuarioEmpresa = 'CompanyAdmin' | 'Manager' | 'LocationAdmin' | 'Salesperson' | 'WarehouseStaff';
export type EstadoUsuario = 'PendingInvitation' | 'Active' | 'Inactive';

/** CompanyAdmin y Manager son de toda la empresa (locationId null); los otros tres exigen una sede. */
export const TIPOS_QUE_REQUIEREN_SEDE: readonly TipoUsuarioEmpresa[] = ['LocationAdmin', 'Salesperson', 'WarehouseStaff'];

export interface UsuarioEmpresa {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  type: TipoUsuarioEmpresa;
  locationId: string | null;
  status: EstadoUsuario;
  createdAt: string;
}

/** Mismo shape que InviteUserCommand. */
export interface InvitarUsuarioPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  type: TipoUsuarioEmpresa;
  locationId: string | null;
}
