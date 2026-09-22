export type RolAlmacen = 'Administrador' | 'Vendedor' | 'Bodega';
export type EstadoUsuarioAlmacen = 'activo' | 'invitacion-pendiente' | 'inactivo';

export interface UsuarioAlmacen {
  nombre: string;
  rol: RolAlmacen;
  correo: string;
  estado: EstadoUsuarioAlmacen;
}

export interface InvitarUsuarioPayload {
  nombre: string;
  apellido: string;
  telefono: string;
  correo: string;
  contrasena: string;
  rol: RolAlmacen;
}
