/**
 * Mecanismo gratis de envío por WhatsApp — un enlace `wa.me` con el mensaje precargado, NO la API
 * oficial de WhatsApp Business (esa sigue pospuesta, ver memoria del proyecto
 * `facturacion-electronica-y-whatsapp-pendientes.md`). Siempre requiere que una persona toque
 * "Enviar" adentro de WhatsApp — no hay forma de saltarse ese paso sin la API paga.
 */

/** Limpia el número y antepone el indicativo de Colombia (57) si hace falta — wa.me exige el número
 * completo con indicativo de país, sin "+", espacios ni guiones. */
export function normalizarTelefonoWhatsApp(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.startsWith('57') && digitos.length > 10) return digitos;
  if (digitos.length === 10) return `57${digitos}`;
  return digitos; // ya viene con otro indicativo, o un formato inesperado — se manda tal cual.
}

/** Abre WhatsApp (app o web, según el dispositivo) con el mensaje ya escrito — la persona solo tiene
 * que tocar "Enviar". Se abre en una pestaña/ventana nueva, igual criterio que los recibos impresos. */
export function abrirWhatsApp(telefono: string, mensaje: string): void {
  const numero = normalizarTelefonoWhatsApp(telefono);
  if (!numero) return;
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank');
}
