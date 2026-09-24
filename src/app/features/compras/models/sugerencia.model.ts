/** Espejo de `Circuito.Application.Features.Purchasing.DTOs.PurchaseSuggestionDto`. Calculada al
 * vuelo por el backend a partir del stock real (no hay nada "guardado" hasta generar la orden). */
export interface SugerenciaCompra {
  sku: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  currentStock: number;
  suggestedQuantity: number;
  reason: string;
}

/** Una línea confirmada — espejo de `PurchaseOrderItemInput`. `quantity` es la sugerida o la que la
 * persona haya editado a mano antes de generar la orden; el proveedor lo sigue resolviendo el backend. */
export interface ItemOrdenCompra {
  sku: string;
  quantity: number;
}

/** Espejo de `GeneratePurchaseOrdersCommand`. */
export interface OrdenCompraPayload {
  items: ItemOrdenCompra[];
}

/** Espejo de `PurchaseOrderLineDto`. */
export interface LineaOrdenCompra {
  sku: string;
  productName: string;
  quantity: number;
}

/** Espejo de `PurchaseOrderDto` — una por proveedor: si las sugerencias marcadas son de 2
 * proveedores distintos, `generarOrdenCompra` devuelve 2 de estas. */
export interface OrdenCompra {
  id: string;
  supplierId: string;
  supplierName: string;
  status: 'Pending' | 'Received' | 'Cancelled';
  lines: LineaOrdenCompra[];
  createdAt: string;
}
