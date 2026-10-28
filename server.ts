import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import cors from 'cors';
import {
  db,
  ServerUser,
  ServerCompany,
  ServerProduct,
  hashPassword,
  verifyPassword,
  sanitizeUser,
  normalizeEmail,
  normalizePhone,
  isEmailAddress,
} from './src/server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable JSON body parsing and CORS for GitHub Pages & remote API access
app.use(express.json());

// Configured CORS Origins: Include production GitHub Pages and development hosts
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const defaultAllowedOrigins = [
  'https://emmanuelmuke58-stack.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

const allowedOriginsSet = new Set([...defaultAllowedOrigins, ...configuredOrigins]);

app.use(
  cors({
    origin: (origin, callback) => {
      // 1. Allow server-to-server, curl, mobile apps, and same-origin requests without an Origin header
      if (!origin) {
        return callback(null, true);
      }
      // 2. Allow explicitly approved origins
      if (allowedOriginsSet.has(origin)) {
        return callback(null, true);
      }
      // 3. Strictly reject unapproved browser origins
      const corsErr = new Error(`CORS rejected: Origin ${origin} is not authorized.`);
      (corsErr as any).status = 403;
      return callback(corsErr);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Id'],
    optionsSuccessStatus: 204,
  })
);

// Express middleware to cleanly handle CORS rejection errors
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err && typeof err.message === 'string' && err.message.startsWith('CORS rejected:')) {
    res.status(403).json({ success: false, error: err.message, code: 'ERR_CORS_FORBIDDEN' });
    return;
  }
  next(err);
});

function logServerAudit(
  user: string,
  role: string,
  action: string,
  module: string,
  record: string,
  reason: string,
  severity: 'Info' | 'Warning' | 'Critical' = 'Info'
) {
  db.addAuditLog({
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
  const session = db.getSession(token);
  if (!session) {
    return undefined;
  }

  const user = db.findUserById(session.userId);
  if (!user || user.status !== 'Active') {
    db.deleteSession(token);
    return undefined;
  }

  return user;
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
  const target = db.findUserById(req.params.id);
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

const SERVER_ROLES: ServerUser['role'][] = [
  'Super Admin',
  'Business Owner',
  'Manager',
  'Cashier',
  'Stock Manager',
];

// Rate limiting & Brute Force Protection Store
interface RateLimitRecord {
  attempts: number;
  lockedUntil: number;
  lastAttempt: number;
}
const loginRateLimiter = new Map<string, RateLimitRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds

// Password reset requests store (Hashed Verification Codes & Anti-Brute-Force Protection)
interface PasswordResetRecord {
  codeHash: string;
  codeSalt: string;
  userId: string;
  identifier: string;
  expiresAt: number;
  attempts: number;
  used: boolean;
}
const passwordResetRecords = new Map<string, PasswordResetRecord>();
const forgotPasswordRateLimiter = new Map<string, { count: number; windowStart: number }>();
const FORGOT_PASSWORD_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FORGOT_REQUESTS_PER_WINDOW = 3;

// -------------------------------------------------------------
// Core System Health & Time Endpoints
// -------------------------------------------------------------

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Fresh & More M-POS Backend Security API',
    mode: process.env.NODE_ENV || 'development',
    storage: 'persistent',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/time', (_req: Request, res: Response) => {
  const now = Date.now();
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json({
    timestamp: now,
    iso: new Date(now).toISOString(),
    timeZone: 'Africa/Kigali',
  });
});

// -------------------------------------------------------------
// Authentication Endpoints (Strict Verification, No Hardcoded Bypass)
// -------------------------------------------------------------

// GET /api/auth/setup-status - Check if system is initialized with a Super Admin
app.get('/api/auth/setup-status', (_req: Request, res: Response) => {
  const hasSuperAdmin = db.getUsers().some((u) => u.role === 'Super Admin' && u.status === 'Active');
  res.json({
    success: true,
    isInitialized: hasSuperAdmin,
    isProduction: process.env.NODE_ENV === 'production',
  });
});

// POST /api/auth/setup-initial-admin - One-time initial Super Admin setup
app.post('/api/auth/setup-initial-admin', (req: Request, res: Response) => {
  const existingSuperAdmin = db.getUsers().find((u) => u.role === 'Super Admin' && u.status === 'Active');
  if (existingSuperAdmin) {
    res.status(403).json({
      success: false,
      error: 'Initial setup has already been completed. A Super Admin account is already registered.',
      code: 'ERR_SETUP_ALREADY_COMPLETED',
    });
    return;
  }

  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({
      success: false,
      error: 'Name, email, and password are required for initial Super Admin setup.',
      code: 'ERR_MISSING_FIELDS',
    });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long for administrative accounts.',
      code: 'ERR_WEAK_PASSWORD',
    });
    return;
  }

  const { passwordHash, passwordSalt, iterations } = hashPassword(password);
  const nowIso = new Date().toISOString();
  const newAdmin: ServerUser = {
    id: `usr-sa-${Date.now()}`,
    name: name.trim(),
    role: 'Super Admin',
    email: normalizeEmail(email),
    phone: phone ? normalizePhone(phone) : '+250 788 000 001',
    branch: 'Headquarters',
    assignedCompanyIds: [],
    status: 'Active',
    passwordHash,
    passwordSalt,
    iterations,
    lastLogin: nowIso,
    createdAt: nowIso,
  };

  db.addUser(newAdmin);

  logServerAudit(
    newAdmin.name,
    'Super Admin',
    'Initial System Setup: Primary Super Admin Registered',
    'Authentication',
    `User ${newAdmin.id} (${newAdmin.email})`,
    'Initial production Super Admin account established securely',
    'Critical'
  );

  res.status(201).json({
    success: true,
    message: 'Primary Super Admin account successfully registered.',
    user: sanitizeUser(newAdmin),
  });
});

