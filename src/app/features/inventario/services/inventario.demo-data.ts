import { MovimientoInventario } from '../models/movimiento.model';
import { Producto } from '../models/producto.model';

/** ISO de "hace N días" a mediodía local, para que `FechaCortaPipe` calcule "Hoy"/"Ayer" en vivo. */
function hace(dias: number): string {
  const fecha = new Date();
  fecha.setHours(12, 0, 0, 0);
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString();
}

/**
 * Catálogo y movimientos de ejemplo del piloto (Auto Eléctrico Leos), con los mismos productos
 * y cifras que aparecen en los mockups de Inventario. Solo se usan en modo demo (sin backend);
 * ver `AuthService.entrarModoDemo` e `InventarioService`.
 */
export function crearProductosDemo(): Producto[] {
  return [
    {
      sku: 'BAT-12V-75AH',
      nombre: 'Batería 12V 75Ah',
      categoria: 'Batería',
      marca: 'Mac',
      ubicacion: 'A-03-02',
      stockActual: 2,
      stockMinimo: 5,
      estado: 'stock-bajo',
      precioVenta: 420000,
      costoCompra: 310000,
      proveedorPrincipal: 'Baterías del Huila',
      vehiculosCompatibles: 7,
    },
    {
      sku: 'ALT-BSH-24',
      nombre: 'Alternador Bosch 24V',
      categoria: 'Alternador',
      marca: 'Bosch',
      ubicacion: 'B-01-05',
      stockActual: 0,
      stockMinimo: 3,
      estado: 'agotado',
      precioVenta: 380000,
      proveedorPrincipal: 'Distribuidora Eléctrica Sur',
      vehiculosCompatibles: 3,
    },
    {
      sku: 'BAT-12V-60AH',
      nombre: 'Batería 12V 60Ah',
      categoria: 'Batería',
      marca: 'Mac',
      ubicacion: 'A-03-04',
      stockActual: 1,
      stockMinimo: 4,
      estado: 'stock-bajo',
      precioVenta: 360000,
      proveedorPrincipal: 'Baterías del Huila',
      vehiculosCompatibles: 5,
    },
    {
      sku: 'MA-DENSO-12',
      nombre: 'Motor de arranque Denso 12V',
      categoria: 'Motor de arranque',
      marca: 'Denso',
      ubicacion: 'A-02-01',
      stockActual: 0,
      stockMinimo: 2,
      estado: 'agotado',
      precioVenta: 310000,
      proveedorPrincipal: 'Distribuidora Eléctrica Sur',
      vehiculosCompatibles: 2,
    },
    {
      sku: 'FIL-OIL-STD',
      nombre: 'Filtro de aceite estándar',
      categoria: 'Filtro',
      marca: 'Mann',
      ubicacion: 'C-01-01',
      stockActual: 18,
      stockMinimo: 10,
      estado: 'disponible',
      precioVenta: 28000,
      proveedorPrincipal: 'Distribuidora Eléctrica Sur',
      vehiculosCompatibles: 12,
    },
    {
      sku: 'PAST-FRE-Z',
      nombre: 'Pastillas de freno Ref Z',
      categoria: 'Otro',
      marca: 'Bosch',
      ubicacion: 'C-02-03',
      stockActual: 6,
      stockMinimo: 4,
      estado: 'disponible',
      precioVenta: 95000,
      proveedorPrincipal: 'Baterías del Huila',
      vehiculosCompatibles: 4,
    },
  ];
}

export function crearMovimientosDemo(): MovimientoInventario[] {
  return [
    { fecha: hace(0), sku: 'BAT-12V-75AH', producto: 'Batería 12V 75Ah', tipo: 'salida', cantidad: 1, motivo: 'Venta', usuario: 'Paola Ríos' },
    { fecha: hace(0), sku: 'ALT-BSH-24', producto: 'Alternador Bosch 24V', tipo: 'entrada', cantidad: 4, motivo: 'Compra a proveedor', usuario: 'Camilo Vega' },
    { fecha: hace(1), sku: 'FIL-OIL-STD', producto: 'Filtro de aceite estándar', tipo: 'ajuste-negativo', cantidad: 2, motivo: 'Conteo físico', usuario: 'Camilo Vega' },
    { fecha: hace(1), sku: 'PAST-FRE-Z', producto: 'Pastillas de freno Ref Z', tipo: 'merma', cantidad: 1, motivo: 'Producto dañado', usuario: 'Yeiner Almario' },
    { fecha: hace(4), sku: 'BAT-12V-60AH', producto: 'Batería 12V 60Ah', tipo: 'entrada', cantidad: 2, motivo: 'Transferencia recibida', usuario: 'Paola Ríos' },
    { fecha: hace(8), sku: 'BAT-12V-75AH', producto: 'Batería 12V 75Ah', tipo: 'entrada', cantidad: 4, motivo: 'Compra a proveedor', usuario: 'Camilo Vega' },
    { fecha: hace(16), sku: 'BAT-12V-75AH', producto: 'Batería 12V 75Ah', tipo: 'salida', cantidad: 1, motivo: 'Venta', usuario: 'Paola Ríos' },
  ];
}
