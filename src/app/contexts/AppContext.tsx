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
  Resident,
} from '../types';
import * as storage from '../utils/storage';
import * as api from '../utils/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { enqueue, initOnlineListener, flush } from '../utils/offlineQueue';
import { isDataUrl, uploadVisitorPhoto } from '../utils/photoUpload';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  locations: Location[];
  visitors: Visitor[];
  checkPoints: CheckPoint[];
  patrolRounds: PatrolRound[];
  residents: Resident[];
  isSupabaseEnabled: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  addLocation: (location: Location) => void;
  updateLocation: (locationId: string, updates: Partial<Location>) => void;
  addUser: (user: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  addVisitor: (visitor: Visitor) => void;
  updateVisitor: (visitorId: string, updates: Partial<Visitor>) => void;
  findVisitorByIdCard: (idCard: string) => Visitor | null;
  getVisitorHistory: (idCard: string) => Visitor[];
  addCheckPoint: (checkPoint: CheckPoint) => void;
  updateCheckPoint: (checkPointId: string, updates: Partial<CheckPoint>) => void;
  addPatrolRound: (round: PatrolRound) => void;
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
  const [residents, setResidents] = useState<Resident[]>([]);
  const realtimeUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    storage.initializeStorage({ skipUserSeed: isSupabaseConfigured });
    if (isSupabaseConfigured) {
      storage.purgeStaleDemoUsers();
    }
    loadFromCache();

    let onlineUnsub: (() => void) | null = null;

    if (isSupabaseConfigured) {
      void hydrateFromSupabase();
      onlineUnsub = initOnlineListener();
      realtimeUnsub.current = subscribeRealtime();
    }

    return () => {
      onlineUnsub?.();
      realtimeUnsub.current?.();
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
    setResidents(storage.getResidents());
  };

  // ---------------------------------------------------------------
  // Supabase hydration
  // ---------------------------------------------------------------

  const hydrateFromSupabase = async () => {
    const [u, l, v, c, p, r] = await Promise.all([
      api.users.getAll().catch((e) => (warn('users', e), null)),
      api.locations.getAll().catch((e) => (warn('locations', e), null)),
      api.visitors.getAll().catch((e) => (warn('visitors', e), null)),
      api.checkpoints.getAll().catch((e) => (warn('checkpoints', e), null)),
      api.patrolRounds.getAll().catch((e) => (warn('patrolRounds', e), null)),
      api.residents.getAll().catch((e) => (warn('residents', e), null)),
    ]);

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
    if (r) {
      storage.setResidents(r);
      setResidents(r);
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

  const findVisitorByIdCard = (idCard: string): Visitor | null =>
    storage.findVisitorByIdCard(idCard);

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
        residents,
        isSupabaseEnabled: isSupabaseConfigured,
        login,
        logout,
        addLocation,
        updateLocation,
        addUser,
        updateUser,
        addVisitor,
        updateVisitor,
        findVisitorByIdCard,
        getVisitorHistory,
        addCheckPoint,
        updateCheckPoint,
        addPatrolRound,
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
