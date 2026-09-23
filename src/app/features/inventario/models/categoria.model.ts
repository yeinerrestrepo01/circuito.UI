/** Espejo de `Circuito.Application.Features.Categories.DTOs.CategoryDto`. */
export interface Categoria {
  id: string;
  name: string;
}

/** Espejo de `CreateCategoryCommand`. */
export interface NuevaCategoriaPayload {
  name: string;
}
