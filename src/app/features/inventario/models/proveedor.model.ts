/** Espejo de `SupplierDocumentType` (Circuito.API). */
export type TipoDocumentoProveedor = 'Nit' | 'Cedula';

export const OPCIONES_TIPO_DOCUMENTO: { value: TipoDocumentoProveedor; label: string }[] = [
  { value: 'Nit', label: 'NIT' },
  { value: 'Cedula', label: 'Cédula' },
];

/** Espejo de `Circuito.Application.Features.Suppliers.DTOs.SupplierDto`. */
export interface Proveedor {
  id: string;
  name: string;
  documentType?: TipoDocumentoProveedor | null;
  documentNumber?: string | null;
  /** Solo tiene valor cuando `documentType` es 'Nit'; lo calcula siempre el backend. */
  checkDigit?: number | null;
  /** "900123456-4" para NIT, el número tal cual para cédula — ya lista para mostrar. */
  fullDocument?: string | null;
  address?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
}

/** Espejo de `CreateSupplierCommand` — el dígito de verificación NUNCA se envía: lo calcula el backend. */
export interface NuevoProveedorPayload {
  name: string;
  documentType?: TipoDocumentoProveedor;
  documentNumber?: string;
  address?: string;
  contactName?: string;
  phone?: string;
  email?: string;
}

/** Una línea de proveedor de un producto — espejo de `ProductSupplierDto`/`ProductSupplierInput`. */
export interface ProductoProveedor {
  supplierId: string;
  supplierName: string;
  purchaseCost?: number | null;
  isPrimary: boolean;
}

/**
 * Dígito de verificación de NIT según el algoritmo de la DIAN — mismo cálculo que
 * `NitCheckDigitCalculator` del backend. Se usa aquí solo para mostrarlo en vivo mientras el
 * usuario escribe; el valor que de verdad se guarda siempre lo calcula el backend al crear.
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
