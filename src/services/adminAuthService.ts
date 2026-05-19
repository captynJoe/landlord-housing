import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type {
  AdminAccessCredentialUpdateInput,
  AdminLoginInput
} from "../validation/schemas.js";

export type AdminRole = "landlord" | "admin" | "root_admin";

export interface AdminSession {
  token: string;
  role: AdminRole;
  createdAt: string;
  expiresAt: string;
}

export interface AdminCredentialOverridePersistedState {
  username: string;
  passwordHash: string;
  passwordSalt: string;
  updatedAt: string;
}

export interface AdminCredentialSummary {
  username: string | null;
  source: "environment" | "app_state" | "unset";
  updatedAt?: string;
}

export interface AdminAuthPersistedState {
  sessions: AdminSession[];
  adminCredentials?: AdminCredentialOverridePersistedState | null;
}

type AdminAuthStateChangeHandler = (
  state: AdminAuthPersistedState
) => void | Promise<void>;

export interface AdminAuthServiceOptions {
  landlordToken?: string;
  adminToken: string;
  rootAdminToken?: string;
  landlordUsername?: string;
  landlordPassword?: string;
  adminUsername?: string;
  adminPassword?: string;
  rootAdminUsername?: string;
  rootAdminPassword?: string;
  sessionTtlHours?: number;
}