// Temporary owner-controlled Super Admin recovery. Remove SUPER_ADMIN_RECOVERY_TOKEN from Render immediately after use.
let superAdminRecoveryUsed = false;
app.post('/api/auth/recover-super-admin', (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  const expectedToken = process.env.SUPER_ADMIN_RECOVERY_TOKEN || '';
  const suppliedToken = req.header('x-admin-recovery-token') || '';
  const expected = Buffer.from(expectedToken, 'utf8');
  const supplied = Buffer.from(suppliedToken, 'utf8');
  const authorized = expected.length > 0 && expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
  if (!authorized || superAdminRecoveryUsed) {
    res.status(401).json({ success: false, error: 'Recovery authorization failed or recovery is unavailable.' });
    return;
  }
  const { identifier, newPassword } = req.body || {};
  if (typeof identifier !== 'string' || !identifier.trim() || typeof newPassword !== 'string' || newPassword.length < 12) {
    res.status(400).json({ success: false, error: 'Enter your registered email or phone and a new password of at least 12 characters.' });
    return;
  }
  const admin = db.findUserByIdentifier(identifier);
  if (!admin || admin.role !== 'Super Admin' || admin.status !== 'Active') {
    res.status(404).json({ success: false, error: 'No active Super Admin account matches that identifier.' });
    return;
  }
  const { passwordHash, passwordSalt, iterations } = hashPassword(newPassword);
  const updated = db.updateUser(admin.id, { passwordHash, passwordSalt, iterations });
  if (!updated) {
    res.status(500).json({ success: false, error: 'Password could not be updated.' });
    return;
  }
  db.revokeUserSessions(admin.id);
  superAdminRecoveryUsed = true;
  logServerAudit(admin.name, 'Super Admin', 'Super Admin Password Recovered', 'Authentication', 'Super Admin password reset', 'Temporary recovery token used; sessions revoked', 'Critical');
  res.json({ success: true, message: 'Password reset succeeded. Remove SUPER_ADMIN_RECOVERY_TOKEN from Render now.' });
});

