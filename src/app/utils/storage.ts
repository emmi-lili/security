import {
  User,
  Location,
  Visitor,
  CheckPoint,
  PatrolRound,
  Resident,
} from '../types';

// =============================================================
// localStorage cache (also doubles as the data backend in demo mode)
// Plain key/value layer used by AppContext to:
//   - hydrate state instantaneously on mount before Supabase responds
//   - keep last-known state when offline
//   - persist the current session user
//   - serve as the *only* backend when no Supabase credentials are set
// =============================================================

export const CACHE_KEYS = {
  USERS: 'security_app_users',
  LOCATIONS: 'security_app_locations',
  VISITORS: 'security_app_visitors',
  CHECKPOINTS: 'security_app_checkpoints',
  PATROL_ROUNDS: 'security_app_patrol_rounds',
  RESIDENTS: 'security_app_residents',
  CURRENT_USER: 'security_app_current_user',
  PENDING_WRITES: 'security_app_pending_writes',
} as const;

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS];

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function readCache<T>(key: CacheKey, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeCache<T>(key: CacheKey, value: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded / private mode: silently ignore.
  }
}

export function clearCache(key: CacheKey): void {
  if (!isBrowser()) return;
  localStorage.removeItem(key);
}

// -------------------------------------------------------------
// Session helpers
// -------------------------------------------------------------

export function getCurrentUser(): User | null {
  return readCache<User | null>(CACHE_KEYS.CURRENT_USER, null);
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    writeCache(CACHE_KEYS.CURRENT_USER, user);
  } else {
    clearCache(CACHE_KEYS.CURRENT_USER);
  }
}

// -------------------------------------------------------------
// Demo seed
// -------------------------------------------------------------

const NOW = () => new Date().toISOString();

const SEED_USERS: User[] = [
  {
    id: 'u-admin',
    username: 'admin',
    password: '',
    role: 'admin',
    fullName: 'Administrador',
    email: 'admin@sevigpro.local',
    active: true,
    createdAt: NOW(),
  },
  {
    id: 'u-sup1',
    username: 'supervisor1',
    password: '',
    role: 'supervisor',
    fullName: 'Supervisor 1',
    active: true,
    createdAt: NOW(),
  },
  {
    id: 'u-g1',
    username: 'guard001',
    password: '',
    role: 'guard',
    fullName: 'Guardia 001',
    active: true,
    createdAt: NOW(),
  },
  {
    id: 'u-g2',
    username: 'guard002',
    password: '',
    role: 'guard',
    fullName: 'Guardia 002',
    active: true,
    createdAt: NOW(),
  },
];

// When Supabase is configured we MUST NOT seed the local demo users, because
// they'd collide with the real ones in the DB (different IDs => FK violations
// when those IDs end up in `supervisor_id` / `guard_ids`).
export function initializeStorage(opts?: { skipUserSeed?: boolean }): void {
  if (!isBrowser()) return;
  if (localStorage.getItem(CACHE_KEYS.USERS) === null) {
    writeCache(CACHE_KEYS.USERS, opts?.skipUserSeed ? [] : SEED_USERS);
  }
  if (localStorage.getItem(CACHE_KEYS.LOCATIONS) === null) {
    writeCache<Location[]>(CACHE_KEYS.LOCATIONS, []);
  }
  if (localStorage.getItem(CACHE_KEYS.VISITORS) === null) {
    writeCache<Visitor[]>(CACHE_KEYS.VISITORS, []);
  }
  if (localStorage.getItem(CACHE_KEYS.CHECKPOINTS) === null) {
    writeCache<CheckPoint[]>(CACHE_KEYS.CHECKPOINTS, []);
  }
  if (localStorage.getItem(CACHE_KEYS.PATROL_ROUNDS) === null) {
    writeCache<PatrolRound[]>(CACHE_KEYS.PATROL_ROUNDS, []);
  }
  if (localStorage.getItem(CACHE_KEYS.RESIDENTS) === null) {
    writeCache<Resident[]>(CACHE_KEYS.RESIDENTS, []);
  }
}

// Wipes any stale users cache when Supabase is configured but the local users
// have IDs that don't exist in the DB (e.g. left over from a previous demo
// session). The hydrate that runs right after will repopulate from Supabase.
export function purgeStaleDemoUsers(): void {
  if (!isBrowser()) return;
  const users = getUsers();
  if (users.length === 0) return;
  const hasDemoIds = users.some((u) => u.id.startsWith('u-'));
  if (hasDemoIds) {
    writeCache<User[]>(CACHE_KEYS.USERS, []);
    // The current session may also point to a demo user that no longer
    // exists; clear it so the user is forced to re-login against Supabase.
    setCurrentUser(null);
  }
}

// -------------------------------------------------------------
// Users
// -------------------------------------------------------------

export function getUsers(): User[] {
  return readCache<User[]>(CACHE_KEYS.USERS, []);
}

export function addUser(user: User): void {
  const items = getUsers();
  items.push(user);
  writeCache(CACHE_KEYS.USERS, items);
}

export function updateUser(userId: string, updates: Partial<User>): void {
  const items = getUsers().map((u) => (u.id === userId ? { ...u, ...updates } : u));
  writeCache(CACHE_KEYS.USERS, items);
  const current = getCurrentUser();
  if (current && current.id === userId) {
    setCurrentUser({ ...current, ...updates });
  }
}

