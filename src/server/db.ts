import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ServerUser {
  id: string;
  name: string;
  role: 'Super Admin' | 'Business Owner' | 'Manager' | 'Cashier' | 'Stock Manager';
  companyId?: string;
  assignedCompanyIds?: string[];
  email: string;
  phone: string;
  branch: string;
  status: 'Active' | 'Suspended';
  passwordHash: string;
  passwordSalt: string;
  iterations: number;
  lastLogin: string;
  createdAt: string;
}

export interface SessionData {
  token: string;
  userId: string;
  user: Omit<ServerUser, 'passwordHash' | 'passwordSalt' | 'iterations'>;
  createdAt: number;
  expiresAt: number;
  rememberMe: boolean;
}

export interface ServerAuditLog {
  id: string;
  date: string;
  user: string;
  role: string;
  action: string;
  module: string;
  record: string;
  reason: string;
  severity: 'Info' | 'Warning' | 'Critical';
}

export interface ServerCompany {
  id: string;
  name: string;
  code: string;
  businessType: string;
  tin: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  currency: 'RWF' | 'USD';
  status: 'Active' | 'Inactive' | 'Suspended';
  ownerName?: string;
  createdAt: string;
  subscription?: {
    planName: string;
    planStatus: string;
    monthlyFee: number;
    billingCycle: string;
  };
}

export interface ServerProduct {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  sellingPrice: number;
  costPrice: number;
  wholesalePrice?: number;
  stock: number;
  minStockAlert: number;
  unit: string;
  status: 'Active' | 'Inactive' | 'Out of Stock';
  taxRate?: number;
  lotNumber?: string;
  supplier?: string;
  expiryDate?: string;
}

export interface PersistentDbSchema {
  version: number;
  lastUpdated: string;
  users: ServerUser[];
  sessions: SessionData[];
  auditLogs: ServerAuditLog[];
  companies: ServerCompany[];
  products: ServerProduct[];
}

export const PBKDF2_ITERATIONS = 100000;
export const PBKDF2_KEYLEN = 64;
export const PBKDF2_DIGEST = 'sha512';

/**
 * Creates cryptographically secure salted password hash using PBKDF2 with 100,000 iterations.
 */
export function hashPassword(
  password: string,
  salt: string = crypto.randomBytes(16).toString('hex'),
  iterations: number = PBKDF2_ITERATIONS
): { passwordHash: string; passwordSalt: string; iterations: number } {
  const hash = crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  return { passwordHash: hash, passwordSalt: salt, iterations };
}

/**
 * Timing-safe password verification.
 * NO fallback bypasses (Pos123! or Pass123! are completely rejected unless matched by hash).
 */