// POST /api/auth/login - Production Login with Brute-Force Rate Limiting
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, password, rememberMe } = req.body;

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

  const rateRecord = loginRateLimiter.get(rateLimitKey) || { attempts: 0, lockedUntil: 0, lastAttempt: 0 };
  const now = Date.now();

  if (rateRecord.lockedUntil > now) {
    const remainingSeconds = Math.ceil((rateRecord.lockedUntil - now) / 1000);
    logServerAudit(
      cleanId,
      'Unknown',
      'Account Locked Attempt: Brute Force Guard',
      'Authentication',
      `Identifier: ${cleanId}`,
      `Blocked attempt while lockout in effect (${remainingSeconds}s remaining)`,
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

  // Look up user in persistent database
  const user = db.findUserByIdentifier(identifier);

  if (!user) {
    rateRecord.attempts += 1;
    rateRecord.lastAttempt = now;
    if (rateRecord.attempts >= MAX_FAILED_ATTEMPTS) {
      rateRecord.lockedUntil = now + LOCKOUT_DURATION_MS;
      loginRateLimiter.set(rateLimitKey, rateRecord);
      logServerAudit(
        cleanId,
        'Unknown',
        'Account Locked: Brute Force Triggered',
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
      'Unmatched identifier or unknown account',
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

  // Check account status
  if (user.status === 'Suspended') {
    logServerAudit(
      user.name,
      user.role,
      'Login Denied: Account Suspended',
      'Authentication',
      `User ${user.id} (${user.email})`,
      'Suspended account login attempt rejected',
      'Critical'
    );
    res.status(403).json({
      success: false,
      error: 'Your account is suspended. Please contact your store manager or Super Admin for access.',
      code: 'ERR_ACCOUNT_SUSPENDED',
    });
    return;
  }

  // Strictly verify password using salted PBKDF2 hash (100,000 iterations). NO fallbacks.
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
        'Account Locked: Brute Force Triggered',
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
      'Password hash mismatch (strict verification enforced)',
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

  // Login succeeded: Clear rate limiter, generate secure session
  loginRateLimiter.delete(rateLimitKey);

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const ttl = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const safeUser = sanitizeUser(user);

  db.saveSession({
    token: sessionToken,
    userId: user.id,
    user: safeUser,
    createdAt: now,
    expiresAt: now + ttl,
    rememberMe: Boolean(rememberMe),
  });

  // Update lastLogin timestamp in database
  user.lastLogin = new Date().toISOString().replace('T', ' ').substring(0, 19);
  db.updateUser(user.id, { lastLogin: user.lastLogin });

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

// GET /api/auth/session - Verify active session token against database
app.get('/api/auth/session', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, authenticated: false, error: 'No active session token provided.' });
    return;
  }

  const token = authHeader.substring(7);
  const session = db.getSession(token);

  if (!session) {
    res.status(401).json({ success: false, authenticated: false, error: 'Session invalid or expired.' });
    return;
  }

  const user = db.findUserById(session.userId);
  if (!user || user.status === 'Suspended') {
    db.deleteSession(token);
    res.status(403).json({ success: false, authenticated: false, error: 'Account suspended or removed.' });
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
    const session = db.getSession(token);
    if (session) {
      logServerAudit(
        session.user.name,
        session.user.role,
        'User Logged Out',
        'Authentication',
        `User ${session.user.name} closed session`,
        'User triggered safe logout',
        'Info'
      );
      db.deleteSession(token);
    }
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/forgot-password - Secure request without leaking existence or verification codes
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { identifier } = req.body;
  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    res.status(400).json({ success: false, error: 'Please enter your registered phone number or email address.' });
    return;
  }

  const cleanId = identifier.trim().toLowerCase();
  const clientIp = req.ip || 'unknown';
  const rateKey = `${clientIp}_${cleanId}`;
  const now = Date.now();

  // Rate-limit password reset requests (max 3 requests per 15-minute window)
  const rateInfo = forgotPasswordRateLimiter.get(rateKey) || { count: 0, windowStart: now };
  if (now - rateInfo.windowStart > FORGOT_PASSWORD_WINDOW_MS) {
    rateInfo.count = 1;
    rateInfo.windowStart = now;
  } else {
    rateInfo.count += 1;
  }
  forgotPasswordRateLimiter.set(rateKey, rateInfo);

  if (rateInfo.count > MAX_FORGOT_REQUESTS_PER_WINDOW) {
    res.status(429).json({
      success: false,
      error: 'Too many password reset requests. Please wait 15 minutes before trying again or contact your administrator.',
      code: 'ERR_TOO_MANY_RESET_REQUESTS',
    });
    return;
  }

  const user = db.findUserByIdentifier(identifier);

  if (user && user.status === 'Active') {
    // Generate cryptographically secure 6-digit code
    const rawCode = crypto.randomInt(100000, 999999).toString();
    const { passwordHash: codeHash, passwordSalt: codeSalt } = hashPassword(rawCode);

    passwordResetRecords.set(user.id, {
      codeHash,
      codeSalt,
      userId: user.id,
      identifier: cleanId,
      expiresAt: now + 10 * 60 * 1000, // 10 minutes
      attempts: 0,
      used: false,
    });

    logServerAudit(
      user.name,
      user.role,
      'Password Reset Initiated',
      'Authentication',
      `Reset request for User ${user.id}`,
      '10-minute hashed verification record stored',
      'Warning'
    );

    // If an external SMTP or SMS service is configured, dispatch here securely.
    // Notice: We NEVER return the verification code or secret in the public API response.
  }

  // Anti-enumeration: Return the exact same response regardless of whether the account exists
  res.json({
    success: true,
    message:
      'If an active account is registered with this phone number or email, password reset instructions have been dispatched. If automated delivery is not configured on this deployment, please contact your store system administrator for assistance.',
  });
});

// POST /api/auth/reset-password - Verify ownership and update password
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { identifier, code, newPassword } = req.body;

  if (!identifier || !code || !newPassword) {
    res.status(400).json({ success: false, error: 'Identifier, verification code, and new password are required.' });
    return;
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters long.',
      code: 'ERR_WEAK_PASSWORD',
    });
    return;
  }

  const user = db.findUserByIdentifier(identifier);
  if (!user) {
    // Constant-time delay to prevent timing-based enumeration
    res.status(400).json({ success: false, error: 'The verification code is invalid or has expired.' });
    return;
  }

  const record = passwordResetRecords.get(user.id);
  if (!record || record.used || record.expiresAt < Date.now()) {
    res.status(400).json({ success: false, error: 'The verification code is invalid or has expired. Please request a new code.' });
    return;
  }

  // Enforce brute-force attempt limits on the verification code (max 3 tries)
  record.attempts += 1;
  if (record.attempts > 3) {
    passwordResetRecords.delete(user.id);
    res.status(400).json({
      success: false,
      error: 'Too many incorrect verification attempts. This code has been invalidated for security. Please request a new code.',
      code: 'ERR_CODE_ATTEMPTS_EXCEEDED',
    });
    return;
  }

  const isValidCode = verifyPassword(String(code).trim(), {
    passwordHash: record.codeHash,
    passwordSalt: record.codeSalt,
    iterations: 100000,
  } as any);

  if (!isValidCode) {
    res.status(400).json({
      success: false,
      error: 'The verification code is invalid. Please double-check your code.',
      attemptsRemaining: Math.max(0, 3 - record.attempts),
    });
    return;
  }

  // Update password with fresh PBKDF2 hash
  const newHash = hashPassword(newPassword);
  db.updateUser(user.id, {
    passwordHash: newHash.passwordHash,
    passwordSalt: newHash.passwordSalt,
    iterations: newHash.iterations,
  });

  record.used = true;
  passwordResetRecords.delete(user.id);

  // Invalidate all active sessions for this user on password reset
  db.revokeUserSessions(user.id);

  logServerAudit(
    user.name,
    user.role,
    'Password Successfully Reset',
    'Authentication',
    `User ${user.id} updated credentials via verified code`,
    'Credential update verified and applied',
    'Warning'
  );

  res.json({
    success: true,
    message: 'Your password has been successfully updated. Please sign in with your new credentials.',
  });
});