export function removeUser(userId: string): void {
  writeCache(
    CACHE_KEYS.USERS,
    getUsers().filter((u) => u.id !== userId)
  );
  const current = getCurrentUser();
  if (current?.id === userId) {
    setCurrentUser(null);
  }
}

// -------------------------------------------------------------
// Auth (demo: any password works for an active user)
// -------------------------------------------------------------

export function login(username: string, _password: string): User | null {
  const user = getUsers().find((u) => u.username === username && u.active);
  if (user) {
    setCurrentUser(user);
    return user;
  }
  return null;
}

export function logout(): void {
  setCurrentUser(null);
}

// -------------------------------------------------------------
// Locations
// -------------------------------------------------------------

export function getLocations(): Location[] {
  return readCache<Location[]>(CACHE_KEYS.LOCATIONS, []);
}

export function addLocation(location: Location): void {
  const items = getLocations();
  items.push(location);
  writeCache(CACHE_KEYS.LOCATIONS, items);
}

export function updateLocation(locationId: string, updates: Partial<Location>): void {
  const items = getLocations().map((l) =>
    l.id === locationId ? { ...l, ...updates } : l
  );
  writeCache(CACHE_KEYS.LOCATIONS, items);
}

export function removeLocation(locationId: string): void {
  const items = getLocations().filter((l) => l.id !== locationId);
  writeCache(CACHE_KEYS.LOCATIONS, items);
}

// -------------------------------------------------------------
// Visitors
// -------------------------------------------------------------

export function getVisitors(): Visitor[] {
  return readCache<Visitor[]>(CACHE_KEYS.VISITORS, []);
}

export function addVisitor(visitor: Visitor): void {
  const items = getVisitors();
  items.push(visitor);
  writeCache(CACHE_KEYS.VISITORS, items);
}

export function updateVisitor(visitorId: string, updates: Partial<Visitor>): void {
  const items = getVisitors().map((v) =>
    v.id === visitorId ? { ...v, ...updates } : v
  );
  writeCache(CACHE_KEYS.VISITORS, items);
}

export function findVisitorByIdCard(idCard: string): Visitor | null {
  return (
    getVisitors().find((v) => v.idCard === idCard && !v.checkOutTime) ?? null
  );
}

export function getVisitorHistory(idCard: string): Visitor[] {
  return getVisitors()
    .filter((v) => v.idCard === idCard)
    .sort((a, b) => b.checkInTime.localeCompare(a.checkInTime));
}

// -------------------------------------------------------------
// CheckPoints
// -------------------------------------------------------------

export function getCheckPoints(): CheckPoint[] {
  return readCache<CheckPoint[]>(CACHE_KEYS.CHECKPOINTS, []);
}

export function addCheckPoint(checkPoint: CheckPoint): void {
  const items = getCheckPoints();
  items.push(checkPoint);
  writeCache(CACHE_KEYS.CHECKPOINTS, items);
}

export function updateCheckPoint(
  checkPointId: string,
  updates: Partial<CheckPoint>
): void {
  const items = getCheckPoints().map((c) =>
    c.id === checkPointId ? { ...c, ...updates } : c
  );
  writeCache(CACHE_KEYS.CHECKPOINTS, items);
}

// -------------------------------------------------------------
// Patrol rounds
// -------------------------------------------------------------

export function getPatrolRounds(): PatrolRound[] {
  return readCache<PatrolRound[]>(CACHE_KEYS.PATROL_ROUNDS, []);
}

export function addPatrolRound(round: PatrolRound): void {
  const items = getPatrolRounds();
  items.push(round);
  writeCache(CACHE_KEYS.PATROL_ROUNDS, items);
}

// -------------------------------------------------------------
// Residents
// -------------------------------------------------------------

export function getResidents(): Resident[] {
  return readCache<Resident[]>(CACHE_KEYS.RESIDENTS, []);
}

export function addResident(resident: Resident): void {
  const items = getResidents();
  items.push(resident);
  writeCache(CACHE_KEYS.RESIDENTS, items);
}

export function updateResident(residentId: string, updates: Partial<Resident>): void {
  const items = getResidents().map((r) =>
    r.id === residentId ? { ...r, ...updates } : r
  );
  writeCache(CACHE_KEYS.RESIDENTS, items);
}

export function findResidentByDepartment(
  locationId: string,
  department: string,
  tower?: string
): Resident | null {
  return (
    getResidents().find(
      (r) =>
        r.locationId === locationId &&
        r.department === department &&
        (tower ? r.tower === tower : true) &&
        r.active
    ) ?? null
  );
}

// -------------------------------------------------------------
// Bulk replace helpers (used by Supabase hydration in AppContext)
// -------------------------------------------------------------

export function setUsers(users: User[]): void {
  writeCache(CACHE_KEYS.USERS, users);
}
export function setLocations(items: Location[]): void {
  writeCache(CACHE_KEYS.LOCATIONS, items);
}
export function setVisitors(items: Visitor[]): void {
  writeCache(CACHE_KEYS.VISITORS, items);
}
export function setCheckPoints(items: CheckPoint[]): void {
  writeCache(CACHE_KEYS.CHECKPOINTS, items);
}
export function setPatrolRounds(items: PatrolRound[]): void {
  writeCache(CACHE_KEYS.PATROL_ROUNDS, items);
}
export function setResidents(items: Resident[]): void {
  writeCache(CACHE_KEYS.RESIDENTS, items);
}
