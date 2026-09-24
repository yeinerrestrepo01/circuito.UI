import { ProductoProveedor } from './proveedor.model';

/** Espejo de `ProductStatus` (Circuito.API) — lo calcula el backend a partir de stock/mínimo. */
export type EstadoProducto = 'Available' | 'LowStock' | 'OutOfStock';

/** Espejo de `UnitOfMeasure` (Circuito.API). `UnitsPerBox` solo aplica (y es obligatorio) cuando es 'Box'. */
export type UnidadMedida = 'Unit' | 'Box' | 'Liter' | 'Meter';

export const OPCIONES_UNIDAD_MEDIDA: { value: UnidadMedida; label: string }[] = [
  { value: 'Unit', label: 'Unidad' },
  { value: 'Box', label: 'Caja' },
  { value: 'Liter', label: 'Litro' },
  { value: 'Meter', label: 'Metro' },
];

export const LABEL_UNIDAD_MEDIDA: Record<UnidadMedida, string> = Object.fromEntries(
  OPCIONES_UNIDAD_MEDIDA.map(({ value, label }) => [value, label]),
) as Record<UnidadMedida, string>;

/** Espejo de `Circuito.Application.Features.Products.DTOs.ProductDto`. */
export interface Producto {
  id: string;
  sku: string;
  /** Código físico de fábrica (EAN-13/UPC-A/etc.), leído con la cámara en Nuevo Producto — distinto
   * del sku (que arma el negocio como categoría-marca-código). Null hasta que alguien lo capture. */
  barcode?: string | null;
  name: string;
  categoryId: string;
  categoryName: string;
  brand: string;
  storageLocation: string;
  stockQuantity: number;
  minStock: number;
  status: EstadoProducto;
  salePrice: number;
  purchaseCost?: number | null;
  /** (salePrice - purchaseCost) / salePrice, en porcentaje — null si no hay costo de compra o el precio de venta es 0. */
  marginPercentage?: number | null;
  unitOfMeasure: UnidadMedida;
  /** Unidades base que trae una caja (p. ej. 12); solo tiene valor cuando `unitOfMeasure` es 'Box'. */
  unitsPerBox?: number | null;
  /** Un producto puede tener varios proveedores, a lo sumo uno marcado `isPrimary`. Ordenados por el backend con el principal primero. */
  suppliers: ProductoProveedor[];
  compatibleVehicleCount: number;
  hasLifecycleReminder: boolean;
  lifecycleCategory?: string | null;
  /** Días antes del vencimiento en los que se envía cada recordatorio, p. ej. [30, 7]. */
  lifecycleReminderWindowDays?: number[] | null;
  /** false = el negocio dejó de vender/comprar este producto; sigue en el catálogo (historial, reportes)
   * pero se oculta de donde alguien lo elegiría para vender/comprar. */
  isActive: boolean;
  /** Si es true, una Salida (venta) de este producto exige un número de serie por unidad vendida —
   * para repuestos con serie individual (baterías) a diferencia de repuestos a granel (tornillos). */
  requiresSerialNumber: boolean;
  createdAt: string;
}

/** Una línea de proveedor en el formulario de creación — espejo de `ProductSupplierInput`. */
export interface NuevoProductoProveedor {
  supplierId: string;
  purchaseCost?: number;
  isPrimary: boolean;
}

/** Espejo de `CreateProductCommand` — el backend calcula `status` a partir del stock inicial y el mínimo. */
export interface NuevoProductoPayload {
  sku: string;
  barcode?: string;
  name: string;
  categoryId: string;
  brand: string;
  storageLocation: string;
  initialStock: number;
  minStock: number;
  salePrice: number;
  purchaseCost?: number;
  unitOfMeasure: UnidadMedida;
  unitsPerBox?: number;
  suppliers: NuevoProductoProveedor[];
  hasLifecycleReminder?: boolean;
  lifecycleCategory?: string;
  lifecycleReminderWindowDays?: number[];
  requiresSerialNumber?: boolean;
}

/** Espejo de `UpdateProductCommand` — igual que `NuevoProductoPayload` pero sin `sku` ni `initialStock`:
 * la referencia es la identidad estable del producto y el stock solo cambia por movimientos (Ajustes). */
export interface ActualizarProductoPayload {
  barcode?: string;
  name: string;
  categoryId: string;
  brand: string;
  storageLocation: string;
  minStock: number;
  salePrice: number;
  purchaseCost?: number;
  unitOfMeasure: UnidadMedida;
  unitsPerBox?: number;
  suppliers: NuevoProductoProveedor[];
  hasLifecycleReminder?: boolean;
  lifecycleCategory?: string;
  lifecycleReminderWindowDays?: number[];
  requiresSerialNumber?: boolean;
}
