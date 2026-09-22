import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../../../core/config/api-url.token';
import { Recordatorio } from '../models/recordatorio.model';

/** Recordatorios de vida útil enviados por correo (canal único del piloto). */
@Injectable({ providedIn: 'root' })
export class AlertasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${inject(API_URL)}/alertas`;

  private readonly _recordatorios = signal<Recordatorio[]>([]);
  readonly recordatorios = this._recordatorios.asReadonly();

  cargarRecordatorios(): Observable<Recordatorio[]> {
    return this.http
      .get<Recordatorio[]>(`${this.apiUrl}/recordatorios`)
      .pipe(tap((recordatorios) => this._recordatorios.set(recordatorios)));
  }
}
