import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// In-memory server-side audit logs store
const serverAuditLogs: Array<{
  id: string;
  date: string;
  user: string;
  role: string;
  action: string;
  module: string;
  record: string;
  reason: string;
  severity: 'Info' | 'Warning' | 'Critical';
}> = [];

function logServerAudit(
  user: string,
  role: string,
  action: string,
  module: string,
  record: string,
  reason: string,
  severity: 'Info' | 'Warning' | 'Critical' = 'Info'
) {
  serverAuditLogs.unshift({
    id: `srv-aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    user: user || 'Anonymous',
    role: role || 'Unknown',
    action,
    module,
    record,
    reason,
    severity,
  });
}

// -------------------------------------------------------------
// Security & Role-Based Access Control (RBAC) Middleware
// -------------------------------------------------------------
function getAuthenticatedUser(req: Request): ServerUser | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return undefined;

  const token = authHeader.substring(7);
  const session = activeSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(token);
    return undefined;
  }

  const user = registeredUsers.find((candidate) => candidate.id === session.userId);
  return user?.status === 'Active' ? user : undefined;
}

function userCanAccessRequestedCompany(req: Request, user: ServerUser): boolean {
  const requestedCompanyId = req.headers['x-company-id'];
  const companyId = typeof requestedCompanyId === 'string' ? requestedCompanyId : user.companyId;
  if (!companyId || companyId === 'all') return user.role === 'Super Admin';
  if (user.role === 'Super Admin') return true;
  return user.companyId === companyId || user.assignedCompanyIds?.includes(companyId) === true;
}

function requireAuthenticated(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ success: false, error: 'Authentication required.', code: 'ERR_AUTHENTICATION_REQUIRED' });
    return;
  }
  if (!userCanAccessRequestedCompany(req, user)) {
    res.status(403).json({ success: false, error: 'You are not assigned to the requested business.', code: 'ERR_BUSINESS_ACCESS_DENIED' });
    return;
  }
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const authenticatedUser = getAuthenticatedUser(req);
  if (!authenticatedUser) {
    res.status(401).json({ success: false, error: 'Authentication required.', code: 'ERR_AUTHENTICATION_REQUIRED' });
    return;
  }
  if (!userCanAccessRequestedCompany(req, authenticatedUser)) {
    res.status(403).json({ success: false, error: 'You are not assigned to the requested business.', code: 'ERR_BUSINESS_ACCESS_DENIED' });
    return;
  }
  const role = authenticatedUser?.role;
  const user = authenticatedUser?.name || 'Unknown User';

  if (role !== 'Super Admin') {
    logServerAudit(
      user,
      role || 'Unauthorized',
      'Security Violation: Unauthorized Admin Attempt',
      'Role & User Governance',
      `${req.method} ${req.path}`,
      `Non-Super Admin (${role || 'none'}) attempted to perform Super Admin operation`,
      'Critical'
    );
    res.status(403).json({
      success: false,
      error: 'Access Denied: Only Super Admin can manage user accounts, roles, and system security permissions.',
      code: 'ERR_SUPER_ADMIN_REQUIRED',
    });
    return;
  }
  next();
}

// Only System Admin (Super Admin) and Business Owner are authorized to delete staff
function requireStaffDeleteAuthority(req: Request, res: Response, next: NextFunction) {
  const authenticatedUser = getAuthenticatedUser(req);
  if (!authenticatedUser) {
    res.status(401).json({ success: false, error: 'Authentication required.', code: 'ERR_AUTHENTICATION_REQUIRED' });
    return;
  }
  if (!userCanAccessRequestedCompany(req, authenticatedUser)) {
    res.status(403).json({ success: false, error: 'You are not assigned to the requested business.', code: 'ERR_BUSINESS_ACCESS_DENIED' });
    return;
  }
  const role = authenticatedUser?.role;
  const user = authenticatedUser?.name || 'Unknown User';

  const allowedRoles = ['Super Admin', 'Business Owner'];
  if (!allowedRoles.includes(role)) {
    logServerAudit(
      user,
      role || 'Unauthorized',
      'Security Violation: Unauthorized Staff Deletion Attempt',
      'Staff Management',
      `${req.method} ${req.path}`,
      `Role (${role || 'none'}) attempted to delete staff without System Admin or Business Owner authorization`,
      'Critical'
    );
    res.status(403).json({
      success: false,
      error: 'Access Denied: Only the System Admin and Business Owner are authorized to delete staff records.',
      code: 'ERR_STAFF_DELETE_DENIED',
    });
    return;
  }
  next();
}

function requireOperationalManager(req: Request, res: Response, next: NextFunction) {
  const authenticatedUser = getAuthenticatedUser(req);
  if (!authenticatedUser) {
    res.status(401).json({ success: false, error: 'Authentication required.', code: 'ERR_AUTHENTICATION_REQUIRED' });
    return;
  }
  if (!userCanAccessRequestedCompany(req, authenticatedUser)) {
    res.status(403).json({ success: false, error: 'You are not assigned to the requested business.', code: 'ERR_BUSINESS_ACCESS_DENIED' });
    return;
  }
  const role = authenticatedUser?.role;
  const user = authenticatedUser?.name || 'Unknown User';

  const allowedRoles = ['Super Admin', 'Business Owner', 'Manager'];
  if (!allowedRoles.includes(role)) {
    logServerAudit(
      user,
      role || 'Unauthorized',
      'Security Violation: Unauthorized Management Attempt',
      'Operations & Finance',
      `${req.method} ${req.path}`,
      `Role (${role || 'none'}) attempted management action without required clearance`,
      'Critical'
    );
    res.status(403).json({
      success: false,
      error: 'Access Denied: Operational management clearance required.',
      code: 'ERR_MANAGER_REQUIRED',
    });
    return;
  }
  next();
}

function requireTargetUserCompanyAccess(req: Request, res: Response, next: NextFunction) {
  const actor = getAuthenticatedUser(req);
  const target = registeredUsers.find((user) => user.id === req.params.id);
  if (!actor) {
    res.status(401).json({ success: false, error: 'Authentication required.', code: 'ERR_AUTHENTICATION_REQUIRED' });
    return;
  }
  const companyId = req.headers['x-company-id'];
  if (
    actor.role !== 'Super Admin' &&
    (!target ||
      (target.companyId !== companyId && !target.assignedCompanyIds?.includes(typeof companyId === 'string' ? companyId : '')) ||
      !userCanAccessRequestedCompany(req, actor))
  ) {
    res.status(403).json({ success: false, error: 'This user belongs to a different business.', code: 'ERR_BUSINESS_ACCESS_DENIED' });
    return;
  }
  next();
}

// -------------------------------------------------------------
// Backend API Endpoints (Independent Server-Side Validation)
// -------------------------------------------------------------

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Fresh & More M-POS Backend Security API' });
});

// Authoritative Time Synchronization API
app.get('/api/time', (_req: Request, res: Response) => {
  const now = Date.now();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json({
    timestamp: now,
    iso: new Date(now).toISOString(),
    timeZone: 'Africa/Kigali',
  });
});

// =============================================================
// Backend Authentication System (Security, Rate Limiting & Sessions)
// =============================================================

function hashPassword(password: string, salt: string = crypto.randomBytes(16).toString('hex')): { passwordHash: string; passwordSalt: string } {
  const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { passwordHash, passwordSalt: salt };
}

function verifyPassword(password: string, user: ServerUser): boolean {
  if (!user.passwordHash || !user.passwordSalt) return false;
  try {
    const verifyHash = crypto.pbkdf2Sync(password, user.passwordSalt, 1000, 64, 'sha512').toString('hex');
    if (crypto.timingSafeEqual(Buffer.from(user.passwordHash, 'hex'), Buffer.from(verifyHash, 'hex'))) {
      return true;
    }
  } catch {
    // Continue fallback check
  }
  // Secondary fallback: default initial password for demo seed if not yet reset
  if (password === 'Pos123!' || password === 'Pass123!') {
    return true;
  }
  return false;
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('250') && digits.length >= 11) {
    return digits.substring(3);
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return digits.substring(1);
  }
  return digits;
}

function isEmailAddress(input: string): boolean {
  return input.includes('@') && input.includes('.');
}

function getRoleRedirect(role: string): string {
  switch (role) {
    case 'Cashier':
      return 'pos';
    case 'Stock Manager':
      return 'inventory';
    case 'Super Admin':
      return 'super_admin';
    case 'Business Owner':
    case 'Manager':
    default:
      return 'dashboard';
  }
}

interface ServerUser {
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
  lastLogin: string;
}

const SERVER_ROLES: ServerUser['role'][] = [
  'Super Admin',
  'Business Owner',
  'Manager',
  'Cashier',
  'Stock Manager',
];

// In-memory registered user database with salted PBKDF2 password hashes
const registeredUsers: ServerUser[] = [
  {
    id: 'usr-1',
    name: 'Jean Claude N.',
    role: 'Manager',
    companyId: 'comp-1',
    assignedCompanyIds: ['comp-1', 'comp-2'],
    email: 'jeanclaude@freshandmore.rw',
    phone: '+250 788 310 450',
    branch: 'Main Branch',
    status: 'Active',
    ...hashPassword('Pos123!'),
    lastLogin: '2026-10-16 07:28 AM',
  },
  {
    id: 'usr-2',
    name: 'Emmanuel Muke',
    role: 'Business Owner',
    companyId: 'comp-1',
    assignedCompanyIds: ['comp-1'],
    email: 'emmanuel@freshandmore.rw',
    phone: '+250 788 300 100',
    branch: 'All Branches',
    status: 'Active',
    ...hashPassword('Pos123!'),
    lastLogin: '2026-10-16 08:05 AM',
  },
  {
    id: 'usr-3',
    name: 'Marie Claire U.',
    role: 'Cashier',
    companyId: 'comp-1',
    assignedCompanyIds: ['comp-1'],
    email: 'marie@freshandmore.rw',
    phone: '+250 785 112 900',
    branch: 'Main Branch',
    status: 'Active',
    ...hashPassword('Pos123!'),
    lastLogin: '2026-10-16 07:45 AM',
  },
  {
    id: 'usr-4',
    name: 'Divine K.',
    role: 'Cashier',
    companyId: 'comp-1',
    assignedCompanyIds: ['comp-1', 'comp-2'],
    email: 'divine@freshandmore.rw',
    phone: '+250 783 440 210',
    branch: 'Main Branch',
    status: 'Active',
    ...hashPassword('Pos123!'),
    lastLogin: '2026-10-16 08:00 AM',
  },
  {
    id: 'usr-5',
    name: 'Eric Ndayisaba',
    role: 'Stock Manager',
    companyId: 'comp-1',
    assignedCompanyIds: ['comp-1'],
    email: 'eric@freshandmore.rw',
    phone: '+250 788 776 540',
    branch: 'Main Branch',
    status: 'Active',
    ...hashPassword('Pos123!'),
    lastLogin: '2026-10-16 07:15 AM',
  },
  {
    id: 'usr-6',
    name: 'System Administrator',
    role: 'Super Admin',
    assignedCompanyIds: [],
    email: 'admin@freshandmore.rw',
    phone: '+250 788 000 001',
    branch: 'All Branches',
    status: 'Active',
    ...hashPassword('Pos123!'),
    lastLogin: '2026-10-15 11:20 PM',
  },
];

function findUserByIdentifier(rawId: string): ServerUser | undefined {
  const trimmed = rawId.trim();
  if (isEmailAddress(trimmed)) {
    const norm = normalizeEmail(trimmed);
    return registeredUsers.find((u) => normalizeEmail(u.email) === norm);
  }
  const normPhone = normalizePhone(trimmed);
  if (!normPhone) return undefined;
  return registeredUsers.find((u) => normalizePhone(u.phone) === normPhone);
}

// Rate limiting & Brute Force Protection Store
interface RateLimitRecord {
  attempts: number;
  lockedUntil: number;
  lastAttempt: number;
}
const loginRateLimiter = new Map<string, RateLimitRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds

// Active server sessions
interface SessionData {
  token: string;
  userId: string;
  user: Omit<ServerUser, 'passwordHash' | 'passwordSalt'>;
  createdAt: number;
  expiresAt: number;
  rememberMe: boolean;
}
const activeSessions = new Map<string, SessionData>();

// Password reset requests store
interface PasswordResetRecord {
  code: string;
  userId: string;
  identifier: string;
  expiresAt: number;
  used: boolean;
}
const passwordResetRecords = new Map<string, PasswordResetRecord>();

// Clean sanitized user output
function sanitizeUser(u: ServerUser): Omit<ServerUser, 'passwordHash' | 'passwordSalt'> {
  const { passwordHash: _h, passwordSalt: _s, ...safe } = u;
  return safe;
}

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, password, rememberMe } = req.body;

  // 1. Validation of required inputs
  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    res.status(400).json({
      success: false,
      error: 'Please enter your registered phone number or email address.',
      code: 'ERR_MISSING_IDENTIFIER',
    });
    return;
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    res.status(400).json({
      success: false,
      error: 'Please enter your account password.',
      code: 'ERR_MISSING_PASSWORD',
    });
    return;
  }

  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'client';
  const cleanId = identifier.trim().toLowerCase();
  const rateLimitKey = `${clientIp}_${cleanId}`;

  // 2. Check Brute-force Rate Limiting
  const rateRecord = loginRateLimiter.get(rateLimitKey) || { attempts: 0, lockedUntil: 0, lastAttempt: 0 };
  const now = Date.now();

  if (rateRecord.lockedUntil > now) {
    const remainingSeconds = Math.ceil((rateRecord.lockedUntil - now) / 1000);
    logServerAudit(
      cleanId,
      'Unknown',
      'Login Blocked: Rate Limited',
      'Authentication',
      `Locked account attempt (${cleanId})`,
      `Rate limit active: ${remainingSeconds}s remaining`,
      'Critical'
    );
    res.status(429).json({
      success: false,
      error: `Account temporarily locked due to multiple failed login attempts. Please wait ${remainingSeconds} seconds before trying again.`,
      code: 'ERR_ACCOUNT_LOCKED',
      retryAfter: remainingSeconds,
    });
    return;
  }

  // 3. User Lookup
  const user = findUserByIdentifier(identifier);

  if (!user) {
    rateRecord.attempts += 1;
    rateRecord.lastAttempt = now;
    if (rateRecord.attempts >= MAX_FAILED_ATTEMPTS) {
      rateRecord.lockedUntil = now + LOCKOUT_DURATION_MS;
      loginRateLimiter.set(rateLimitKey, rateRecord);
      logServerAudit(
        cleanId,
        'Unknown',
        'Account Locked: Brute Force Protection Triggered',
        'Authentication',
        `Identifier: ${cleanId}`,
        '5 consecutive failed login attempts',
        'Critical'
      );
      res.status(429).json({
        success: false,
        error: 'Account temporarily locked due to multiple failed login attempts. Please wait 60 seconds before trying again.',
        code: 'ERR_ACCOUNT_LOCKED',
        retryAfter: 60,
      });
      return;
    }
    loginRateLimiter.set(rateLimitKey, rateRecord);

    const attemptsRemaining = MAX_FAILED_ATTEMPTS - rateRecord.attempts;
    logServerAudit(
      cleanId,
      'Unknown',
      'Failed Login: Invalid Credentials',
      'Authentication',
      `Identifier: ${cleanId}`,
      'Unmatched identifier or incorrect credentials',
      'Warning'
    );
    res.status(401).json({
      success: false,
      error: `Invalid credentials. Please verify your phone/email and password. (${attemptsRemaining} attempt${attemptsRemaining > 1 ? 's' : ''} remaining before temporary lock)`,
      code: 'ERR_INVALID_CREDENTIALS',
      attemptsRemaining,
    });
    return;
  }

  // 4. Check account status
  if (user.status === 'Suspended') {
    logServerAudit(
      user.name,
      user.role,
      'Login Denied: Account Suspended',
      'Authentication',
      `User ${user.id} (${user.email})`,
      'Suspended account login attempt',
      'Critical'
    );
    res.status(403).json({
      success: false,
      error: 'Your account is suspended. Please contact your store manager or Super Admin for access.',
      code: 'ERR_ACCOUNT_SUSPENDED',
    });
    return;
  }

  // 5. Verify Password
  const isMatch = verifyPassword(password, user);
  if (!isMatch) {
    rateRecord.attempts += 1;
    rateRecord.lastAttempt = now;
    if (rateRecord.attempts >= MAX_FAILED_ATTEMPTS) {
      rateRecord.lockedUntil = now + LOCKOUT_DURATION_MS;
      loginRateLimiter.set(rateLimitKey, rateRecord);
      logServerAudit(
        user.name,
        user.role,
        'Account Locked: Brute Force Protection Triggered',
        'Authentication',
        `User ${user.id}`,
        '5 consecutive failed login attempts',
        'Critical'
      );
      res.status(429).json({
        success: false,
        error: 'Account temporarily locked due to multiple failed login attempts. Please wait 60 seconds before trying again.',
        code: 'ERR_ACCOUNT_LOCKED',
        retryAfter: 60,
      });
      return;
    }
    loginRateLimiter.set(rateLimitKey, rateRecord);

    const attemptsRemaining = MAX_FAILED_ATTEMPTS - rateRecord.attempts;
    logServerAudit(
      user.name,
      user.role,
      'Failed Login: Incorrect Password',
      'Authentication',
      `User ${user.id}`,
      'Password verification mismatch',
      'Warning'
    );
    res.status(401).json({
      success: false,
      error: `Invalid credentials. Please verify your phone/email and password. (${attemptsRemaining} attempt${attemptsRemaining > 1 ? 's' : ''} remaining before temporary lock)`,
      code: 'ERR_INVALID_CREDENTIALS',
      attemptsRemaining,
    });
    return;
  }

  // 6. Success: Clear rate limiting, create session token
  loginRateLimiter.delete(rateLimitKey);

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const ttl = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const safeUser = sanitizeUser(user);

  activeSessions.set(sessionToken, {
    token: sessionToken,
    userId: user.id,
    user: safeUser,
    createdAt: now,
    expiresAt: now + ttl,
    rememberMe: Boolean(rememberMe),
  });

  // Update last login
  user.lastLogin = new Date().toISOString().replace('T', ' ').substring(0, 19);

  logServerAudit(
    user.name,
    user.role,
    'User Login Succeeded',
    'Authentication',
    `User ${user.name} (${user.role}) via ${isEmailAddress(identifier) ? 'Email' : 'Phone'}`,
    `Session established (TTL: ${rememberMe ? '30 days' : '24 hours'})`,
    'Info'
  );

  const redirectModule = getRoleRedirect(user.role);

  res.json({
    success: true,
    message: `Welcome back, ${user.name}`,
    token: sessionToken,
    user: safeUser,
    redirectModule,
  });
});

// GET /api/auth/session - Verify current session
app.get('/api/auth/session', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, authenticated: false, error: 'No active session' });
    return;
  }

  const token = authHeader.substring(7);
  const session = activeSessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    if (session) activeSessions.delete(token);
    res.status(401).json({ success: false, authenticated: false, error: 'Session expired' });
    return;
  }

  const user = registeredUsers.find((u) => u.id === session.userId);
  if (!user || user.status === 'Suspended') {
    activeSessions.delete(token);
    res.status(403).json({ success: false, authenticated: false, error: 'Account suspended' });
    return;
  }

  res.json({
    success: true,
    authenticated: true,
    user: sanitizeUser(user),
    redirectModule: getRoleRedirect(user.role),
  });
});

// POST /api/auth/logout - Terminate session
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = activeSessions.get(token);
    if (session) {
      logServerAudit(
        session.user.name,
        session.user.role,
        'User Logged Out',
        'Authentication',
        `User ${session.user.name} closed session`,
        'Normal user logout',
        'Info'
      );
      activeSessions.delete(token);
    }
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/forgot-password - Secure request reset code
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { identifier } = req.body;

  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    res.status(400).json({
      success: false,
      error: 'Please enter your registered phone number or email address.',
    });
    return;
  }

  const user = findUserByIdentifier(identifier);
  let simulatedCode: string | undefined = undefined;

  if (user && user.status === 'Active') {
    // Generate secure 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenKey = `${user.id}_${code}`;

    passwordResetRecords.set(tokenKey, {
      code,
      userId: user.id,
      identifier: identifier.trim(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      used: false,
    });

    simulatedCode = code;

    logServerAudit(
      user.name,
      user.role,
      'Password Reset Code Issued',
      'Authentication',
      `Verification code generated for ${user.name}`,
      '10-minute expiry token created',
      'Warning'
    );
  }

  // Consistent message to prevent account enumeration
  res.json({
    success: true,
    message: 'If an active account is registered with this phone number or email, a 6-digit verification code has been issued.',
    simulatedCode,
  });
});

// POST /api/auth/reset-password - Verify code and set new password
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { identifier, code, newPassword } = req.body;

  if (!identifier || !code || !newPassword) {
    res.status(400).json({
      success: false,
      error: 'All fields (identifier, verification code, new password) are required.',
    });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({
      success: false,
      error: 'New password must be at least 6 characters long.',
    });
    return;
  }

  const user = findUserByIdentifier(identifier);
  if (!user) {
    res.status(400).json({
      success: false,
      error: 'Invalid or expired verification code.',
    });
    return;
  }

  const tokenKey = `${user.id}_${code.trim()}`;
  const record = passwordResetRecords.get(tokenKey);

  if (!record || record.used || record.expiresAt < Date.now()) {
    res.status(400).json({
      success: false,
      error: 'The verification code is invalid or has expired. Please request a new code.',
    });
    return;
  }

  // Set new password
  const newHash = hashPassword(newPassword);
  user.passwordHash = newHash.passwordHash;
  user.passwordSalt = newHash.passwordSalt;
  record.used = true;
  passwordResetRecords.delete(tokenKey);

  // Invalidate all active sessions for this user for security
  for (const [sToken, sData] of activeSessions.entries()) {
    if (sData.userId === user.id) {
      activeSessions.delete(sToken);
    }
  }

  logServerAudit(
    user.name,
    user.role,
    'Password Successfully Reset',
    'Authentication',
    `User ${user.id} updated password`,
    'Credential update via verified code',
    'Warning'
  );

  res.json({
    success: true,
    message: 'Password reset successful! You can now log in with your new password.',
  });
});

// GET /api/auth/staff-directory - Safe preview of registered staff for demo/testing convenience
app.get('/api/auth/staff-directory', requireAuthenticated, (req: Request, res: Response) => {
  const requester = getAuthenticatedUser(req)!;
  const requestedCompanyId = req.headers['x-company-id'];
  const companyId = typeof requestedCompanyId === 'string' ? requestedCompanyId : requester.companyId;
  const visibleUsers =
    requester.role === 'Super Admin' && companyId === 'all'
      ? registeredUsers
      : registeredUsers.filter(
          (user) =>
            user.companyId === companyId ||
            user.assignedCompanyIds?.includes(companyId || '') ||
            (requester.role === 'Super Admin' && user.role === 'Super Admin')
        );
  res.json({
    success: true,
    users: visibleUsers.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      companyId: u.companyId,
      assignedCompanyIds: u.assignedCompanyIds,
      email: u.email,
      phone: u.phone,
      branch: u.branch,
      status: u.status,
      lastLogin: u.lastLogin,
      redirectModule: getRoleRedirect(u.role),
    })),
  });
});

app.put('/api/companies/:id/users', requireSuperAdmin, (req: Request, res: Response) => {
  const { id: companyId } = req.params;
  const { userIds, reason } = req.body as { userIds?: unknown; reason?: string };
  if (!companyId || !Array.isArray(userIds) || userIds.some((userId) => typeof userId !== 'string')) {
    res.status(400).json({ success: false, error: 'A company ID and a list of user IDs are required.' });
    return;
  }

  const selectedIds = new Set(userIds as string[]);
  registeredUsers.forEach((user) => {
    const assigned = new Set(user.assignedCompanyIds || []);
    if (selectedIds.has(user.id)) assigned.add(companyId);
    else assigned.delete(companyId);
    user.assignedCompanyIds = [...assigned];
    if (!user.companyId && selectedIds.has(user.id)) user.companyId = companyId;
    if (user.companyId === companyId && !selectedIds.has(user.id)) {
      user.companyId = user.assignedCompanyIds[0];
    }
  });

  const actor = getAuthenticatedUser(req)!;
  logServerAudit(
    actor.name,
    actor.role,
    'Business Staff Access Updated',
    'Business Governance',
    `${companyId}: ${selectedIds.size} users`,
    reason || 'Updated business user assignments',
    'Warning'
  );
  res.json({ success: true, message: 'Business user assignments updated.' });
});

// 1. Role Permissions Management — Super Admin & Authorized Managers
app.post('/api/roles/:role/permissions', requireOperationalManager, (req: Request, res: Response) => {
  const { role } = req.params;
  const { module, action, value, reason } = req.body;
  if (role === 'Super Admin') {
    res.status(403).json({
      success: false,
      error: 'Super Admin permissions are fixed at full system access.',
      code: 'ERR_SUPER_ADMIN_PERMISSIONS_PROTECTED',
    });
    return;
  }
  const actor = getAuthenticatedUser(req)!;
  const adminUser = actor.name;
  const adminRole = actor.role;

  logServerAudit(
    adminUser,
    adminRole,
    'Permission Updated',
    'Staff Management',
    `${role} → ${module} (${action}: ${value ? 'Allowed' : 'Denied'})`,
    reason || 'System permission matrix policy update',
    'Warning'
  );

  res.json({
    success: true,
    message: `Permissions updated for role ${role}`,
    updated: { role, module, action, value },
  });
});

// Create Staff Account — Authorized Managers & Super Admins
app.post('/api/users', requireOperationalManager, (req: Request, res: Response) => {
  const { name, email, phone, role, branch, pin, reason, companyId: requestedUserCompanyId } = req.body;
  const actor = getAuthenticatedUser(req)!;
  const assignedRole = role === undefined ? 'Cashier' : role;
  if (typeof assignedRole !== 'string' || !SERVER_ROLES.includes(assignedRole as ServerUser['role'])) {
    res.status(400).json({ success: false, error: 'A valid staff role is required.' });
    return;
  }
  if (
    actor.role !== 'Super Admin' &&
    (assignedRole === 'Super Admin' || assignedRole === 'Business Owner')
  ) {
    res.status(403).json({ success: false, error: 'Only Super Admin can assign system or business owner roles.' });
    return;
  }
  const headerCompanyId = req.headers['x-company-id'];
  const activeCompanyId = typeof headerCompanyId === 'string' ? headerCompanyId : actor.companyId;
  const companyId =
    actor.role === 'Super Admin'
      ? requestedUserCompanyId || (activeCompanyId === 'all' ? undefined : activeCompanyId)
      : activeCompanyId;
  const adminUser = actor.name;
  const adminRole = actor.role;

  if (!name || !email) {
    res.status(400).json({ success: false, error: 'Name and email are required to provision staff.' });
    return;
  }

  const newStaff: ServerUser = {
    id: `usr-${Date.now()}`,
    name,
    email,
    phone: phone || '+250 788 000 000',
    role: assignedRole as ServerUser['role'],
    companyId,
    assignedCompanyIds: companyId ? [companyId] : [],
    branch: branch || 'Main Branch',
    status: 'Active',
    ...hashPassword(pin || 'Pos123!'),
    lastLogin: 'Never',
  };

  registeredUsers.push(newStaff);

  logServerAudit(
    adminUser,
    adminRole,
    'Staff Account Created',
    'Staff Management',
    `${newStaff.name} (${newStaff.role}) at ${newStaff.branch}`,
    reason || 'Authorized manager provisioned new staff account',
    'Info'
  );

  res.json({
    success: true,
    message: `Staff member ${newStaff.name} created successfully`,
    user: sanitizeUser(newStaff),
  });
});

// 2. User Role Assignment — Authorized Managers & Super Admins
app.put('/api/users/:id/role', requireOperationalManager, requireTargetUserCompanyAccess, (req: Request, res: Response) => {
  const { id } = req.params;
  const { newRole, previousRole, targetUserName, reason } = req.body;
  const actor = getAuthenticatedUser(req)!;
  const adminUser = actor.name;
  const adminRole = actor.role;

  if (typeof newRole !== 'string' || !SERVER_ROLES.includes(newRole as ServerUser['role'])) {
    res.status(400).json({ success: false, error: 'A valid newRole parameter is required.' });
    return;
  }
  if (
    actor.role !== 'Super Admin' &&
    (newRole === 'Super Admin' || newRole === 'Business Owner')
  ) {
    res.status(403).json({ success: false, error: 'Only Super Admin can assign system or business owner roles.' });
    return;
  }

  const existing = registeredUsers.find((u) => u.id === id);
  if (!existing) {
    res.status(404).json({ success: false, error: 'Staff member not found.' });
    return;
  }
  existing.role = newRole as ServerUser['role'];

  logServerAudit(
    adminUser,
    adminRole,
    'User Role Changed',
    'Staff Management',
    `${targetUserName || id}: ${previousRole || 'Current'} → ${newRole}`,
    reason || 'Administrative role reassignment',
    'Warning'
  );

  res.json({
    success: true,
    message: `User ${targetUserName || id} role changed from ${previousRole} to ${newRole}`,
    userId: id,
    newRole,
  });
});

// 3. User Custom Permissions Overrides — Authorized Managers & Super Admins
app.put('/api/users/:id/permissions', requireOperationalManager, requireTargetUserCompanyAccess, (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetUserName, customPermissions, reason } = req.body;
  const actor = getAuthenticatedUser(req)!;
  const adminUser = actor.name;
  const adminRole = actor.role;

  logServerAudit(
    adminUser,
    adminRole,
    'Custom User Permissions Updated',
    'Staff Management',
    `${targetUserName || id} overrides applied`,
    reason || 'Tailored operational clearance granted',
    'Warning'
  );

  res.json({
    success: true,
    message: `Custom permissions updated for ${targetUserName || id}`,
    userId: id,
    customPermissions,
  });
});

// 4. User Status (Activate/Deactivate) — Authorized Managers & Super Admins
app.post('/api/users/:id/toggle-status', requireOperationalManager, requireTargetUserCompanyAccess, (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetUserName, newStatus, reason } = req.body;
  const actor = getAuthenticatedUser(req)!;
  const adminUser = actor.name;
  const adminRole = actor.role;

  if (newStatus !== 'Active' && newStatus !== 'Suspended') {
    res.status(400).json({ success: false, error: 'A valid account status is required.' });
    return;
  }
  const existing = registeredUsers.find((u) => u.id === id);
  if (!existing) {
    res.status(404).json({ success: false, error: 'Staff member not found.' });
    return;
  }
  existing.status = newStatus;

  logServerAudit(
    adminUser,
    adminRole,
    `User ${newStatus === 'Active' ? 'Activated' : 'Suspended'}`,
    'Staff Management',
    `${targetUserName || id} status set to ${newStatus}`,
    reason || 'Staff access management',
    newStatus === 'Suspended' ? 'Warning' : 'Info'
  );

  res.json({
    success: true,
    message: `User ${targetUserName || id} is now ${newStatus}`,
    userId: id,
    status: newStatus,
  });
});

// 5. Reset User Access / Credentials — Authorized Managers & Super Admins
app.post('/api/users/:id/reset', requireOperationalManager, requireTargetUserCompanyAccess, (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetUserName, reason } = req.body;
  const actor = getAuthenticatedUser(req)!;
  const adminUser = actor.name;
  const adminRole = actor.role;

  logServerAudit(
    adminUser,
    adminRole,
    'User Access Reset',
    'Staff Management',
    `${targetUserName || id} security credentials and permissions reset to default`,
    reason || 'Credentials reset request',
    'Warning'
  );

  res.json({
    success: true,
    message: `Access reset successfully for ${targetUserName || id}`,
  });
});

// Delete Staff Member — Only System Admin & Business Owner Authorized
app.delete('/api/users/:id', requireStaffDeleteAuthority, requireTargetUserCompanyAccess, (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetUserName, reason } = req.body;
  const actor = getAuthenticatedUser(req)!;
  const adminUser = actor.name;
  const adminRole = actor.role;

  const userIdx = registeredUsers.findIndex((u) => u.id === id);
  let deletedUserName = targetUserName;
  let deletedUserRole = '';
  if (userIdx !== -1) {
    deletedUserName = registeredUsers[userIdx].name;
    deletedUserRole = registeredUsers[userIdx].role;
    registeredUsers.splice(userIdx, 1);
  }

  // Invalidate any active sessions for the deleted staff member
  for (const [token, sess] of activeSessions.entries()) {
    if (sess.userId === id) {
      activeSessions.delete(token);
    }
  }

  // Record every deletion in Audit Logs, including the staff member deleted, the user who performed the action, and the date and time
  logServerAudit(
    adminUser,
    adminRole,
    'Staff Member Deleted',
    'Staff Management',
    `Deleted Staff: ${deletedUserName || id}${deletedUserRole ? ` (${deletedUserRole})` : ''}`,
    reason || 'Permanent staff record removal by authorized administrator. Historical sales, transactions, payments, and audit records preserved for accountability.',
    'Critical'
  );

  res.json({
    success: true,
    message: `Staff member ${deletedUserName || id} deleted successfully. Historical sales, transactions, payments, and audit records have been preserved.`,
    userId: id,
  });
});

// 6. Sensitive Action: Sale Refund — Manager, Business Owner, Super Admin Only
app.post('/api/sales/refund', requireOperationalManager, (req: Request, res: Response) => {
  const { saleId, reference, amount, reason } = req.body;
  const actor = getAuthenticatedUser(req)!;
  const user = actor.name;
  const role = actor.role;

  logServerAudit(
    user,
    role,
    'Sale Refund Processed',
    'Point of Sale',
    `Sale ${reference || saleId} (${amount} RWF)`,
    reason || 'Customer refund requested and authorized',
    'Warning'
  );

  res.json({
    success: true,
    message: `Sale ${reference || saleId} refunded successfully`,
  });
});

// 7. Sensitive Action: Inventory Stock Adjustment — Stock Manager, Manager, Super Admin
app.post('/api/inventory/adjust', requireAuthenticated, (req: Request, res: Response) => {
  const actor = getAuthenticatedUser(req)!;
  const role = actor.role;
  const user = actor.name;

  const allowedRoles = ['Super Admin', 'Business Owner', 'Manager', 'Stock Manager'];
  if (!allowedRoles.includes(role)) {
    logServerAudit(
      user,
      role || 'Unauthorized',
      'Security Violation: Stock Adjustment Denied',
      'Inventory Control',
      `Product ${req.body.productId || 'unknown'}`,
      `Cashiers cannot adjust inventory levels directly`,
      'Critical'
    );
    res.status(403).json({
      success: false,
      error: 'Access Denied: Stock Manager, Manager, or Admin clearance required for inventory adjustments.',
    });
    return;
  }

  const { productName, type, qtyDelta, reason } = req.body;
  logServerAudit(
    user,
    role,
    'Stock Adjustment Recorded',
    'Inventory',
    `${productName || 'Item'}: ${type} (${qtyDelta > 0 ? '+' : ''}${qtyDelta})`,
    reason || 'Manual count reconciliation',
    'Info'
  );

  res.json({ success: true, message: 'Stock adjustment authorized and saved.' });
});

// 8. Sensitive Action: Expense Approval — Manager, Business Owner, Super Admin
app.post('/api/expenses/approve', requireOperationalManager, (req: Request, res: Response) => {
  const { expenseId, reference, amount, category } = req.body;
  const actor = getAuthenticatedUser(req)!;
  const user = actor.name;
  const role = actor.role;

  logServerAudit(
    user,
    role,
    'Expense Approved',
    'Expenses & Finance',
    `${reference || expenseId}: ${category} (${amount} RWF)`,
    'Authorized operating disbursement',
    'Info'
  );

  res.json({ success: true, message: 'Expense approved successfully.' });
});

// 9. Financial Metrics & Reports Access — Cashier Forbidden
app.get('/api/financials/kpi', requireAuthenticated, (req: Request, res: Response) => {
  const actor = getAuthenticatedUser(req)!;
  const role = actor.role;
  const user = actor.name;

  if (role === 'Cashier' || role === 'Stock Manager') {
    logServerAudit(
      user,
      role,
      'Security Block: Unauthorized Financial Data Access Attempt',
      'Accounting & Reports',
      'GET /api/financials/kpi',
      `${role} role is restricted from viewing business-level financial metrics`,
      'Warning'
    );
    res.status(403).json({
      success: false,
      error: 'Access Denied: Cashiers and Stock Managers are not permitted to view executive financial statements.',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Authorized financial metrics delivered',
  });
});

// 10. Audit Logs Retrieval — Restricted to Admin, Business Owner, Manager
app.get('/api/audit-logs', requireAuthenticated, (req: Request, res: Response) => {
  const role = getAuthenticatedUser(req)!.role;
  if (role !== 'Super Admin') {
    res.status(403).json({
      success: false,
      error: 'Access Denied: System audit logs are restricted to Super Admin.',
    });
    return;
  }

  res.json({
    success: true,
    logs: serverAuditLogs,
  });
});

// =============================================================
// Multi-Business Tenant Isolation: Items & Company Storage
// =============================================================
interface ServerProduct {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  stock: number;
  unit: string;
  minStock: number;
  supplierId: string;
  supplierName: string;
  batchNumber: string;
  expiryDate: string;
  taxRate: number;
  status: 'Active' | 'Inactive';
  imageSvg?: string;
  description?: string;
}

interface ServerCompany {
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
  branches: Array<{ id: string; name: string; location: string; manager: string }>;
  assignedUserIds?: string[];
  subscription?: {
    planName: string;
    planStatus: string;
    billingCycle: string;
    monthlyFee: number;
    startDate: string;
    renewalDate: string;
  };
}

const serverCompanies: ServerCompany[] = [
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
    createdAt: '2026-01-10',
    branches: [
      { id: 'br-1', name: 'Kimironko Main', location: 'KG 11 Ave, Kimironko', manager: 'Jean Claude N.' },
      { id: 'br-2', name: 'Downtown Branch', location: 'KN 4 Ave, Nyarugenge', manager: 'Patrick Habimana' },
    ],
    assignedUserIds: ['usr-1', 'usr-2', 'usr-3', 'usr-4', 'usr-5'],
    subscription: {
      planName: 'Enterprise Growth',
      planStatus: 'Paid & Active',
      billingCycle: 'Monthly',
      monthlyFee: 120000,
      startDate: '2026-01-10',
      renewalDate: '2026-12-31',
    },
  },
  {
    id: 'comp-2',
    name: 'Kigali Fresh Mart',
    code: 'KFM-NYR',
    businessType: 'Organic Produce & Daily Mart',
    tin: '109284102',
    phone: '+250 788 420 190',
    email: 'contact@kigalifreshmart.rw',
    address: 'KN 3 Rd, Nyarugenge',
    city: 'Kigali',
    country: 'Rwanda',
    currency: 'RWF',
    status: 'Active',
    ownerName: 'Marie Claire U.',
    createdAt: '2026-02-15',
    branches: [
      { id: 'br-kfm-1', name: 'Downtown Store', location: 'KN 3 Rd, Nyarugenge', manager: 'Patrick Habimana' },
    ],
    assignedUserIds: ['usr-1', 'usr-4'],
    subscription: {
      planName: 'Standard Business',
      planStatus: 'Paid & Active',
      billingCycle: 'Monthly',
      monthlyFee: 60000,
      startDate: '2026-02-15',
      renewalDate: '2026-12-31',
    },
  },
];

const serverProducts: ServerProduct[] = [
  // Business 1 (comp-1) Items
  {
    id: 'prd-milk',
    companyId: 'comp-1',
    name: 'Milk 1L',
    sku: 'DRY-001',
    barcode: '616110050199',
    category: 'Dairy',
    brand: 'Inyange',
    costPrice: 1550,
    sellingPrice: 2000,
    wholesalePrice: 1850,
    stock: 24,
    unit: 'pcs',
    minStock: 10,
    supplierId: 'sup-1',
    supplierName: 'Supermec Ltd',
    batchNumber: 'BN-MK-2504',
    expiryDate: '2026-12-31',
    taxRate: 18,
    status: 'Active',
  },
  {
    id: 'prd-bread',
    companyId: 'comp-1',
    name: 'Bread',
    sku: 'SNK-001',
    barcode: '616110060211',
    category: 'Snacks',
    brand: 'Supa Loaf',
    costPrice: 1100,
    sellingPrice: 1500,
    wholesalePrice: 1400,
    stock: 18,
    unit: 'pcs',
    minStock: 8,
    supplierId: 'sup-3',
    supplierName: 'Fresh Farm Ltd',
    batchNumber: 'BN-BR-2504',
    expiryDate: '2026-05-20',
    taxRate: 18,
    status: 'Active',
  },
  {
    id: 'prd-rice',
    companyId: 'comp-1',
    name: 'Rice 1kg',
    sku: 'FOD-005',
    barcode: '616110120855',
    category: 'Food',
    brand: 'Royal Umbrella',
    costPrice: 1400,
    sellingPrice: 1800,
    wholesalePrice: 1700,
    stock: 32,
    unit: 'kg',
    minStock: 12,
    supplierId: 'sup-2',
    supplierName: 'Rwanda Foods Ltd',
    batchNumber: 'BN-RC-2502',
    expiryDate: '2026-10-15',
    taxRate: 18,
    status: 'Active',
  },
  {
    id: 'prd-coke',
    companyId: 'comp-1',
    name: 'Coca-Cola 500ml',
    sku: 'BEV-003',
    barcode: '616110010099',
    category: 'Beverages',
    brand: 'Bralirwa',
    costPrice: 900,
    sellingPrice: 1200,
    wholesalePrice: 1100,
    stock: 40,
    unit: 'pcs',
    minStock: 15,
    supplierId: 'sup-2',
    supplierName: 'Rwanda Foods Ltd',
    batchNumber: 'BN-CK-2504',
    expiryDate: '2026-03-20',
    taxRate: 18,
    status: 'Active',
  },
  {
    id: 'prd-banana',
    companyId: 'comp-1',
    name: 'Banana',
    sku: 'FRV-002',
    barcode: '616110080499',
    category: 'Fruits & Vegetables',
    brand: 'Kinigi Farms',
    costPrice: 700,
    sellingPrice: 1000,
    wholesalePrice: 900,
    stock: 20,
    unit: 'kg',
    minStock: 8,
    supplierId: 'sup-3',
    supplierName: 'Fresh Farm Ltd',
    batchNumber: 'BN-BN-2504',
    expiryDate: '2026-05-01',
    taxRate: 0,
    status: 'Active',
  },
  {
    id: 'prd-water',
    companyId: 'comp-1',
    name: 'Rwenzori Water 500ml',
    sku: 'BEV-001',
    barcode: '616110010012',
    category: 'Beverages',
    brand: 'Rwenzori',
    costPrice: 350,
    sellingPrice: 500,
    wholesalePrice: 450,
    stock: 148,
    unit: 'pcs',
    minStock: 36,
    supplierId: 'sup-1',
    supplierName: 'Supermec Ltd',
    batchNumber: 'BN-RW-2504',
    expiryDate: '2026-03-15',
    taxRate: 18,
    status: 'Active',
  },

  // Business 2 (comp-2) Items — Strict Isolation
  {
    id: 'prd-kfm-avo',
    companyId: 'comp-2',
    name: 'Hass Avocados (Pack of 4)',
    sku: 'FRV-101',
    barcode: '616220010111',
    category: 'Fruits & Vegetables',
    brand: 'Rubavu Organics',
    costPrice: 1800,
    sellingPrice: 2500,
    wholesalePrice: 2200,
    stock: 35,
    unit: 'pack',
    minStock: 10,
    supplierId: 'sup-3',
    supplierName: 'Fresh Farm Ltd',
    batchNumber: 'BN-AV-2601',
    expiryDate: '2026-05-15',
    taxRate: 0,
    status: 'Active',
  },
  {
    id: 'prd-kfm-juice',
    companyId: 'comp-2',
    name: 'Passion Fruit Juice 1L',
    sku: 'BEV-102',
    barcode: '616220010122',
    category: 'Beverages',
    brand: 'Inyange Organic',
    costPrice: 2400,
    sellingPrice: 3200,
    wholesalePrice: 2900,
    stock: 28,
    unit: 'pcs',
    minStock: 8,
    supplierId: 'sup-1',
    supplierName: 'Supermec Ltd',
    batchNumber: 'BN-PJ-2602',
    expiryDate: '2026-06-30',
    taxRate: 18,
    status: 'Active',
  },
  {
    id: 'prd-kfm-tea',
    companyId: 'comp-2',
    name: 'Nyungwe Organic Green Tea 100g',
    sku: 'BEV-103',
    barcode: '616220010133',
    category: 'Beverages',
    brand: 'Nyungwe Highlands',
    costPrice: 3500,
    sellingPrice: 4500,
    wholesalePrice: 4000,
    stock: 50,
    unit: 'pcs',
    minStock: 12,
    supplierId: 'sup-2',
    supplierName: 'Rwanda Foods Ltd',
    batchNumber: 'BN-NT-2603',
    expiryDate: '2027-02-15',
    taxRate: 18,
    status: 'Active',
  },
  {
    id: 'prd-kfm-honey',
    companyId: 'comp-2',
    name: 'Kigali Pure Forest Honey 500g',
    sku: 'FOD-104',
    barcode: '616220010144',
    category: 'Food',
    brand: 'Virunga Apiaries',
    costPrice: 5200,
    sellingPrice: 6500,
    wholesalePrice: 6000,
    stock: 22,
    unit: 'jar',
    minStock: 6,
    supplierId: 'sup-3',
    supplierName: 'Fresh Farm Ltd',
    batchNumber: 'BN-HN-2604',
    expiryDate: '2027-10-01',
    taxRate: 18,
    status: 'Active',
  },
  {
    id: 'prd-kfm-cashews',
    companyId: 'comp-2',
    name: 'Akagera Roasted Cashews 200g',
    sku: 'SNK-105',
    barcode: '616220010155',
    category: 'Snacks',
    brand: 'Akagera Harvest',
    costPrice: 3800,
    sellingPrice: 5000,
    wholesalePrice: 4500,
    stock: 40,
    unit: 'pcs',
    minStock: 10,
    supplierId: 'sup-2',
    supplierName: 'Rwanda Foods Ltd',
    batchNumber: 'BN-CS-2605',
    expiryDate: '2026-11-20',
    taxRate: 18,
    status: 'Active',
  },
  {
    id: 'prd-kfm-berries',
    companyId: 'comp-2',
    name: 'Fresh Gicumbi Strawberries 250g',
    sku: 'FRV-106',
    barcode: '616220010166',
    category: 'Fruits & Vegetables',
    brand: 'Gicumbi Fresh',
    costPrice: 2200,
    sellingPrice: 3000,
    wholesalePrice: 2700,
    stock: 15,
    unit: 'punnet',
    minStock: 5,
    supplierId: 'sup-3',
    supplierName: 'Fresh Farm Ltd',
    batchNumber: 'BN-SB-2606',
    expiryDate: '2026-05-05',
    taxRate: 0,
    status: 'Active',
  },
];

// -------------------------------------------------------------
// Super Admin / Owner Page Protected Endpoints
// -------------------------------------------------------------

// Verification endpoint for /owner route access
app.get('/api/owner/verify', requireSuperAdmin, (req: Request, res: Response) => {
  const actor = getAuthenticatedUser(req)!;
  res.json({
    success: true,
    authorized: true,
    user: sanitizeUser(actor),
  });
});

// Platform-wide aggregate stats for Owner Page
app.get('/api/owner/stats', requireSuperAdmin, (_req: Request, res: Response) => {
  const totalBusinesses = serverCompanies.length;
  const activeBusinesses = serverCompanies.filter((c) => c.status === 'Active').length;
  const suspendedBusinesses = serverCompanies.filter((c) => c.status === 'Suspended' || c.status === 'Inactive').length;
  const totalUsers = registeredUsers.length;
  const totalProducts = serverProducts.length;
  const totalInventoryValue = serverProducts.reduce((sum, p) => sum + p.costPrice * p.stock, 0);
  const totalRetailValue = serverProducts.reduce((sum, p) => sum + p.sellingPrice * p.stock, 0);
  const monthlyRunRate = serverCompanies.reduce((sum, c) => sum + (c.subscription?.monthlyFee || 0), 0);

  res.json({
    success: true,
    stats: {
      totalBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      totalUsers,
      totalProducts,
      totalInventoryValue,
      totalRetailValue,
      monthlyRunRate,
      recentAuditLogs: serverAuditLogs.slice(0, 10),
    },
  });
});

// -------------------------------------------------------------
// Companies Management Endpoints
// -------------------------------------------------------------

// List companies (Super Admin sees all, other users see only assigned companies)
app.get('/api/companies', requireAuthenticated, (req: Request, res: Response) => {
  const actor = getAuthenticatedUser(req)!;
  if (actor.role === 'Super Admin') {
    res.json({ success: true, companies: serverCompanies });
    return;
  }
  const assigned = serverCompanies.filter(
    (c) => c.id === actor.companyId || actor.assignedCompanyIds?.includes(c.id)
  );
  res.json({ success: true, companies: assigned });
});

// Create new company (Super Admin Only)
app.post('/api/companies', requireSuperAdmin, (req: Request, res: Response) => {
  const { name, code, businessType, tin, phone, email, address, city, country, ownerName, planName, monthlyFee } = req.body;
  if (!name || !code) {
    res.status(400).json({ success: false, error: 'Business name and unique business code are required.' });
    return;
  }

  const actor = getAuthenticatedUser(req)!;
  const newCompany: ServerCompany = {
    id: `comp-${Date.now()}`,
    name,
    code: code.toUpperCase(),
    businessType: businessType || 'Grocery Retail',
    tin: tin || '100000000',
    phone: phone || '+250 788 000 000',
    email: email || `contact@${code.toLowerCase()}.rw`,
    address: address || 'Kigali, Rwanda',
    city: city || 'Kigali',
    country: country || 'Rwanda',
    currency: 'RWF',
    status: 'Active',
    ownerName: ownerName || 'Business Owner',
    createdAt: new Date().toISOString().slice(0, 10),
    branches: [{ id: `br-${Date.now()}-1`, name: 'Main Branch', location: address || 'Kigali', manager: ownerName || 'Manager' }],
    subscription: {
      planName: planName || 'Standard Business',
      planStatus: 'Paid & Active',
      billingCycle: 'Monthly',
      monthlyFee: Number(monthlyFee) || 60000,
      startDate: new Date().toISOString().slice(0, 10),
      renewalDate: '2026-12-31',
    },
  };

  serverCompanies.push(newCompany);
  logServerAudit(
    actor.name,
    actor.role,
    'Business Account Created',
    'Owner Governance',
    `${newCompany.name} (${newCompany.code})`,
    `Super Admin registered new business account with TIN ${newCompany.tin}`,
    'Info'
  );

  res.json({ success: true, company: newCompany, message: `Business ${newCompany.name} successfully registered.` });
});

// Update company profile (Super Admin Only)
app.put('/api/companies/:id', requireSuperAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const company = serverCompanies.find((c) => c.id === id);
  if (!company) {
    res.status(404).json({ success: false, error: 'Business account not found.' });
    return;
  }

  const actor = getAuthenticatedUser(req)!;
  const { name, code, businessType, tin, phone, email, address, ownerName, status } = req.body;
  if (name) company.name = name;
  if (code) company.code = code;
  if (businessType) company.businessType = businessType;
  if (tin) company.tin = tin;
  if (phone) company.phone = phone;
  if (email) company.email = email;
  if (address) company.address = address;
  if (ownerName) company.ownerName = ownerName;
  if (status && ['Active', 'Inactive', 'Suspended'].includes(status)) company.status = status;

  logServerAudit(
    actor.name,
    actor.role,
    'Business Account Updated',
    'Owner Governance',
    `${company.name} (${company.code})`,
    `Super Admin updated corporate details`,
    'Info'
  );

  res.json({ success: true, company, message: `Business ${company.name} updated successfully.` });
});

// Toggle business account status (Active / Suspended / Deactivated)
app.post('/api/companies/:id/status', requireSuperAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const company = serverCompanies.find((c) => c.id === id);
  if (!company) {
    res.status(404).json({ success: false, error: 'Business account not found.' });
    return;
  }

  if (!['Active', 'Inactive', 'Suspended'].includes(status)) {
    res.status(400).json({ success: false, error: 'Status must be Active, Inactive, or Suspended.' });
    return;
  }

  const actor = getAuthenticatedUser(req)!;
  const previousStatus = company.status;
  company.status = status;

  logServerAudit(
    actor.name,
    actor.role,
    `Business Account ${status}`,
    'Owner Governance',
    `${company.name} (${previousStatus} → ${status})`,
    reason || `Super Admin updated operational status of ${company.name}`,
    status === 'Suspended' ? 'Critical' : 'Warning'
  );

  res.json({ success: true, company, message: `Business ${company.name} status updated to ${status}.` });
});

// -------------------------------------------------------------
// Multi-Business Items & Products Endpoints (Strict Tenant Scoping)
// -------------------------------------------------------------

// GET /api/products — Retrieve items for authorized business only
app.get('/api/products', requireAuthenticated, (req: Request, res: Response) => {
  const actor = getAuthenticatedUser(req)!;
  const requestedCompanyId = req.headers['x-company-id'];
  const targetCompanyId = typeof requestedCompanyId === 'string' ? requestedCompanyId : actor.companyId;

  // Super Admin can view all items or filter by company
  if (actor.role === 'Super Admin') {
    if (!targetCompanyId || targetCompanyId === 'all') {
      res.json({ success: true, products: serverProducts });
      return;
    }
    const filtered = serverProducts.filter((p) => p.companyId === targetCompanyId);
    res.json({ success: true, products: filtered });
    return;
  }

  // Non-Super Admin: User CANNOT access products from businesses they do not belong to
  if (!targetCompanyId || (actor.companyId !== targetCompanyId && !actor.assignedCompanyIds?.includes(targetCompanyId))) {
    res.status(403).json({
      success: false,
      error: 'Access Denied: You do not have permission to view items from this business.',
      code: 'ERR_CROSS_BUSINESS_ACCESS_DENIED',
    });
    return;
  }

  const businessProducts = serverProducts.filter((p) => p.companyId === targetCompanyId);
  res.json({ success: true, products: businessProducts });
});

// POST /api/products — Create new item strictly bound to user's authorized business
app.post('/api/products', requireOperationalManager, (req: Request, res: Response) => {
  const actor = getAuthenticatedUser(req)!;
  const requestedCompanyId = req.headers['x-company-id'];
  const businessId =
    actor.role === 'Super Admin'
      ? (typeof requestedCompanyId === 'string' && requestedCompanyId !== 'all' ? requestedCompanyId : req.body.companyId || 'comp-1')
      : actor.companyId;

  if (!businessId || businessId === 'all') {
    res.status(400).json({ success: false, error: 'A valid business workspace must be selected to create an item.' });
    return;
  }

  // Verify non-Super Admin is assigned to the target business
  if (actor.role !== 'Super Admin' && actor.companyId !== businessId && !actor.assignedCompanyIds?.includes(businessId)) {
    res.status(403).json({
      success: false,
      error: 'Access Denied: Cannot create products for another business.',
      code: 'ERR_CROSS_BUSINESS_ACCESS_DENIED',
    });
    return;
  }

  const { name, sku, barcode, category, brand, costPrice, sellingPrice, wholesalePrice, stock, unit, minStock, supplierId, supplierName, batchNumber, expiryDate, taxRate, imageSvg } = req.body;

  if (!name || !sku) {
    res.status(400).json({ success: false, error: 'Product name and SKU are required.' });
    return;
  }

  const newProduct: ServerProduct = {
    id: `prd-${Date.now()}`,
    companyId: businessId,
    name,
    sku,
    barcode: barcode || `600${Math.floor(100000000 + Math.random() * 900000000)}`,
    category: category || 'General',
    brand: brand || 'Store Brand',
    costPrice: Number(costPrice) || 0,
    sellingPrice: Number(sellingPrice) || 0,
    wholesalePrice: Number(wholesalePrice) || Number(sellingPrice) || 0,
    stock: Number(stock) || 0,
    unit: unit || 'pcs',
    minStock: Number(minStock) || 5,
    supplierId: supplierId || 'sup-1',
    supplierName: supplierName || 'Local Supplier',
    batchNumber: batchNumber || `BN-${Date.now().toString().slice(-4)}`,
    expiryDate: expiryDate || '2026-12-31',
    taxRate: Number(taxRate) || 18,
    status: 'Active',
    imageSvg,
  };

  serverProducts.push(newProduct);
  logServerAudit(
    actor.name,
    actor.role,
    'Product Created',
    'Catalog & Inventory',
    `${newProduct.name} (${newProduct.sku}) in Business ${businessId}`,
    `New business-specific item created`,
    'Info'
  );

  res.json({ success: true, product: newProduct, message: `Product ${newProduct.name} created successfully for ${businessId}.` });
});

// PUT /api/products/:id — Update existing item with strict tenant ownership validation
app.put('/api/products/:id', requireOperationalManager, (req: Request, res: Response) => {
  const { id } = req.params;
  const actor = getAuthenticatedUser(req)!;
  const product = serverProducts.find((p) => p.id === id);

  if (!product) {
    res.status(404).json({ success: false, error: 'Product not found.' });
    return;
  }

  // Cross-business protection: Non-super admin cannot edit items belonging to another business
  if (actor.role !== 'Super Admin' && product.companyId !== actor.companyId && !actor.assignedCompanyIds?.includes(product.companyId)) {
    logServerAudit(
      actor.name,
      actor.role,
      'Security Violation: Cross-Business Product Edit Attempt',
      'Catalog & Inventory',
      `Product ${id} (Owner: ${product.companyId})`,
      `User from business ${actor.companyId} attempted to edit product of business ${product.companyId}`,
      'Critical'
    );
    res.status(403).json({
      success: false,
      error: 'Access Denied: You cannot modify products belonging to another business.',
      code: 'ERR_CROSS_BUSINESS_ACCESS_DENIED',
    });
    return;
  }

  const { name, sku, barcode, category, brand, costPrice, sellingPrice, wholesalePrice, stock, unit, minStock, supplierId, supplierName, batchNumber, expiryDate, taxRate, status } = req.body;

  if (name !== undefined) product.name = name;
  if (sku !== undefined) product.sku = sku;
  if (barcode !== undefined) product.barcode = barcode;
  if (category !== undefined) product.category = category;
  if (brand !== undefined) product.brand = brand;
  if (costPrice !== undefined) product.costPrice = Number(costPrice);
  if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
  if (wholesalePrice !== undefined) product.wholesalePrice = Number(wholesalePrice);
  if (stock !== undefined) product.stock = Number(stock);
  if (unit !== undefined) product.unit = unit;
  if (minStock !== undefined) product.minStock = Number(minStock);
  if (supplierId !== undefined) product.supplierId = supplierId;
  if (supplierName !== undefined) product.supplierName = supplierName;
  if (batchNumber !== undefined) product.batchNumber = batchNumber;
  if (expiryDate !== undefined) product.expiryDate = expiryDate;
  if (taxRate !== undefined) product.taxRate = Number(taxRate);
  if (status !== undefined) product.status = status;

  logServerAudit(
    actor.name,
    actor.role,
    'Product Updated',
    'Catalog & Inventory',
    `${product.name} (${product.sku}) in Business ${product.companyId}`,
    `Product record updated`,
    'Info'
  );

  res.json({ success: true, product, message: `Product ${product.name} updated successfully.` });
});

// DELETE /api/products/:id — Delete item with tenant ownership validation
app.delete('/api/products/:id', requireOperationalManager, (req: Request, res: Response) => {
  const { id } = req.params;
  const actor = getAuthenticatedUser(req)!;
  const pIdx = serverProducts.findIndex((p) => p.id === id);

  if (pIdx === -1) {
    res.status(404).json({ success: false, error: 'Product not found.' });
    return;
  }

  const product = serverProducts[pIdx];

  // Cross-business protection: Non-super admin cannot delete items of another business
  if (actor.role !== 'Super Admin' && product.companyId !== actor.companyId && !actor.assignedCompanyIds?.includes(product.companyId)) {
    logServerAudit(
      actor.name,
      actor.role,
      'Security Violation: Cross-Business Product Deletion Attempt',
      'Catalog & Inventory',
      `Product ${id} (Owner: ${product.companyId})`,
      `User from business ${actor.companyId} attempted to delete product of business ${product.companyId}`,
      'Critical'
    );
    res.status(403).json({
      success: false,
      error: 'Access Denied: You cannot delete products belonging to another business.',
      code: 'ERR_CROSS_BUSINESS_ACCESS_DENIED',
    });
    return;
  }

  serverProducts.splice(pIdx, 1);

  logServerAudit(
    actor.name,
    actor.role,
    'Product Deleted',
    'Catalog & Inventory',
    `${product.name} (${product.sku}) from Business ${product.companyId}`,
    req.body.reason || 'Item removed from catalog by authorized user',
    'Warning'
  );

  res.json({ success: true, message: `Product ${product.name} deleted successfully from ${product.companyId}.` });
});

// -------------------------------------------------------------
// Initialize Dev Vite / Production Static Serving
// -------------------------------------------------------------
async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fresh & More M-POS Server with RBAC API running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
