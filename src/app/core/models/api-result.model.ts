/**
 * Sobre de respuesta que envuelve TODAS las respuestas de Circuito.API (ver
 * Circuito.API/src/Circuito.Application/Common/Result.cs). Un fallo de negocio esperado siempre
 * viaja como `success:false` en un status HTTP no-2xx (401/400/403/404/409) — nunca como 200 con
 * `success:false` — así que en el camino feliz `data` siempre viene presente.
 */
export interface ApiResult<T> {
  data: T | null;
  success: boolean;
  message: string | null;
  errors: string[];
}