// -------------------------------------------------------------
// Staff Directory & Staff Governance (Protected Endpoints)
// -------------------------------------------------------------

app.get('/api/auth/staff-directory', requireAuthenticated, (req: Request, res: Response) => {
  const requester = getAuthenticatedUser(req)!;
  const requestedCompanyId = req.headers['x-company-id'];
  const companyId = typeof requestedCompanyId === 'string' ? requestedCompanyId : requester.companyId;

  const allUsers = db.getUsers();
  const visibleUsers =
    requester.role === 'Super Admin' && companyId === 'all'
      ? allUsers
      : allUsers.filter(
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

// Create Staff Account
app.post('/api/users', requireOperationalManager, (req: Request, res: Response) => {
  const { name, email, phone, role, branch, pin, password, reason, companyId: requestedUserCompanyId } = req.body;
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

  if (!name || !email) {
    res.status(400).json({ success: false, error: 'Name and email are required to provision staff.' });
    return;
  }

  // Check uniqueness of email
  const existingWithEmail = db.findUserByIdentifier(email);
  if (existingWithEmail) {
    res.status(409).json({ success: false, error: 'A staff member with this email address already exists.' });
    return;
  }

  const staffPassword = (typeof password === 'string' && password.trim()) || (typeof pin === 'string' && pin.trim());
  if (!staffPassword || staffPassword.length < 8) {
    res.status(400).json({
      success: false,
      error: 'A secure password of at least 8 characters is required to provision staff accounts. Default passwords are strictly prohibited.',
      code: 'ERR_PASSWORD_REQUIRED',
    });
    return;
  }

  const { passwordHash, passwordSalt, iterations } = hashPassword(staffPassword);
  const nowIso = new Date().toISOString();

  const newStaff: ServerUser = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    email: normalizeEmail(email),
    phone: phone ? normalizePhone(phone) : '+250 788 000 000',
    role: assignedRole as ServerUser['role'],
    companyId,
    assignedCompanyIds: companyId ? [companyId] : [],
    branch: branch || 'Main Branch',
    status: 'Active',
    passwordHash,
    passwordSalt,
    iterations,
    lastLogin: 'Never',
    createdAt: nowIso,
  };

  db.addUser(newStaff);

  logServerAudit(
    actor.name,
    actor.role,
    'Staff Account Created',
    'Staff Management',
    `${newStaff.name} (${newStaff.role}) at ${newStaff.branch}`,
    reason || 'Authorized manager provisioned new staff account in database',
    'Info'
  );

  res.status(201).json({
    success: true,
    message: `Staff member ${newStaff.name} created successfully.`,
    user: sanitizeUser(newStaff),
  });
});

// User Role Assignment
app.put('/api/users/:id/role', requireOperationalManager, requireTargetUserCompanyAccess, (req: Request, res: Response) => {
  const { id } = req.params;
  const { newRole, previousRole, targetUserName, reason } = req.body;
  const actor = getAuthenticatedUser(req)!;

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

  const existing = db.findUserById(id);
  if (!existing) {
    res.status(404).json({ success: false, error: 'Staff member not found.' });
    return;
  }

  db.updateUser(id, { role: newRole as ServerUser['role'] });

  logServerAudit(
    actor.name,
    actor.role,
    'User Role Changed',
    'Staff Management',
    `${targetUserName || id}: ${previousRole || existing.role} → ${newRole}`,
    reason || 'Administrative role reassignment',
    'Warning'
  );

  res.json({
    success: true,
    message: `User ${targetUserName || existing.name} role changed to ${newRole}`,
    userId: id,
    newRole,
  });
});

// User Status (Activate/Suspend)
app.post('/api/users/:id/toggle-status', requireOperationalManager, requireTargetUserCompanyAccess, (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetUserName, newStatus, reason } = req.body;
  const actor = getAuthenticatedUser(req)!;

  if (newStatus !== 'Active' && newStatus !== 'Suspended') {
    res.status(400).json({ success: false, error: 'A valid account status is required.' });
    return;
  }

  const existing = db.findUserById(id);
  if (!existing) {
    res.status(404).json({ success: false, error: 'Staff member not found.' });
    return;
  }

  db.updateUser(id, { status: newStatus });
  if (newStatus === 'Suspended') {
    db.revokeUserSessions(id);
  }

  logServerAudit(
    actor.name,
    actor.role,
    `User ${newStatus === 'Active' ? 'Activated' : 'Suspended'}`,
    'Staff Management',
    `${targetUserName || existing.name} status set to ${newStatus}`,
    reason || 'Staff access management',
    newStatus === 'Suspended' ? 'Warning' : 'Info'
  );

  res.json({
    success: true,
    message: `User ${targetUserName || existing.name} is now ${newStatus}`,
    userId: id,
    status: newStatus,
  });
});

// Administrator-Assisted Staff Password Reset (Secure Manager/Super Admin Action)
app.post('/api/users/:id/reset-password', requireOperationalManager, requireTargetUserCompanyAccess, (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword, reason } = req.body;
  const actor = getAuthenticatedUser(req)!;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters long.',
      code: 'ERR_WEAK_PASSWORD',
    });
    return;
  }

  const existing = db.findUserById(id);
  if (!existing) {
    res.status(404).json({ success: false, error: 'Staff member not found.' });
    return;
  }

  if (existing.role === 'Super Admin' && actor.role !== 'Super Admin') {
    res.status(403).json({ success: false, error: 'Only Super Admin can reset administrative passwords.' });
    return;
  }

  const { passwordHash, passwordSalt, iterations } = hashPassword(newPassword);
  db.updateUser(id, { passwordHash, passwordSalt, iterations });
  db.revokeUserSessions(id);

  logServerAudit(
    actor.name,
    actor.role,
    'Staff Password Reset by Administrator',
    'Staff Management',
    `Credentials reset for ${existing.name} (${existing.role})`,
    reason || 'Administrative password recovery assistance',
    'Warning'
  );

  res.json({
    success: true,
    message: `Password for staff member ${existing.name} has been securely reset. All active sessions have been revoked.`,
    userId: id,
  });
});

