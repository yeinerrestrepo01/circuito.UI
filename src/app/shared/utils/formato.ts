const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const miles = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** 420000 → "$ 420.000" */
export function formatearCop(valor: number): string {
  return cop.format(valor);
}

/** 420000 → "420.000" — igual que formatearCop pero sin el símbolo, para mostrar dentro de un campo
 * editable (ver `MilesInputDirective`): con el "$" adentro del input, seleccionar/borrar todo se
 * siente raro; el símbolo se pone aparte, como prefijo visual del campo. */
export function formatearMiles(valor: number): string {
  return miles.format(valor);
}

/** "420.000" / "420000" / "" → 420000 / 420000 / null — ignora cualquier separador de miles al
 * interpretar lo que la persona escribió, quedándose solo con los dígitos. */
export function parsearMiles(texto: string): number | null {
  const soloDigitos = texto.replace(/\D/g, '');
  return soloDigitos ? Number(soloDigitos) : null;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Hoy", "Ayer", "18 sep" (o "18 sep 2026" si no es del año en curso o con `completa`). */
export function formatearFecha(iso: string, completa = false, ahora = new Date()): string {
  const fecha = new Date(iso);
  if (!completa) {
    if (mismoDia(fecha, ahora)) return 'Hoy';
    const ayer = new Date(ahora);
    ayer.setDate(ayer.getDate() - 1);
    if (mismoDia(fecha, ayer)) return 'Ayer';
  }
  const base = `${fecha.getDate()} ${MESES[fecha.getMonth()]}`;
  return completa || fecha.getFullYear() !== ahora.getFullYear() ? `${base} ${fecha.getFullYear()}` : base;
}
