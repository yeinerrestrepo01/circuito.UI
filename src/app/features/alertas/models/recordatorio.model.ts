export type EstadoRecordatorio = 'programado' | 'enviado' | 'abierto' | 'interesado' | 'convertido' | 'rebotado';

export interface Recordatorio {
  cliente: string;
  producto: string;
  vehiculo: string;
  vencimiento: string;
  canal: string;
  estado: EstadoRecordatorio;
}

export const ESTADOS_RECORDATORIO: { estado: EstadoRecordatorio; label: string }[] = [
  { estado: 'programado', label: 'Programado' },
  { estado: 'enviado', label: 'Enviado' },
  { estado: 'abierto', label: 'Abierto' },
  { estado: 'interesado', label: 'Interesado' },
  { estado: 'convertido', label: 'Convertido' },
  { estado: 'rebotado', label: 'Rebotado' },
];
