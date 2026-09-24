/** Un tramo de la miga de pan que vive en `data.breadcrumb` de cada ruta hoja (ver rail-key.util.ts,
 * que ya sigue este mismo patrón para `railKey`/`railAccent`). Sin `link`, es el tramo actual (no clicable). */
export interface BreadcrumbItem {
  label: string;
  link?: string;
}
