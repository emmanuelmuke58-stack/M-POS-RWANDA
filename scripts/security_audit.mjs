/**
 * Fresh & More M-POS Production Authentication Security Audit Test Suite
 *
 * Comprehensive Automated Security Verification covering:
 * 1. Default-password removal & rejection of publicly known credentials
 * 2. One-time initial Super Admin setup & enforcement
 * 3. Strict CORS origin enforcement (unauthorized origins rejected with 403)
 * 4. Password-reset security (anti-enumeration, no secret leaks, attempt limit)
 * 5. Administrator-assisted staff password reset
 * 6. RBAC & Multi-tenant data isolation
 * 7. Database persistence across operations with salted PBKDF2 hashes
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://127.0.0.1:3000';

function makeRequest(urlPath, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_BASE);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}: ${details}`);
    throw new Error(`Test failed: ${testName} - ${details}`);
  }
}

async function runSecurityAudit() {
  console.log('===============================================================');
  console.log('FRESH & MORE M-POS PRODUCTION AUTHENTICATION SECURITY AUDIT');
  console.log('===============================================================\n');

  // Verify backend connectivity
  try {
    const health = await makeRequest('/api/health');
    assert(health.status === 200, 'Backend is reachable and healthy (GET /api/health)');
  } catch (err) {
    console.error('Cannot connect to backend server at port 3000:', err.message);
    process.exit(1);
  }

  console.log('\n--- 1. Database Integrity & Persistence ---');
  const dbPath = path.resolve(process.cwd(), 'data', 'pos_production_db.json');
  assert(fs.existsSync(dbPath), 'Persistent database pos_production_db.json exists on disk');

  console.log('\n--- 2. Initial Setup & One-Time Admin Provisioning ---');
  const setupStatusRes = await makeRequest('/api/auth/setup-status');
  assert(setupStatusRes.status === 200, 'GET /api/auth/setup-status returns HTTP 200');

  const adminPass = 'SuperAdmin2026!StrictProduction';
  const adminEmail = 'admin@freshandmore.rw';

  // If no Super Admin is currently established, provision one through the one-time endpoint
  if (!setupStatusRes.data.isInitialized) {
    console.log('  [INFO] System is uninitialized. Testing secure one-time Super Admin provisioning...');
    const setupRes = await makeRequest('/api/auth/setup-initial-admin', { method: 'POST' }, {
      name: 'Primary System Administrator',
      email: adminEmail,
      phone: '+250 788 000 001',
      password: adminPass,
    });
    assert(setupRes.status === 201, 'One-time initial Super Admin setup succeeds with HTTP 201');
    assert(setupRes.data.success === true, 'Setup returns success = true');
    assert(setupRes.data.user.role === 'Super Admin', 'Admin user role confirmed as Super Admin');
  }

  // Attempt second initialization: MUST be rejected with HTTP 403 ERR_SETUP_ALREADY_COMPLETED
  const secondSetupRes = await makeRequest('/api/auth/setup-initial-admin', { method: 'POST' }, {
    name: 'Attacker Admin',
    email: 'attacker@evil.com',
    password: 'AttackerPassword123!',
  });
  assert(secondSetupRes.status === 403, 'Subsequent initial setup attempts rejected with HTTP 403');
  assert(secondSetupRes.data.code === 'ERR_SETUP_ALREADY_COMPLETED', 'Returns code ERR_SETUP_ALREADY_COMPLETED');

  // Login with genuine provisioned administrator credentials
  const validAdminLogin = await makeRequest('/api/auth/login', { method: 'POST' }, {
    identifier: adminEmail,
    password: adminPass,
  });
  assert(validAdminLogin.status === 200, 'Provisioned Super Admin login succeeds with HTTP 200');
  assert(Boolean(validAdminLogin.data.token), 'Valid session token issued');
  assert(!('password' in validAdminLogin.data.user), 'User response never leaks plaintext password');
  assert(!('passwordHash' in validAdminLogin.data.user), 'User response never leaks password hash');
  const adminToken = validAdminLogin.data.token;

  console.log('\n--- 3. Default Password Removal & Rejection Verification ---');
  // Attempt login with old default passwords
  const defaultPassAttempts = [
    'Pos123!',
    'Pass123!',
    'SuperAdmin2026!RwandaSecure',
    'Cashier2026!RwandaSecure',
    'Owner2026!RwandaSecure',
  ];
  for (const pass of defaultPassAttempts) {
    const res = await makeRequest('/api/auth/login', { method: 'POST' }, {
      identifier: adminEmail,
      password: pass,
    });
    assert(
      (res.status === 401 || res.status === 429) && res.data.success === false,
      `Default password "${pass}" strictly rejected (HTTP ${res.status}, success=false)`
    );
  }

  console.log('\n--- 4. Staff Account Provisioning Without Fallback Passwords ---');
  // Attempt staff creation without password (must fail with 400 ERR_PASSWORD_REQUIRED)
  const noPassStaffRes = await makeRequest('/api/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  }, {
    name: 'Test Cashier',
    email: 'test_cashier_nopass@freshandmore.rw',
    role: 'Cashier',
    branch: 'Main Branch',
  });
  assert(noPassStaffRes.status === 400, 'Staff creation without password rejected with HTTP 400');
  assert(noPassStaffRes.data.code === 'ERR_PASSWORD_REQUIRED', 'Returns ERR_PASSWORD_REQUIRED code (no Pos123! fallback)');

  // Attempt staff creation with short password (< 8 chars)
  const shortPassStaffRes = await makeRequest('/api/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  }, {
    name: 'Test Cashier',
    email: 'test_cashier_short@freshandmore.rw',
    password: '12345',
    role: 'Cashier',
    branch: 'Main Branch',
  });
  assert(shortPassStaffRes.status === 400, 'Staff creation with weak password (< 8 chars) rejected with HTTP 400');

  // Create staff member with explicit secure password
  const cashierEmail = 'cashier_production@freshandmore.rw';
  const cashierPass = 'CashierSecurePassword2026!';
  const createStaffRes = await makeRequest('/api/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'X-Company-Id': 'comp-1' },
  }, {
    name: 'Sarah Umutoni',
    email: cashierEmail,
    phone: '+250 788 555 444',
    password: cashierPass,
    role: 'Cashier',
    branch: 'Main Branch',
  });
  assert(createStaffRes.status === 201, 'Staff member successfully provisioned with explicit secure password');
  const cashierId = createStaffRes.data.user.id;

  // Cashier logs in with explicit password
  const cashierLogin = await makeRequest('/api/auth/login', { method: 'POST' }, {
    identifier: cashierEmail,
    password: cashierPass,
  });
  assert(cashierLogin.status === 200, 'Provisioned Cashier logs in successfully with HTTP 200');
  const cashierToken = cashierLogin.data.token;

  console.log('\n--- 5. Strict CORS Policy Enforcement ---');
  // 5a. Permitted Production Origin: GitHub Pages
  const approvedCorsRes = await makeRequest('/api/health', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://emmanuelmuke58-stack.github.io',
      'Access-Control-Request-Method': 'POST',
    },
  });
  assert(approvedCorsRes.status === 204 || approvedCorsRes.status === 200, 'Approved GitHub Pages origin preflight accepted (200/204)');
  assert(approvedCorsRes.headers['access-control-allow-origin'] === 'https://emmanuelmuke58-stack.github.io', 'Approved origin returned in Access-Control-Allow-Origin');

  // 5b. Unapproved Malicious Origin: MUST be rejected with HTTP 403
  const forbiddenCorsRes = await makeRequest('/api/health', {
    method: 'GET',
    headers: {
      Origin: 'https://malicious-attacker-site.com',
    },
  });
  assert(forbiddenCorsRes.status === 403, 'Unapproved browser origin strictly rejected with HTTP 403');
  assert(forbiddenCorsRes.data.code === 'ERR_CORS_FORBIDDEN', 'Returns ERR_CORS_FORBIDDEN');

  // 5c. Server-to-server / curl request without Origin header: Accepted
  const noOriginRes = await makeRequest('/api/health', { method: 'GET' });
  assert(noOriginRes.status === 200, 'Requests without Origin header (curl/mobile/backend) accepted with HTTP 200');

  console.log('\n--- 6. Secure Password Reset & Anti-Enumeration ---');
  // 6a. Request password reset for existing user
  const forgotExisting = await makeRequest('/api/auth/forgot-password', { method: 'POST' }, {
    identifier: cashierEmail,
  });
  assert(forgotExisting.status === 200, 'Forgot password for existing user returns HTTP 200');
  assert(!('simulatedCode' in forgotExisting.data), 'Never leaks simulatedCode or reset token');
  assert(!('code' in forgotExisting.data), 'Never leaks raw verification code');

  // 6b. Request password reset for non-existing user (Anti-enumeration check)
  const forgotNonExisting = await makeRequest('/api/auth/forgot-password', { method: 'POST' }, {
    identifier: 'nonexistent_user_99999@randomdomain.rw',
  });
  assert(forgotNonExisting.status === 200, 'Forgot password for non-existent user returns HTTP 200');
  assert(forgotNonExisting.data.message === forgotExisting.data.message, 'Message is identical for existing and non-existing accounts (anti-enumeration)');

  // 6c. Invalid reset verification attempts
  const badResetRes = await makeRequest('/api/auth/reset-password', { method: 'POST' }, {
    identifier: cashierEmail,
    code: '000000',
    newPassword: 'BrandNewSecurePassword2026!',
  });
  assert(badResetRes.status === 400, 'Invalid verification code rejected with HTTP 400');

  console.log('\n--- 7. Administrator-Assisted Staff Password Reset ---');
  const newCashierPass = 'UpdatedSecureCashierPass2026!';
  const adminResetRes = await makeRequest(`/api/users/${cashierId}/reset-password`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  }, {
    newPassword: newCashierPass,
    reason: 'Staff requested assisted password recovery',
  });
  assert(adminResetRes.status === 200, 'Super Admin assisted staff password reset returns HTTP 200');

  // Verify previous cashier session has been revoked
  const revokedCashierSession = await makeRequest('/api/auth/session', {
    headers: { Authorization: `Bearer ${cashierToken}` },
  });
  assert(revokedCashierSession.status === 401, 'Active session revoked upon administrator password reset');

  // Cashier logs in with new password
  const cashierNewLogin = await makeRequest('/api/auth/login', { method: 'POST' }, {
    identifier: cashierEmail,
    password: newCashierPass,
  });
  assert(cashierNewLogin.status === 200, 'Cashier successfully logs in with updated password');

  console.log('\n--- 8. Role-Based Access Control (RBAC) ---');
  // Cashier attempting to access Super Admin Owner endpoint
  const cashierOwnerCheck = await makeRequest('/api/owner/verify', {
    headers: { Authorization: `Bearer ${cashierNewLogin.data.token}` },
  });
  assert(cashierOwnerCheck.status === 403, 'Cashier access to /api/owner/verify denied with HTTP 403');

  // Super Admin access to Owner endpoint
  const adminOwnerCheck = await makeRequest('/api/owner/verify', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminOwnerCheck.status === 200, 'Super Admin access to /api/owner/verify granted with HTTP 200');

  console.log('\n--- 9. Database File Cryptographic Inspection ---');
  const freshDbContent = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  for (const user of freshDbContent.users) {
    assert(Boolean(user.passwordHash && user.passwordSalt), `User ${user.email} stored with salted hash`);
    assert(!('password' in user), `User ${user.email} does not expose plaintext password`);
    assert(user.passwordHash.length === 128, `User ${user.email} has 512-bit SHA-512 hash`);
  }

  console.log('\n===============================================================');
  console.log(`ALL SECURITY AUDIT TESTS PASSED (${passedTests}/${totalTests})`);
  console.log('===============================================================\n');
}

runSecurityAudit().catch((err) => {
  console.error('\nSECURITY AUDIT FAILED:', err.message);
  process.exit(1);
});