export function verifyPassword(password: string, user: ServerUser): boolean {
  if (!user.passwordHash || !user.passwordSalt) return false;
  try {
    const iterations = user.iterations || PBKDF2_ITERATIONS;
    const verifyHash = crypto.pbkdf2Sync(password, user.passwordSalt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
    const hashBuf = Buffer.from(user.passwordHash, 'hex');
    const verifyBuf = Buffer.from(verifyHash, 'hex');
    if (hashBuf.length === verifyBuf.length && crypto.timingSafeEqual(hashBuf, verifyBuf)) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function sanitizeUser(u: ServerUser): Omit<ServerUser, 'passwordHash' | 'passwordSalt' | 'iterations'> {
  const { passwordHash: _h, passwordSalt: _s, iterations: _i, ...safe } = u;
  return safe;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('250') && digits.length >= 11) {
    return digits.substring(3);
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return digits.substring(1);
  }
  return digits;
}

export function isEmailAddress(input: string): boolean {
  return input.includes('@') && input.includes('.');
}

class PersistentDatabase {
  private dbPath: string;
  private data: PersistentDbSchema;

  constructor() {
    const customPath = process.env.PERSISTENT_DB_PATH;
    if (customPath) {
      this.dbPath = path.isAbsolute(customPath) ? customPath : path.join(process.cwd(), customPath);
    } else {
      this.dbPath = path.join(process.cwd(), 'data', 'pos_production_db.json');
    }

    this.data = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      users: [],
      sessions: [],
      auditLogs: [],
      companies: [],
      products: [],
    };

    this.init();
  }

  private init() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.data = {
          version: parsed.version || 1,
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
          users: Array.isArray(parsed.users) ? parsed.users : [],
          sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
          companies: Array.isArray(parsed.companies) ? parsed.companies : [],
          products: Array.isArray(parsed.products) ? parsed.products : [],
        };
        // Clean up expired sessions on startup
        const now = Date.now();
        this.data.sessions = this.data.sessions.filter((s) => s.expiresAt > now);
        return;
      } catch (err) {
        console.error(`[DB] Failed to parse existing database at ${this.dbPath}. Backing up and initializing fresh.`, err);
        try {
          fs.renameSync(this.dbPath, `${this.dbPath}.corrupt-${Date.now()}`);
        } catch {
          // ignore
        }
      }
    }

    // First-time initialization
    this.seedInitialData();
    this.save();
  }

  private seedInitialData() {
    const nowIso = new Date().toISOString();

    // 1. Initial Companies
    this.data.companies = [
      {
        id: 'comp-1',
        name: 'Fresh & More Supermarket',
        code: 'FMS-KGL',
        businessType: 'Supermarket / Grocery Retail',
        tin: '103884920',
        phone: '+250 788 310 450',
        email: 'info@freshandmore.rw',
        address: 'KG 11 Ave, Kimironko',
        city: 'Kigali',
        country: 'Rwanda',
        currency: 'RWF',
        status: 'Active',
        ownerName: 'Emmanuel Muke',
        createdAt: nowIso,
        subscription: {
          planName: 'Enterprise Growth',
          planStatus: 'Paid & Active',
          monthlyFee: 150000,
          billingCycle: 'Monthly',
        },
      },
      {
        id: 'comp-2',
        name: 'Kigali Fresh Mart',
        code: 'KFM-NYR',
        businessType: 'Minimarket / Fresh Produce',
        tin: '104992110',
        phone: '+250 788 450 910',
        email: 'contact@kigalifreshmart.rw',
        address: 'KN 3 Rd, Nyarugenge',
        city: 'Kigali',
        country: 'Rwanda',
        currency: 'RWF',
        status: 'Active',
        ownerName: 'Alice Mukamana',
        createdAt: nowIso,
        subscription: {
          planName: 'Professional Retail',
          planStatus: 'Paid & Active',
          monthlyFee: 85000,
          billingCycle: 'Monthly',
        },
      },
    ];

    // 2. Initial Products (strictly isolated)
    this.data.products = [
      {
        id: 'p-1',
        companyId: 'comp-1',
        name: 'Inyange Whole Milk 1L',
        sku: 'MILK-INY-01',
        barcode: '6001000101',
        category: 'Dairy & Eggs',
        sellingPrice: 1200,
        costPrice: 950,
        wholesalePrice: 1100,
        stock: 85,
        minStockAlert: 20,
        unit: 'L',
        status: 'Active',
        taxRate: 18,
        supplier: 'Rwanda Dairy Ltd',
      },
      {
        id: 'p-2',
        companyId: 'comp-1',
        name: 'Fresh French Bread Baguette',
        sku: 'BAK-BAG-02',
        barcode: '6001000102',
        category: 'Bakery',
        sellingPrice: 800,
        costPrice: 500,
        stock: 35,
        minStockAlert: 10,
        unit: 'pcs',
        status: 'Active',
        supplier: 'Kigali Bakery Supply',
      },
      {
        id: 'p-3',
        companyId: 'comp-1',
        name: 'Kinazi Cassava Flour 5kg',
        sku: 'FLR-KIN-03',
        barcode: '6001000103',
        category: 'Grains & Flours',
        sellingPrice: 4500,
        costPrice: 3600,
        wholesalePrice: 4200,
        stock: 42,
        minStockAlert: 15,
        unit: 'bag',
        status: 'Active',
        supplier: 'Kinazi Grain Mill',
      },
      {
        id: 'p-kfm-1',
        companyId: 'comp-2',
        name: 'Organic Hass Avocados (kg)',
        sku: 'KFM-AVO-01',
        barcode: '6002000201',
        category: 'Fresh Produce',
        sellingPrice: 2200,
        costPrice: 1500,
        stock: 65,
        minStockAlert: 15,
        unit: 'kg',
        status: 'Active',
        supplier: 'Kigali Produce Cooperative',
      },
      {
        id: 'p-kfm-2',
        companyId: 'comp-2',
        name: 'Fresh Passion Fruit Juice 500ml',
        sku: 'KFM-JUC-02',
        barcode: '6002000202',
        category: 'Beverages',
        sellingPrice: 1500,
        costPrice: 1000,
        stock: 40,
        minStockAlert: 10,
        unit: 'btl',
        status: 'Active',
        supplier: 'Nyungwe Juice Works',
      },
    ];

    // 3. Initial Super Admin and Staff Accounts (Hashed with PBKDF2 100,000 iterations)
    const adminEmail = process.env.INITIAL_SUPER_ADMIN_EMAIL || 'admin@freshandmore.rw';
    const adminPass = process.env.INITIAL_SUPER_ADMIN_PASSWORD || 'SuperAdmin2026!RwandaSecure';
    const adminPhone = process.env.INITIAL_SUPER_ADMIN_PHONE || '+250 788 000 001';
    const adminName = process.env.INITIAL_SUPER_ADMIN_NAME || 'System Administrator';

    const adminHash = hashPassword(adminPass);
    this.data.users.push({
      id: 'usr-admin-initial',
      name: adminName,
      role: 'Super Admin',
      email: normalizeEmail(adminEmail),
      phone: adminPhone,
      branch: 'All Branches',
      assignedCompanyIds: [],
      status: 'Active',
      passwordHash: adminHash.passwordHash,
      passwordSalt: adminHash.passwordSalt,
      iterations: adminHash.iterations,
      lastLogin: nowIso,
      createdAt: nowIso,
    });

    // Initial business manager and cashier accounts with strong salted PBKDF2 hashes
    const cashierPass = process.env.INITIAL_CASHIER_PASSWORD || 'Cashier2026!RwandaSecure';
    const cashierHash = hashPassword(cashierPass);
    this.data.users.push({
      id: 'usr-cashier-initial',
      name: 'Marie Claire U.',
      role: 'Cashier',
      companyId: 'comp-1',
      assignedCompanyIds: ['comp-1'],
      email: 'marie@freshandmore.rw',
      phone: '+250 785 112 900',
      branch: 'Main Branch',
      status: 'Active',
      passwordHash: cashierHash.passwordHash,
      passwordSalt: cashierHash.passwordSalt,
      iterations: cashierHash.iterations,
      lastLogin: nowIso,
      createdAt: nowIso,
    });

    const ownerPass = process.env.INITIAL_OWNER_PASSWORD || 'Owner2026!RwandaSecure';
    const ownerHash = hashPassword(ownerPass);
    this.data.users.push({
      id: 'usr-owner-initial',
      name: 'Emmanuel Muke',
      role: 'Business Owner',
      companyId: 'comp-1',
      assignedCompanyIds: ['comp-1'],
      email: 'emmanuel@freshandmore.rw',
      phone: '+250 788 300 100',
      branch: 'All Branches',
      status: 'Active',
      passwordHash: ownerHash.passwordHash,
      passwordSalt: ownerHash.passwordSalt,
      iterations: ownerHash.iterations,
      lastLogin: nowIso,
      createdAt: nowIso,
    });

    console.log(`[DB] Initial accounts provisioned with PBKDF2 hashes (Super Admin: ${adminEmail})`);
  }

  public save(): void {
    try {
      this.data.lastUpdated = new Date().toISOString();
      const content = JSON.stringify(this.data, null, 2);
      const tempPath = `${this.dbPath}.tmp-${Date.now()}`;
      fs.writeFileSync(tempPath, content, 'utf8');
      fs.renameSync(tempPath, this.dbPath);
    } catch (err) {
      console.error(`[DB] Failed to persist database to ${this.dbPath}:`, err);
    }
  }

  // --- Users ---
  public getUsers(): ServerUser[] {
    return this.data.users;
  }

  public findUserById(id: string): ServerUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public findUserByIdentifier(rawId: string): ServerUser | undefined {
    const trimmed = rawId.trim();
    if (isEmailAddress(trimmed)) {
      const norm = normalizeEmail(trimmed);
      return this.data.users.find((u) => normalizeEmail(u.email) === norm);
    }
    const normPhone = normalizePhone(trimmed);
    if (!normPhone) return undefined;
    return this.data.users.find((u) => normalizePhone(u.phone) === normPhone);
  }

  public addUser(user: ServerUser): void {
    this.data.users.push(user);
    this.save();
  }

  public updateUser(id: string, partial: Partial<ServerUser>): ServerUser | undefined {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...partial };
    this.save();
    return this.data.users[idx];
  }

  public deleteUser(id: string): boolean {
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter((u) => u.id !== id);
    if (this.data.users.length !== initialLen) {
      this.revokeUserSessions(id);
      this.save();
      return true;
    }
    return false;
  }

  // --- Sessions ---
  public getSessions(): SessionData[] {
    return this.data.sessions;
  }

  public getSession(token: string): SessionData | undefined {
    const session = this.data.sessions.find((s) => s.token === token);
    if (!session) return undefined;
    if (session.expiresAt < Date.now()) {
      this.deleteSession(token);
      return undefined;
    }
    return session;
  }

  public saveSession(session: SessionData): void {
    // Replace if exists, else append
    const idx = this.data.sessions.findIndex((s) => s.token === session.token);
    if (idx !== -1) {
      this.data.sessions[idx] = session;
    } else {
      this.data.sessions.push(session);
    }
    this.save();
  }

  public deleteSession(token: string): void {
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    if (this.data.sessions.length !== initialLen) {
      this.save();
    }
  }

  public revokeUserSessions(userId: string): void {
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => s.userId !== userId);
    if (this.data.sessions.length !== initialLen) {
      this.save();
    }
  }

  // --- Audit Logs ---
  public getAuditLogs(): ServerAuditLog[] {
    return this.data.auditLogs;
  }

  public addAuditLog(entry: Omit<ServerAuditLog, 'id' | 'date'>): ServerAuditLog {
    const log: ServerAuditLog = {
      id: `srv-aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      ...entry,
    };
    this.data.auditLogs.unshift(log);
    // Keep max 5000 audit records in database
    if (this.data.auditLogs.length > 5000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 5000);
    }
    this.save();
    return log;
  }

  // --- Companies ---
  public getCompanies(): ServerCompany[] {
    return this.data.companies;
  }

  public findCompanyById(id: string): ServerCompany | undefined {
    return this.data.companies.find((c) => c.id === id);
  }

  public addCompany(company: ServerCompany): void {
    this.data.companies.push(company);
    this.save();
  }

  public updateCompany(id: string, partial: Partial<ServerCompany>): ServerCompany | undefined {
    const idx = this.data.companies.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.data.companies[idx] = { ...this.data.companies[idx], ...partial };
    this.save();
    return this.data.companies[idx];
  }

  // --- Products ---
  public getProducts(companyId?: string): ServerProduct[] {
    if (!companyId || companyId === 'all') return this.data.products;
    return this.data.products.filter((p) => p.companyId === companyId);
  }

  public findProductById(id: string): ServerProduct | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  public addProduct(product: ServerProduct): void {
    this.data.products.push(product);
    this.save();
  }

  public updateProduct(id: string, partial: Partial<ServerProduct>): ServerProduct | undefined {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.data.products[idx] = { ...this.data.products[idx], ...partial };
    this.save();
    return this.data.products[idx];
  }

  public deleteProduct(id: string): boolean {
    const initialLen = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.id !== id);
    if (this.data.products.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }
}

export const db = new PersistentDatabase();
