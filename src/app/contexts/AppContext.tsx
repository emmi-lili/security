import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from 'react';
import {
  User,
  Location,
  Visitor,
  CheckPoint,
  PatrolRound,
  PatrolRoute,
  Resident,
} from '../types';
import * as storage from '../utils/storage';
import * as api from '../utils/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  enqueue,
  initOnlineListener,
  flush,
  subscribe as subscribeQueue,
} from '../utils/offlineQueue';
import { isDataUrl, uploadVisitorPhoto } from '../utils/photoUpload';

export type SyncStatus =
  | 'disabled' // Supabase not configured on this device → localStorage-only mode
  | 'loading'  // hydration in flight
  | 'ready'    // last hydration succeeded
  | 'error';   // last hydration failed (network / RLS / schema mismatch)

interface AppContextType {
  currentUser: User | null;
  users: User[];
  locations: Location[];
  visitors: Visitor[];
  checkPoints: CheckPoint[];
  patrolRounds: PatrolRound[];
  patrolRoutes: PatrolRoute[];
  residents: Resident[];
  isSupabaseEnabled: boolean;
  syncStatus: SyncStatus;
  lastSyncAt: Date | null;
  pendingWrites: number;
  syncError: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  addLocation: (location: Location) => void;
  updateLocation: (locationId: string, updates: Partial<Location>) => void;
  removeLocation: (locationId: string) => void;
  addUser: (user: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  removeUser: (userId: string) => void;
  addVisitor: (visitor: Visitor) => void;
  updateVisitor: (visitorId: string, updates: Partial<Visitor>) => void;
  findVisitorProfile: (idCard: string, locationId: string) => Visitor | null;
  findVisitorByIdCard: (idCard: string, locationId?: string) => Visitor | null;
  getVisitorHistory: (idCard: string) => Visitor[];
  addCheckPoint: (checkPoint: CheckPoint) => void;
  updateCheckPoint: (checkPointId: string, updates: Partial<CheckPoint>) => void;
  addPatrolRound: (round: PatrolRound) => void;
  addPatrolRoute: (route: PatrolRoute) => void;
  updatePatrolRoute: (routeId: string, updates: Partial<PatrolRoute>) => void;
  addResident: (resident: Resident) => void;
  updateResident: (residentId: string, updates: Partial<Resident>) => void;
  findResidentByDepartment: (
    locationId: string,
    department: string,
    tower?: string
  ) => Resident | null;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function isNotConfigured(err: unknown): boolean {
  return api.isNotConfiguredError(err);
}

function warn(scope: string, err: unknown): void {
  if (isNotConfigured(err)) return;
  // eslint-disable-next-line no-console
  console.warn(`[supabase:${scope}]`, err);
}

// Wraps a Supabase write so that any failure is logged and queued for retry.
// We never let the promise reject — UI feedback comes from the cached state
// being updated immediately.
async function safeWrite(
  scope: string,
  fn: () => Promise<void>,
  fallbackEnqueue?: () => void
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (!isNotConfigured(err)) {
      warn(scope, err);
      fallbackEnqueue?.();
    }
  }
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [checkPoints, setCheckPoints] = useState<CheckPoint[]>([]);
  const [patrolRounds, setPatrolRounds] = useState<PatrolRound[]>([]);
  const [patrolRoutes, setPatrolRoutes] = useState<PatrolRoute[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    isSupabaseConfigured ? 'loading' : 'disabled'
  );
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [pendingWrites, setPendingWrites] = useState<number>(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const realtimeUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    storage.initializeStorage({ skipUserSeed: isSupabaseConfigured });
    if (isSupabaseConfigured) {
      storage.purgeStaleDemoUsers();
    }
    loadFromCache();

    let onlineUnsub: (() => void) | null = null;

    if (isSupabaseConfigured) {
      // eslint-disable-next-line no-console
      console.info(
        '[sync] Supabase configurado — hidratando datos desde la base…'
      );
      void hydrateFromSupabase();
      onlineUnsub = initOnlineListener();
      realtimeUnsub.current = subscribeRealtime();
    } else {
      // Loud warning so any device running without env vars is obvious in
      // DevTools — the visible UI badge in AdminLayout reinforces this.
      // eslint-disable-next-line no-console
      console.error(
        '[sync] ESTE DISPOSITIVO ESTÁ EN MODO LOCAL (sin Supabase).\n' +
          'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
          'Cualquier lugar/visita/ronda que crees aquí se guarda SOLO en este ' +
          'navegador y no se verá desde otros dispositivos.'
      );
    }

    const unsubQueue = subscribeQueue((count) => setPendingWrites(count));

    return () => {
      onlineUnsub?.();
      realtimeUnsub.current?.();
      unsubQueue();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFromCache = () => {
    setCurrentUser(storage.getCurrentUser());
    setUsers(storage.getUsers());
    setLocations(storage.getLocations());
    setVisitors(storage.getVisitors());
    setCheckPoints(storage.getCheckPoints());
    setPatrolRounds(storage.getPatrolRounds());
    setPatrolRoutes(storage.getPatrolRoutes());
    setResidents(storage.getResidents());
  };

  // ---------------------------------------------------------------
  // Supabase hydration
  // ---------------------------------------------------------------

  const hydrateFromSupabase = async () => {
    setSyncStatus('loading');
    setSyncError(null);

    const failures: string[] = [];
    const record = (scope: string) => (e: unknown) => {
      warn(scope, e);
      if (!isNotConfigured(e)) {
        failures.push(
          `${scope}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
      return null as unknown;
    };

    const [u, l, v, c, p, pr, r] = (await Promise.all([
      api.users.getAll().catch(record('users')),
      api.locations.getAll().catch(record('locations')),
      api.visitors.getAll().catch(record('visitors')),
      api.checkpoints.getAll().catch(record('checkpoints')),
      api.patrolRounds.getAll().catch(record('patrolRounds')),
      api.patrolRoutes.getAll().catch(record('patrolRoutes')),
      api.residents.getAll().catch(record('residents')),
    ])) as [
      User[] | null,
      Location[] | null,
      Visitor[] | null,
      CheckPoint[] | null,
      PatrolRound[] | null,
      PatrolRoute[] | null,
      Resident[] | null
    ];

    if (u) {
      storage.setUsers(u);
      setUsers(u);
    }
    if (l) {
      storage.setLocations(l);
      setLocations(l);
    }
    if (v) {
      storage.setVisitors(v);
      setVisitors(v);
    }
    if (c) {
      storage.setCheckPoints(c);
      setCheckPoints(c);
    }
    if (p) {
      storage.setPatrolRounds(p);
      setPatrolRounds(p);
    }
    if (pr) {
      storage.setPatrolRoutes(pr);
      setPatrolRoutes(pr);
    }
    if (r) {
      storage.setResidents(r);
      setResidents(r);
    }

    if (failures.length > 0) {
      setSyncStatus('error');
      setSyncError(failures.join(' | '));
      // eslint-disable-next-line no-console
      console.error('[sync] Hidratación con errores:', failures);
    } else {
      setSyncStatus('ready');
      setLastSyncAt(new Date());
      // eslint-disable-next-line no-console
      console.info(
        `[sync] Datos sincronizados con Supabase — ${l?.length ?? 0} lugares, ${
          u?.length ?? 0
        } usuarios.`
      );
    }
  };

  // ---------------------------------------------------------------
  // Realtime — keeps the Dashboard and Reports live without polling
  // ---------------------------------------------------------------

  const subscribeRealtime = (): (() => void) => {
    if (!supabase) return () => {};
    const channel = supabase
      .channel('sevigpro-app')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitors' },
        () => {
          api.visitors
            .getAll()
            .then((rows) => {
              storage.setVisitors(rows);
              setVisitors(rows);
            })
            .catch((e) => warn('rt:visitors', e));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patrol_rounds' },
        () => {
          api.patrolRounds
            .getAll()
            .then((rows) => {
              storage.setPatrolRounds(rows);
              setPatrolRounds(rows);
            })
            .catch((e) => warn('rt:patrolRounds', e));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // ---------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------

  const login = async (username: string, password: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      try {
        const remote = await api.users.verify(username, password);
        if (remote) {
          storage.setCurrentUser(remote);
          setCurrentUser(remote);
          return true;
        }
        return false;
      } catch (err) {
        warn('login', err);
        // fall through to local for offline support
      }
    }
    const user = storage.login(username, password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    storage.logout();
    setCurrentUser(null);
  };

  // ---------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------

  const addUser = (user: User) => {
    storage.addUser(user);
    setUsers(storage.getUsers());
    if (!isSupabaseConfigured) return;

    void safeWrite(
      'addUser',
      () => api.users.insert(user, user.password || undefined),
      () =>
        enqueue({
          kind: 'insert',
          table: 'users',
          payload: { ...user, plainPassword: user.password || undefined },
        })
    );
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    storage.updateUser(userId, updates);
    setUsers(storage.getUsers());
    if (currentUser && currentUser.id === userId) {
      setCurrentUser({ ...currentUser, ...updates });
    }
    if (!isSupabaseConfigured) return;

    const { password, ...rest } = updates;
    void safeWrite(
      'updateUser',
      async () => {
        if (Object.keys(rest).length > 0) {
          await api.users.update(userId, rest);
        }
        if (password) {
          await api.users.upsertPassword(userId, password);
        }
      },
      () =>
        enqueue({
          kind: 'update',
          table: 'users',
          id: userId,
          payload: { ...rest, plainPassword: password || undefined },
        })
    );
  };

  const removeUser = (userId: string) => {
    storage.removeUser(userId);
    const locs = storage.getLocations().map((l) => ({
      ...l,
      guardIds: l.guardIds.filter((gid) => gid !== userId),
    }));
    storage.setLocations(locs);
    setUsers(storage.getUsers());
    setLocations(locs);
    if (currentUser?.id === userId) {
      setCurrentUser(null);
    }
    if (!isSupabaseConfigured) return;
    void safeWrite(
      'removeUser',
      () => api.users.remove(userId),
      () => enqueue({ kind: 'delete', table: 'users', id: userId })
    );
  };

  // ---------------------------------------------------------------
  // Locations
  // ---------------------------------------------------------------

  const addLocation = (location: Location) => {
    storage.addLocation(location);
    setLocations(storage.getLocations());
    if (!isSupabaseConfigured) return;
    void safeWrite(
      'addLocation',
      () => api.locations.insert(location),
      () => enqueue({ kind: 'insert', table: 'locations', payload: location })
    );
  };

  const updateLocation = (locationId: string, updates: Partial<Location>) => {
    storage.updateLocation(locationId, updates);
    setLocations(storage.getLocations());
    if (!isSupabaseConfigured) return;
    void safeWrite(
      'updateLocation',
      () => api.locations.update(locationId, updates),
      () =>
        enqueue({
          kind: 'update',
          table: 'locations',
          id: locationId,
          payload: updates,
        })
    );
  };

  const removeLocation = (locationId: string) => {
    storage.removeLocation(locationId);
    setLocations(storage.getLocations());
    if (!isSupabaseConfigured) return;
    void safeWrite(
      'removeLocation',
      () => api.locations.remove(locationId),
      () => enqueue({ kind: 'delete', table: 'locations', id: locationId })
    );
  };

  // ---------------------------------------------------------------
  // Visitors (with photo upload pipeline)
  // ---------------------------------------------------------------

  const addVisitor = (visitor: Visitor) => {
    storage.addVisitor(visitor);
    setVisitors(storage.getVisitors());
    if (!isSupabaseConfigured) return;

    void (async () => {
      // 1) Insert without the base64 photo (keep payload small).
      const photoSrc = visitor.photoUrl;
      const insertPayload: Visitor = isDataUrl(photoSrc)
        ? { ...visitor, photoUrl: undefined }
        : visitor;

      await safeWrite(
        'addVisitor',
        () => api.visitors.insert(insertPayload),
        () =>
          enqueue({
            kind: 'insert',
            table: 'visitors',
            payload: insertPayload,
          })
      );

      // 2) Upload the photo separately, then patch photoUrl.
      if (isDataUrl(photoSrc)) {
        try {
          const url = await uploadVisitorPhoto(visitor.id, photoSrc as string);
          await api.visitors.update(visitor.id, { photoUrl: url });
          storage.updateVisitor(visitor.id, { photoUrl: url });
          setVisitors(storage.getVisitors());
        } catch (err) {
          warn('uploadVisitorPhoto', err);
          enqueue({
            kind: 'upload_photo',
            visitorId: visitor.id,
            dataUrl: photoSrc as string,
          });
        }
      }
    })();
  };

  const updateVisitor = (visitorId: string, updates: Partial<Visitor>) => {
    storage.updateVisitor(visitorId, updates);
    setVisitors(storage.getVisitors());
    if (!isSupabaseConfigured) return;

    void (async () => {
      const photo = updates.photoUrl;
      const rest = { ...updates };
      if (isDataUrl(photo)) {
        delete rest.photoUrl;
      }

      if (Object.keys(rest).length > 0) {
        await safeWrite(
          'updateVisitor',
          () => api.visitors.update(visitorId, rest),
          () =>
            enqueue({
              kind: 'update',
              table: 'visitors',
              id: visitorId,
              payload: rest,
            })
        );
      }

      if (isDataUrl(photo)) {
        try {
          const url = await uploadVisitorPhoto(visitorId, photo as string);
          await api.visitors.update(visitorId, { photoUrl: url });
          storage.updateVisitor(visitorId, { photoUrl: url });
          setVisitors(storage.getVisitors());
        } catch (err) {
          warn('uploadVisitorPhoto', err);
          enqueue({
            kind: 'upload_photo',
            visitorId,
            dataUrl: photo as string,
          });
        }
      }
    })();
  };

  const findVisitorProfile = (idCard: string, locationId: string): Visitor | null =>
    storage.findVisitorProfile(idCard, locationId);

  const findVisitorByIdCard = (idCard: string, locationId?: string): Visitor | null =>
    storage.findVisitorByIdCard(idCard, locationId);

  const getVisitorHistory = (idCard: string): Visitor[] =>
    storage.getVisitorHistory(idCard);

  // ---------------------------------------------------------------
  // CheckPoints
  // ---------------------------------------------------------------

  const addCheckPoint = (checkPoint: CheckPoint) => {
    storage.addCheckPoint(checkPoint);
    setCheckPoints(storage.getCheckPoints());
    if (!isSupabaseConfigured) return;
    void safeWrite(
      'addCheckPoint',
      () => api.checkpoints.insert(checkPoint),
      () => enqueue({ kind: 'insert', table: 'checkpoints', payload: checkPoint })
    );
  };

  const updateCheckPoint = (
    checkPointId: string,
    updates: Partial<CheckPoint>
  ) => {
    storage.updateCheckPoint(checkPointId, updates);
    setCheckPoints(storage.getCheckPoints());
    if (!isSupabaseConfigured) return;
    void safeWrite(
      'updateCheckPoint',
      () => api.checkpoints.update(checkPointId, updates),
      () =>
        enqueue({
          kind: 'update',
          table: 'checkpoints',
          id: checkPointId,
          payload: updates,
        })
    );
  };

  // ---------------------------------------------------------------
  // Patrol rounds
  // ---------------------------------------------------------------

  const addPatrolRound = (round: PatrolRound) => {
    storage.addPatrolRound(round);
    setPatrolRounds(storage.getPatrolRounds());
    if (!isSupabaseConfigured) return;
    void safeWrite(
      'addPatrolRound',
      () => api.patrolRounds.insert(round),
      () => enqueue({ kind: 'insert', table: 'patrolRounds', payload: round })
    );
  };

  // ---------------------------------------------------------------
  // Patrol routes
  // ---------------------------------------------------------------

  const addPatrolRoute = (route: PatrolRoute) => {
    storage.addPatrolRoute(route);
    setPatrolRoutes(storage.getPatrolRoutes());
    if (!isSupabaseConfigured) return;
    void safeWrite(
      'addPatrolRoute',
      () => api.patrolRoutes.insert(route),
      () => enqueue({ kind: 'insert', table: 'patrol_routes', payload: route })
    );
  };

  const updatePatrolRoute = (routeId: string, updates: Partial<PatrolRoute>) => {
    storage.updatePatrolRoute(routeId, updates);
    setPatrolRoutes(storage.getPatrolRoutes());
    if (!isSupabaseConfigured) return;
    void safeWrite(
      'updatePatrolRoute',
      () => api.patrolRoutes.update(routeId, updates),
      () =>
        enqueue({
          kind: 'update',
          table: 'patrol_routes',
          id: routeId,
          payload: updates,
        })
    );
  };

  // ---------------------------------------------------------------
  // Residents
  // ---------------------------------------------------------------

  const addResident = (resident: Resident) => {
    storage.addResident(resident);
    setResidents(storage.getResidents());
    if (!isSupabaseConfigured) return;
    void safeWrite(
      'addResident',
      () => api.residents.insert(resident),
      () => enqueue({ kind: 'insert', table: 'residents', payload: resident })
    );
  };

  const updateResident = (residentId: string, updates: Partial<Resident>) => {
    storage.updateResident(residentId, updates);
    setResidents(storage.getResidents());
    if (!isSupabaseConfigured) return;
    void safeWrite(
      'updateResident',
      () => api.residents.update(residentId, updates),
      () =>
        enqueue({
          kind: 'update',
          table: 'residents',
          id: residentId,
          payload: updates,
        })
    );
  };

  const findResidentByDepartment = (
    locationId: string,
    department: string,
    tower?: string
  ): Resident | null =>
    storage.findResidentByDepartment(locationId, department, tower);

  // ---------------------------------------------------------------

  const refreshData = async () => {
    loadFromCache();
    if (isSupabaseConfigured) {
      await Promise.all([hydrateFromSupabase(), flush()]);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        locations,
        visitors,
        checkPoints,
        patrolRounds,
        patrolRoutes,
        residents,
        isSupabaseEnabled: isSupabaseConfigured,
        syncStatus,
        lastSyncAt,
        pendingWrites,
        syncError,
        login,
        logout,
        addLocation,
        updateLocation,
        removeLocation,
        addUser,
        updateUser,
        removeUser,
        addVisitor,
        updateVisitor,
        findVisitorProfile,
        findVisitorByIdCard,
        getVisitorHistory,
        addCheckPoint,
        updateCheckPoint,
        addPatrolRound,
        addPatrolRoute,
        updatePatrolRoute,
        addResident,
        updateResident,
        findResidentByDepartment,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
