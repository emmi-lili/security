// Types for the Security Management System

export type UserRole = 'admin' | 'supervisor' | 'guard';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  fullName: string;
  email?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  type: string;
  supervisorId: string;
  guardIds: string[];
  accessCode: string;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface Guard extends User {
  role: 'guard';
  locationIds: string[];
  photoUrl?: string;
}

export interface Resident {
  id: string;
  locationId: string;
  tower?: string; // Torre o bloque
  department: string; // Número de departamento/unidad
  residentType: 'propietario' | 'inquilino' | 'familiar' | 'otro';
  fullName: string;
  phone?: string;
  email?: string;
  documentId?: string;
  active: boolean;
  notes?: string;
  createdAt: string;
}

export interface Visitor {
  id: string;
  idCard: string; // Número de carnet/cédula - identificador único del visitante
  name: string;
  documentId: string;
  photoUrl?: string;
  department: string;
  tower?: string; // Torre o bloque
  hostName: string;
  residentId?: string; // ID del residente visitado
  isValidatedDestination: boolean; // Si el departamento tiene residente registrado
  reason: string;
  vehiclePlate?: string;
  vehicleType?: string;
  checkInTime: string;
  checkOutTime?: string;
  guardId: string;
  locationId: string;
  notes?: string;
}

export interface PatrolRoute {
  id: string;
  name: string;
  locationId: string;
  active: boolean;
  createdAt: string;
}

export interface CheckPoint {
  id: string;
  /** Route this checkpoint belongs to. Undefined for legacy checkpoints
   *  created before patrol_routes was introduced (they get auto-migrated
   *  to a "Ronda General" route by the 0006 migration). */
  patrolRouteId?: string;
  name: string;
  locationId: string;
  qrCode: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  active: boolean;
  createdAt: string;
}

export interface PatrolRound {
  id: string;
  guardId: string;
  locationId: string;
  checkPointId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  device?: string;
  notes?: string;
}

export type NovedadTipo =
  | 'incidente'
  | 'mantenimiento'
  | 'paquete'
  | 'emergencia'
  | 'acceso'
  | 'otro';

export type NovedadTurno = 'dia' | 'noche';

export interface Novedad {
  id: string;
  guardName: string;
  turno: NovedadTurno;
  tipo: NovedadTipo;
  ubicacion: string;
  descripcion: string;
  medidasTomadas: string;
  photoUrl?: string;
  createdAt: string;
  guardId: string;
  locationId?: string;
  locationName?: string;
}

export interface DashboardMetrics {
  totalLocations: number;
  totalGuards: number;
  activeGuards: number;
  todayVisitors: number;
  todayRounds: number;
  pendingRounds: number;
  alerts: number;
}