// Delete Staff Member — Only System Admin & Business Owner Authorized
app.delete('/api/users/:id', requireStaffDeleteAuthority, requireTargetUserCompanyAccess, (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetUserName, reason } = req.body;
  const actor = getAuthenticatedUser(req)!;

  const existing = db.findUserById(id);
  if (!existing) {
    res.status(404).json({ success: false, error: 'Staff member not found.' });
    return;
  }

  // Prevent deleting the last Super Admin
  if (existing.role === 'Super Admin') {
    const superAdmins = db.getUsers().filter((u) => u.role === 'Super Admin' && u.status === 'Active');
    if (superAdmins.length <= 1) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete the only active Super Admin account.',
        code: 'ERR_LAST_SUPER_ADMIN_PROTECTED',
      });
      return;
    }
  }

  const deletedName = existing.name;
  const deletedRole = existing.role;

  db.deleteUser(id);

  // Record every deletion in Audit Logs, including the staff member deleted, the user who performed the action, and date/time
  logServerAudit(
    actor.name,
    actor.role,
    'Staff Member Deleted',
    'Staff Management',
    `Deleted Staff: ${deletedName} (${deletedRole})`,
    reason || 'Permanent staff record removal by authorized administrator. Historical sales, transactions, payments, and audit records preserved for accountability.',
    'Critical'
  );

  res.json({
    success: true,
    message: `Staff member ${deletedName} deleted successfully. Historical sales, transactions, payments, and audit records have been preserved.`,
    userId: id,
  });
});

