import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Location, Visitor, CheckPoint, PatrolRound, Resident } from '../types';
import * as storage from '../utils/storage';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  locations: Location[];
  visitors: Visitor[];
  checkPoints: CheckPoint[];
  patrolRounds: PatrolRound[];
  residents: Resident[];
  login: (username: string, password: string) => boolean;
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
  findResidentByDepartment: (locationId: string, department: string, tower?: string) => Resident | null;
  refreshData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [checkPoints, setCheckPoints] = useState<CheckPoint[]>([]);
  const [patrolRounds, setPatrolRounds] = useState<PatrolRound[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);

  useEffect(() => {
    storage.initializeStorage();
    loadData();
  }, []);

  const loadData = () => {
    setCurrentUser(storage.getCurrentUser());
    setUsers(storage.getUsers());
    setLocations(storage.getLocations());
    setVisitors(storage.getVisitors());
    setCheckPoints(storage.getCheckPoints());
    setPatrolRounds(storage.getPatrolRounds());
    setResidents(storage.getResidents());
  };

  const login = (username: string, password: string): boolean => {
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

  const addLocation = (location: Location) => {
    storage.addLocation(location);
    setLocations(storage.getLocations());
  };

  const updateLocation = (locationId: string, updates: Partial<Location>) => {
    storage.updateLocation(locationId, updates);
    setLocations(storage.getLocations());
  };

  const addUser = (user: User) => {
    storage.addUser(user);
    setUsers(storage.getUsers());
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    storage.updateUser(userId, updates);
    setUsers(storage.getUsers());
  };

  const addVisitor = (visitor: Visitor) => {
    storage.addVisitor(visitor);
    setVisitors(storage.getVisitors());
  };

  const updateVisitor = (visitorId: string, updates: Partial<Visitor>) => {
    storage.updateVisitor(visitorId, updates);
    setVisitors(storage.getVisitors());
  };

  const findVisitorByIdCard = (idCard: string): Visitor | null => {
    return storage.findVisitorByIdCard(idCard);
  };

  const getVisitorHistory = (idCard: string): Visitor[] => {
    return storage.getVisitorHistory(idCard);
  };

  const addCheckPoint = (checkPoint: CheckPoint) => {
    storage.addCheckPoint(checkPoint);
    setCheckPoints(storage.getCheckPoints());
  };

  const updateCheckPoint = (checkPointId: string, updates: Partial<CheckPoint>) => {
    storage.updateCheckPoint(checkPointId, updates);
    setCheckPoints(storage.getCheckPoints());
  };

  const addPatrolRound = (round: PatrolRound) => {
    storage.addPatrolRound(round);
    setPatrolRounds(storage.getPatrolRounds());
  };

  const addResident = (resident: Resident) => {
    storage.addResident(resident);
    setResidents(storage.getResidents());
  };

  const updateResident = (residentId: string, updates: Partial<Resident>) => {
    storage.updateResident(residentId, updates);
    setResidents(storage.getResidents());
  };

  const findResidentByDepartment = (locationId: string, department: string, tower?: string): Resident | null => {
    return storage.findResidentByDepartment(locationId, department, tower);
  };

  const refreshData = () => {
    loadData();
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