import { toSignal } from '@angular/core/rxjs-interop';
import { Signal, inject } from '@angular/core';
import { ActivatedRoute, Data, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

/**
 * Lee `data['railKey']`/`data['railAccent']` de la ruta hoja activa, re-evaluando en cada
 * navegación. Lo usan los layouts (tenant y admin) para resaltar el ítem activo de su rail.
 * Debe llamarse en contexto de inyección (p. ej. como inicializador de campo de un componente).
 */
export function railDataDeLaHoja(): Signal<Data> {
  const router = inject(Router);
  const route = inject(ActivatedRoute);

  const leer = (): Data => {
    let snapshot = route.snapshot;
    while (snapshot.firstChild) snapshot = snapshot.firstChild;
    return snapshot.data;
  };

  return toSignal(
    router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      map(leer),
      startWith(leer()),
    ),
    { initialValue: {} as Data },
  );
}