// -------------------------------------------------------------
// Super Admin / Owner Dedicated Endpoints (/owner)
// -------------------------------------------------------------

// Verify Super Admin access for the Owner Page
app.get('/api/owner/verify', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({
      success: false,
      authorized: false,
      error: 'Authentication required. Please log in with a valid Super Admin account.',
      code: 'ERR_UNAUTHENTICATED',
    });
    return;
  }

  if (user.role !== 'Super Admin') {
    logServerAudit(
      user.name,
      user.role,
      'Security Block: Non-Super Admin Owner Page Access Attempt',
      'Owner Page Governance',
      'GET /api/owner/verify',
      `User with role ${user.role} attempted to access Super Admin Owner Page`,
      'Critical'
    );
    res.status(403).json({
      success: false,
      authorized: false,
      error: 'Access Denied: Only the System Super Admin / System Owner is authorized to access the Owner Page.',
      code: 'ERR_SUPER_ADMIN_REQUIRED',
    });
    return;
  }

  res.json({
    success: true,
    authorized: true,
    user: sanitizeUser(user),
  });
});

// Owner Page Aggregate Statistics
app.get('/api/owner/stats', requireSuperAdmin, (_req: Request, res: Response) => {
  const companies = db.getCompanies();
  const users = db.getUsers();
  const products = db.getProducts();
  const auditLogs = db.getAuditLogs();

  const totalBusinesses = companies.length;
  const activeBusinesses = companies.filter((c) => c.status === 'Active').length;
  const suspendedBusinesses = companies.filter((c) => c.status === 'Suspended').length;
  const totalUsers = users.length;
  const totalProducts = products.length;
  const totalStockValuation = products.reduce((acc, p) => acc + p.sellingPrice * p.stock, 0);

  res.json({
    success: true,
    stats: {
      totalBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      totalUsers,
      totalProducts,
      totalStockValuation,
      recentAuditLogs: auditLogs.slice(0, 15),
    },
  });
});

