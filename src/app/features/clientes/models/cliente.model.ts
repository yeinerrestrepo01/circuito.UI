/** Espejo de `CustomerDocumentType` (Circuito.API). */
export type TipoDocumentoCliente = 'Nit' | 'Cedula';

export const OPCIONES_TIPO_DOCUMENTO_CLIENTE: { value: TipoDocumentoCliente; label: string }[] = [
  { value: 'Nit', label: 'NIT' },
  { value: 'Cedula', label: 'Cédula' },
];

/** Espejo de `Circuito.Application.Features.Customers.DTOs.CustomerDto`. */
export interface Cliente {
  id: string;
  name: string;
  documentType?: TipoDocumentoCliente | null;
  documentNumber?: string | null;
  /** Solo tiene valor cuando `documentType` es 'Nit'; lo calcula siempre el backend. */
  checkDigit?: number | null;
  /** "900123456-4" para NIT, el número tal cual para cédula — ya lista para mostrar. */
  fullDocument?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

/** Espejo de `CreateCustomerCommand` — el dígito de verificación NUNCA se envía: lo calcula el backend. */
export interface NuevoClientePayload {
  name: string;
  documentType?: TipoDocumentoCliente;
  documentNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
}

/**
 * Dígito de verificación de NIT — mismo algoritmo (y misma función, copiada) que
 * `proveedor.model.ts`. Se duplica a propósito en vez de importar entre features de dominios
 * distintos (Inventario/Ventas); el valor real que se guarda siempre lo calcula el backend.
 */
const PESOS_NIT = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

export function calcularDigitoVerificacionNit(numero: string): number | null {
  const digitos = numero.replace(/\D/g, '');
  if (!digitos || digitos.length > PESOS_NIT.length) return null;
  let suma = 0;
  for (let i = 0; i < digitos.length; i++) {
    suma += Number(digitos[digitos.length - 1 - i]) * PESOS_NIT[i];
  }
  const resto = suma % 11;
  return resto === 0 || resto === 1 ? resto : 11 - resto;
}