function createToken(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function nowMs(): number {
  return Date.now();
}

function addHours(baseMs: number, hours: number): string {
  return new Date(baseMs + hours * 60 * 60 * 1000).toISOString();
}

function normalize(value: string | undefined): string {
  return value?.trim() ?? "";
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

export class AdminAuthService {
  private readonly sessions = new Map<string, AdminSession>();
  private readonly landlordToken?: string;
  private readonly adminToken: string;
  private readonly rootAdminToken?: string;
  private readonly landlordUsername?: string;
  private readonly landlordPassword?: string;
  private readonly envAdminUsername?: string;
  private readonly envAdminPassword?: string;
  private readonly rootAdminUsername?: string;
  private readonly rootAdminPassword?: string;
  private readonly sessionTtlHours: number;
  private stateChangeHandler?: AdminAuthStateChangeHandler;
  private adminCredentialOverride: AdminCredentialOverridePersistedState | null = null;

  constructor(options: AdminAuthServiceOptions) {
    this.landlordToken = options.landlordToken;
    this.adminToken = options.adminToken;
    this.rootAdminToken = options.rootAdminToken;
    this.landlordUsername = options.landlordUsername;
    this.landlordPassword = options.landlordPassword;
    this.envAdminUsername = options.adminUsername;
    this.envAdminPassword = options.adminPassword;
    this.rootAdminUsername = options.rootAdminUsername;
    this.rootAdminPassword = options.rootAdminPassword;
    this.sessionTtlHours = options.sessionTtlHours ?? 12;
  }

  setStateChangeHandler(handler?: AdminAuthStateChangeHandler): void {
    this.stateChangeHandler = handler;
  }

  exportState(): AdminAuthPersistedState {
    return {
      sessions: [...this.sessions.values()].map((session) => ({ ...session })),
      adminCredentials: this.adminCredentialOverride
        ? { ...this.adminCredentialOverride }
        : null
    };
  }

  importState(state: AdminAuthPersistedState | null | undefined): void {
    this.sessions.clear();
    this.adminCredentialOverride = this.normalizeAdminCredentialOverride(
      state?.adminCredentials
    );

    if (!state || !Array.isArray(state.sessions)) {
      return;
    }

    for (const session of state.sessions) {
      if (!session?.token || !session?.expiresAt || !session?.createdAt || !session?.role) {
        continue;
      }

      if (new Date(session.expiresAt).getTime() < nowMs()) {
        continue;
      }

      this.sessions.set(session.token, {
        token: session.token,
        role: session.role,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      });
    }
  }

  login(input: AdminLoginInput): AdminSession | null {
    this.purgeExpired();

    let role: AdminRole | null = null;

    const accessToken = normalize(input.accessToken);
    const username = normalize(input.username);
    const password = normalize(input.password);

    if (accessToken) {
      if (this.rootAdminToken && accessToken === this.rootAdminToken) {
        role = "root_admin";
      } else if (accessToken === this.adminToken) {
        role = "admin";
      } else if (this.landlordToken && accessToken === this.landlordToken) {
        role = "landlord";
      }
    }

    if (!role && username && password) {
      if (
        this.rootAdminUsername &&
        this.rootAdminPassword &&
        username === this.rootAdminUsername &&
        password === this.rootAdminPassword
      ) {
        role = "root_admin";
      } else if (this.matchesAdminUsernameAndPassword(username, password)) {
        role = "admin";
      } else if (
        this.landlordUsername &&
        this.landlordPassword &&
        username === this.landlordUsername &&
        password === this.landlordPassword
      ) {
        role = "landlord";
      }
    }

    if (!role) {
      return null;
    }

    const createdAt = new Date().toISOString();
    const session: AdminSession = {
      token: createToken("admin"),
      role,
      createdAt,
      expiresAt: addHours(nowMs(), this.sessionTtlHours)
    };

    this.sessions.set(session.token, session);
    this.emitStateChange();
    return session;
  }

  getSession(token: string | undefined): AdminSession | null {
    if (!token) {
      return null;
    }

    this.purgeExpired();

    const session = this.sessions.get(token);
    if (!session) {
      return null;
    }

    if (new Date(session.expiresAt).getTime() < nowMs()) {
      this.sessions.delete(token);
      this.emitStateChange();
      return null;
    }

    return session;
  }

  revokeSession(token: string | undefined): boolean {
    if (!token) {
      return false;
    }

    const removed = this.sessions.delete(token);
    if (removed) {
      this.emitStateChange();
    }

    return removed;
  }

  hasRole(session: AdminSession, minimumRole: AdminRole): boolean {
    if (minimumRole === "landlord") {
      return (
        session.role === "landlord" ||
        session.role === "admin" ||
        session.role === "root_admin"
      );
    }

    if (minimumRole === "admin") {
      return session.role === "admin" || session.role === "root_admin";
    }

    return session.role === "root_admin";
  }

  getAdminCredentialSummary(): AdminCredentialSummary {
    const username = this.adminCredentialOverride?.username ?? normalize(this.envAdminUsername);
    if (username) {
      return {
        username,
        source: this.adminCredentialOverride ? "app_state" : "environment",
        updatedAt: this.adminCredentialOverride?.updatedAt
      };
    }

    return {
      username: null,
      source: "unset"
    };
  }

  updateAdminCredentials(
    input: Pick<AdminAccessCredentialUpdateInput, "username" | "password">
  ): AdminCredentialSummary {
    const username = normalize(input.username);
    const password = normalize(input.password);
    const passwordSalt = randomBytes(16).toString("hex");

    this.adminCredentialOverride = {
      username,
      passwordHash: hashPassword(password, passwordSalt),
      passwordSalt,
      updatedAt: new Date().toISOString()
    };

    for (const [token, session] of this.sessions) {
      if (session.role === "admin") {
        this.sessions.delete(token);
      }
    }

    this.emitStateChange();
    return this.getAdminCredentialSummary();
  }

  private matchesAdminUsernameAndPassword(username: string, password: string): boolean {
    if (this.adminCredentialOverride) {
      if (username !== this.adminCredentialOverride.username) {
        return false;
      }

      const expected = Buffer.from(this.adminCredentialOverride.passwordHash, "hex");
      const actual = Buffer.from(
        hashPassword(password, this.adminCredentialOverride.passwordSalt),
        "hex"
      );

      if (expected.length === 0 || expected.length !== actual.length) {
        return false;
      }

      return timingSafeEqual(expected, actual);
    }

    return Boolean(
      this.envAdminUsername &&
        this.envAdminPassword &&
        username === this.envAdminUsername &&
        password === this.envAdminPassword
    );
  }

  private normalizeAdminCredentialOverride(
    value: AdminAuthPersistedState["adminCredentials"]
  ): AdminCredentialOverridePersistedState | null {
    if (!value || typeof value !== "object") {
      return null;
    }

    const username = normalize(value.username);
    const passwordHash = normalize(value.passwordHash);
    const passwordSalt = normalize(value.passwordSalt);
    const updatedAt = normalize(value.updatedAt);
    if (!username || !passwordHash || !passwordSalt || !updatedAt) {
      return null;
    }

    return {
      username,
      passwordHash,
      passwordSalt,
      updatedAt
    };
  }

  private emitStateChange(): void {
    if (!this.stateChangeHandler) {
      return;
    }

    const snapshot = this.exportState();
    void Promise.resolve(this.stateChangeHandler(snapshot)).catch((error) => {
      console.error("Failed to persist admin auth state", error);
    });
  }

  private purgeExpired() {
    const now = nowMs();
    let changed = false;

    for (const [token, session] of this.sessions) {
      if (new Date(session.expiresAt).getTime() < now) {
        this.sessions.delete(token);
        changed = true;
      }
    }

    if (changed) {
      this.emitStateChange();
    }
  }
}