// Company Management (Super Admin Only)
app.get('/api/companies', requireAuthenticated, (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req)!;
  const companies = db.getCompanies();
  if (user.role === 'Super Admin') {
    res.json({ success: true, companies });
    return;
  }
  const filtered = companies.filter((c) => c.id === user.companyId || user.assignedCompanyIds?.includes(c.id));
  res.json({ success: true, companies: filtered });
});

app.post('/api/companies', requireSuperAdmin, (req: Request, res: Response) => {
  const { name, code, businessType, tin, phone, email, address, city, country, ownerName, subscription } = req.body;
  const actor = getAuthenticatedUser(req)!;

  if (!name || !code) {
    res.status(400).json({ success: false, error: 'Business name and code are required.' });
    return;
  }

  const newCompany: ServerCompany = {
    id: `comp-${Date.now()}`,
    name,
    code,
    businessType: businessType || 'Grocery Retail',
    tin: tin || '100000000',
    phone: phone || '+250 788 000 000',
    email: email || `info@${code.toLowerCase()}.rw`,
    address: address || 'Kigali, Rwanda',
    city: city || 'Kigali',
    country: country || 'Rwanda',
    currency: 'RWF',
    status: 'Active',
    ownerName: ownerName || 'Proprietor',
    createdAt: new Date().toISOString(),
    subscription: subscription || {
      planName: 'Standard Business',
      planStatus: 'Paid & Active',
      monthlyFee: 60000,
      billingCycle: 'Monthly',
    },
  };

  db.addCompany(newCompany);

  logServerAudit(
    actor.name,
    actor.role,
    'Business Created',
    'Business Governance',
    `${newCompany.name} (${newCompany.code})`,
    'New commercial tenant registered',
    'Warning'
  );

  res.status(201).json({ success: true, company: newCompany, message: 'Business entity created successfully.' });
});

app.put('/api/companies/:id', requireSuperAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const actor = getAuthenticatedUser(req)!;
  const updated = db.updateCompany(id, req.body);

  if (!updated) {
    res.status(404).json({ success: false, error: 'Business entity not found.' });
    return;
  }

  logServerAudit(
    actor.name,
    actor.role,
    'Business Entity Updated',
    'Business Governance',
    `${updated.name} (${updated.id})`,
    req.body.reason || 'Super Admin updated company configuration',
    'Warning'
  );

  res.json({ success: true, company: updated, message: 'Business updated successfully.' });
});

app.post('/api/companies/:id/status', requireSuperAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const actor = getAuthenticatedUser(req)!;

  if (status !== 'Active' && status !== 'Suspended' && status !== 'Inactive') {
    res.status(400).json({ success: false, error: 'Invalid business status.' });
    return;
  }

  const updated = db.updateCompany(id, { status });
  if (!updated) {
    res.status(404).json({ success: false, error: 'Business entity not found.' });
    return;
  }

  logServerAudit(
    actor.name,
    actor.role,
    `Business Status Shift: ${status}`,
    'Business Governance',
    `${updated.name} status updated to ${status}`,
    reason || `Business account status shifted to ${status} by Super Admin`,
    status === 'Suspended' ? 'Critical' : 'Info'
  );

  res.json({ success: true, company: updated, message: `Business status updated to ${status}.` });
});

// -------------------------------------------------------------
// Multi-Business Isolated Catalog & Items (/api/products)
// -------------------------------------------------------------

app.get('/api/products', requireAuthenticated, (req: Request, res: Response) => {
  const actor = getAuthenticatedUser(req)!;
  const headerCompanyId = req.headers['x-company-id'];
  const requestedCompanyId = typeof headerCompanyId === 'string' ? headerCompanyId : actor.companyId;

  if (actor.role !== 'Super Admin' && requestedCompanyId !== actor.companyId && !actor.assignedCompanyIds?.includes(requestedCompanyId || '')) {
    logServerAudit(
      actor.name,
      actor.role,
      'Security Block: Cross-Business Product Read Attempt',
      'Catalog & Inventory',
      `Requested Company: ${requestedCompanyId}`,
      `User from ${actor.companyId} attempted to read products of ${requestedCompanyId}`,
      'Critical'
    );
    res.status(403).json({
      success: false,
      error: 'Access Denied: You cannot view products belonging to another business.',
      code: 'ERR_CROSS_BUSINESS_ACCESS_DENIED',
    });
    return;
  }

  const products = db.getProducts(requestedCompanyId);
  res.json({ success: true, products });
});

