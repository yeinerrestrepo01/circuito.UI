/** Espejo de `Circuito.Application.Features.Suppliers.DTOs.SupplierDto`. */
export interface Proveedor {
  id: string;
  name: string;
  taxId?: string | null;
  address?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
}

/** Espejo de `CreateSupplierCommand`. */
export interface NuevoProveedorPayload {
  name: string;
  taxId?: string;
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
