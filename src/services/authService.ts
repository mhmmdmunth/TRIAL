import { UserProfile } from '../types';

export const DEFAULT_SHIPYARD_USERS: UserProfile[] = [
  {
    id: 'user-ppc-1',
    username: 'munthaha',
    name: 'Muhammad Munthaha',
    title: 'PPC Engineer & Estimator',
    role: 'PPC',
    department: 'Planning & Production Control (PPC)',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    initials: 'MM',
  },
  {
    id: 'user-pimpro-1',
    username: 'fadel',
    name: 'Muhammad Fadel R',
    title: 'Project Leader / Pimpro',
    role: 'Project Leader',
    department: 'Docking & Project Management',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    initials: 'MF',
  },
  {
    id: 'user-owner-1',
    username: 'hendra',
    name: 'Capt. Hendra Gunawan',
    title: 'Owner Representative',
    role: 'Owner Representative',
    department: 'PT. Pelayaran Kartika Samudra Adijaya',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
    initials: 'HG',
  },
  {
    id: 'user-bki-1',
    username: 'bambang',
    name: 'Ir. Bambang Suprayitno, ST',
    title: 'Senior Marine Surveyor',
    role: 'BKI Surveyor',
    department: 'Biro Klasifikasi Indonesia (BKI)',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
    initials: 'BS',
  },
  {
    id: 'user-mgr-1',
    username: 'suryadi',
    name: 'Ir. H. Suryadi, MM',
    title: 'Yard Production General Manager',
    role: 'Yard Manager',
    department: 'Shipyard Operations & Graving Dock',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&q=80',
    initials: 'HS',
  },
];

const AUTH_STORAGE_KEY = 'shipyard_auth_session_v1';
const USERS_STORAGE_KEY = 'shipyard_custom_users_v1';

class AuthService {
  private currentUser: UserProfile | null = null;
  private listeners: Set<(user: UserProfile | null) => void> = new Set();

  constructor() {
    // Session is not restored on page reload so initial screen is always login
    this.currentUser = null;
  }

  private restoreSession() {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        this.currentUser = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to restore auth session', e);
      this.currentUser = null;
    }
  }

  public getAvailableUsers(): UserProfile[] {
    try {
      const custom = localStorage.getItem(USERS_STORAGE_KEY);
      if (custom) {
        return JSON.parse(custom);
      }
    } catch {
      // ignore
    }
    return DEFAULT_SHIPYARD_USERS;
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public login(identifier: string, pass: string, rememberMe: boolean = true): { success: boolean; message?: string; user?: UserProfile } {
    const users = this.getAvailableUsers();
    const cleanId = identifier.trim().toLowerCase();

    // Match by username, name or NIK / keyword
    const matched = users.find(
      (u) =>
        u.username.toLowerCase() === cleanId ||
        u.name.toLowerCase().includes(cleanId) ||
        u.role.toLowerCase() === cleanId
    );

    if (!matched) {
      // For convenience in demo/trial, if any username is entered, create or fallback to PPC
      if (cleanId.length >= 3) {
        const newUser: UserProfile = {
          id: `user-${Date.now()}`,
          username: cleanId,
          name: identifier.toUpperCase(),
          title: 'Shipyard Engineer',
          role: 'PPC',
          department: 'Engineering & Production',
          initials: identifier.substring(0, 2).toUpperCase(),
        };
        this.setCurrentUser(newUser, rememberMe);
        return { success: true, user: newUser };
      }
      return { success: false, message: 'Username atau ID Pengguna tidak ditemukan.' };
    }

    this.setCurrentUser(matched, rememberMe);
    return { success: true, user: matched };
  }

  public quickLogin(userId: string, rememberMe: boolean = true): UserProfile | null {
    const users = this.getAvailableUsers();
    const user = users.find((u) => u.id === userId) || users[0];
    if (user) {
      this.setCurrentUser(user, rememberMe);
      return user;
    }
    return null;
  }

  public logout(): void {
    this.currentUser = null;
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
    this.notifyListeners();
  }

  private setCurrentUser(user: UserProfile, remember: boolean = true): void {
    this.currentUser = user;
    if (remember) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      } catch {
        // ignore
      }
    }
    this.notifyListeners();
  }

  public subscribe(callback: (user: UserProfile | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb(this.currentUser));
  }
}

export const authService = new AuthService();