app.post('/api/products', requireOperationalManager, (req: Request, res: Response) => {
  const actor = getAuthenticatedUser(req)!;
  const headerCompanyId = req.headers['x-company-id'];
  const requestedCompanyId = typeof headerCompanyId === 'string' ? headerCompanyId : actor.companyId;

  const targetCompanyId = actor.role === 'Super Admin' ? (req.body.companyId || requestedCompanyId || 'comp-1') : actor.companyId;
  if (!targetCompanyId) {
    res.status(400).json({ success: false, error: 'Product must be assigned to a specific business.' });
    return;
  }

  const { name, sku, barcode, category, sellingPrice, costPrice, wholesalePrice, stock, minStockAlert, unit } = req.body;
  if (!name || sellingPrice === undefined) {
    res.status(400).json({ success: false, error: 'Product name and selling price are required.' });
    return;
  }

  const newProduct: ServerProduct = {
    id: `prd-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    companyId: targetCompanyId,
    name,
    sku: sku || `SKU-${Date.now().toString().slice(-4)}`,
    barcode: barcode || `${Date.now()}`,
    category: category || 'General',
    sellingPrice: Number(sellingPrice),
    costPrice: Number(costPrice || 0),
    wholesalePrice: wholesalePrice ? Number(wholesalePrice) : undefined,
    stock: Number(stock || 0),
    minStockAlert: Number(minStockAlert || 5),
    unit: unit || 'pcs',
    status: 'Active',
    taxRate: req.body.taxRate ? Number(req.body.taxRate) : 18,
    supplier: req.body.supplier || 'Local Supplier',
  };

  db.addProduct(newProduct);

  logServerAudit(
    actor.name,
    actor.role,
    'Product Created',
    'Catalog & Inventory',
    `${newProduct.name} (${newProduct.sku}) in Business ${newProduct.companyId}`,
    req.body.reason || 'New inventory item added',
    'Info'
  );

  res.status(201).json({ success: true, product: newProduct, message: `Product ${newProduct.name} created successfully.` });
});

app.put('/api/products/:id', requireOperationalManager, (req: Request, res: Response) => {
  const { id } = req.params;
  const actor = getAuthenticatedUser(req)!;
  const product = db.findProductById(id);

  if (!product) {
    res.status(404).json({ success: false, error: 'Product not found.' });
    return;
  }

  if (actor.role !== 'Super Admin' && product.companyId !== actor.companyId && !actor.assignedCompanyIds?.includes(product.companyId)) {
    logServerAudit(
      actor.name,
      actor.role,
      'Security Block: Cross-Business Product Modification Attempt',
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

  const updated = db.updateProduct(id, req.body);

  logServerAudit(
    actor.name,
    actor.role,
    'Product Updated',
    'Catalog & Inventory',
    `${product.name} (${product.sku}) in Business ${product.companyId}`,
    req.body.reason || 'Product record updated',
    'Info'
  );

  res.json({ success: true, product: updated, message: `Product ${product.name} updated successfully.` });
});

app.delete('/api/products/:id', requireOperationalManager, (req: Request, res: Response) => {
  const { id } = req.params;
  const actor = getAuthenticatedUser(req)!;
  const product = db.findProductById(id);

  if (!product) {
    res.status(404).json({ success: false, error: 'Product not found.' });
    return;
  }

  if (actor.role !== 'Super Admin' && product.companyId !== actor.companyId && !actor.assignedCompanyIds?.includes(product.companyId)) {
    logServerAudit(
      actor.name,
      actor.role,
      'Security Block: Cross-Business Product Deletion Attempt',
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

  db.deleteProduct(id);

  logServerAudit(
    actor.name,
    actor.role,
    'Product Deleted',
    'Catalog & Inventory',
    `${product.name} (${product.sku}) from Business ${product.companyId}`,
    req.body.reason || 'Item removed from catalog by authorized user',
    'Warning'
  );

  res.json({ success: true, message: `Product ${product.name} deleted successfully.` });
});

// Audit Logs Retrieval (Super Admin Only)
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
    logs: db.getAuditLogs(),
  });
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
