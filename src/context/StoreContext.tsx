import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  Product,
  Category,
  Supplier,
  Customer,
  Sale,
  HeldSale,
  PurchaseOrder,
  GoodsReceipt,
  SupplierInvoice,
  PurchaseReturn,
  StockMovement,
  StockMovementType,
  StockCountSession,
  Expense,
  CashShift,
  PaymentRecord,
  UserAccount,
  AuditLog,
  BusinessSettings,
  UserRole,
  RolePermissions,
  ModuleKey,
  PermissionAction,
  PaymentMethod,
  Company,
  CompanySubscription,
  FeatureEntitlement,
  FeatureKey,
  AttendanceRecord,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_SALES,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_GOODS_RECEIPTS,
  INITIAL_SUPPLIER_INVOICES,
  INITIAL_PURCHASE_RETURNS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_STOCK_COUNTS,
  INITIAL_EXPENSES,
  INITIAL_CASH_SHIFTS,
  INITIAL_ATTENDANCE,
  INITIAL_PAYMENTS,
  INITIAL_USERS,
  INITIAL_PERMISSIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
  INITIAL_COMPANIES,
  createCompanyFeatures,
  makeProductSvg,
  buildRolePermissions,
} from '../data/initialData';
import {
  timeSync,
  TimeSyncStatus,
  TimeSyncState,
  SUPPORTED_TIMEZONES,
} from '../services/timeSyncService';
import { apiFetch, isBackendConfigured } from '../config/api';

export const UNAUTHENTICATED_GUEST: UserAccount = {
  id: '',
  name: 'Unauthenticated Staff',
  role: 'Cashier',
  email: '',
  phone: '',
  branch: 'Main Branch',
  status: 'Suspended',
  lastLogin: 'Never',
};

export interface ToastNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

interface StoreContextType {
  currentUser: UserAccount;
  setCurrentUser: (user: UserAccount) => void;
  isAuthenticated: boolean;
  isVerifyingSession: boolean;
  authToken: string | null;
  rememberedIdentifier: string;
  setRememberedIdentifier: (id: string) => void;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string; redirectModule?: ModuleKey }>;
  logout: () => Promise<void>;
  currentBranch: string;
  setCurrentBranch: (branch: string) => void;
  activeModule: ModuleKey;
  setActiveModule: (mod: ModuleKey) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  isEmptyDbMode: boolean;

  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  heldSales: HeldSale[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  supplierInvoices: SupplierInvoice[];
  purchaseReturns: PurchaseReturn[];
  stockMovements: StockMovement[];
  stockCounts: StockCountSession[];
  expenses: Expense[];
  cashShifts: CashShift[];
  payments: PaymentRecord[];
  users: UserAccount[];
  permissions: Record<UserRole, RolePermissions>;
  auditLogs: AuditLog[];
  settings: BusinessSettings;
  toasts: ToastNotification[];

  notify: (
    typeOrMessage: ToastNotification['type'] | string,
    titleOrTypeOrMessage?: string,
    maybeMessage?: string
  ) => void;
  dismissToast: (id: string) => void;
  hasPermission: (module: ModuleKey, action: PermissionAction) => boolean;
  enforcePermission: (module: ModuleKey, action: PermissionAction) => boolean;
  canManageUsersAndRoles: () => boolean;
  canViewCostPrice: () => boolean;
  canViewExecutiveFinancials: () => boolean;
  canViewGrossProfit: () => boolean;
  logAudit: (action: string, module: string, record: string, reason: string, severity?: AuditLog['severity']) => void;

  completeSale: (saleData: Omit<Sale, 'id' | 'reference' | 'date' | 'time' | 'timestamp' | 'cashier' | 'branch'>) => Sale | null;
  refundSale: (saleId: string, reason: string) => void;
  holdSale: (held: Omit<HeldSale, 'id' | 'reference' | 'time'>) => void;
  removeHeldSale: (id: string) => void;

  addProduct: (product: Omit<Product, 'id' | 'imageSvg'> & { imageSvg?: string }) => void;
  updateProduct: (product: Product) => void;
  toggleProductStatus: (productId: string, reason: string) => void;
  adjustStock: (productId: string, type: StockMovementType, qtyDelta: number, unitCost: number, reason: string) => void;
  recordStockCount: (category: string, itemsCounted: number, varianceCount: number, varianceValue: number) => void;

  addCategory: (name: string, description: string) => void;
  updateCategory: (id: string, name: string, description: string, status: 'Active' | 'Inactive') => void;
  deactivateCategory: (id: string) => void;
  deleteProduct: (productId: string, reason?: string) => void;
  deleteCategory: (categoryId: string, reason?: string) => void;
  deleteSupplier: (supplierId: string, reason?: string) => void;
  deleteCustomer: (customerId: string, reason?: string) => void;
  deletePurchaseOrder: (poId: string, reason?: string) => void;
  deleteGoodsReceipt: (grnId: string, reason?: string) => void;
  deleteSupplierInvoice: (invoiceId: string, reason?: string) => void;
  deletePurchaseReturn: (returnId: string, reason?: string) => void;
  deleteStockMovement: (movementId: string, reason?: string) => void;
  deleteStockCount: (countId: string, reason?: string) => void;
  deleteExpense: (expenseId: string, reason?: string) => void;
  deleteCashShift: (shiftId: string, reason?: string) => void;
  deletePayment: (paymentId: string, reason?: string) => void;
  deleteSale: (saleId: string, reason?: string) => void;
  deleteUser: (userId: string, reason?: string) => Promise<boolean>;
  deleteAuditLog: (logId: string) => void;
  clearAllAuditLogs: () => void;
  clearAllHeldSales: () => void;
  deleteBranch: (branchId: string) => void;
  addBranch: (branch: { name: string; location: string; manager: string; isWarehouse?: boolean }) => void;
  clearCart: () => void;

  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdBy'>) => PurchaseOrder | null;
  updatePOStatus: (poId: string, status: PurchaseOrder['status'], reason?: string) => void;
  confirmGoodsReceipt: (receipt: Omit<GoodsReceipt, 'id' | 'grnNumber' | 'receivedBy'>) => GoodsReceipt | null;
  recordSupplierPayment: (supplierId: string, invoiceId: string | null, amount: number, method: Exclude<PaymentMethod, 'Credit' | 'Split Payment'>, referenceNote: string) => void;
  createPurchaseReturn: (poNumber: string, supplierName: string, productId: string, qty: number, reason: string) => void;

  addSupplier: (sup: Omit<Supplier, 'id' | 'totalPurchases' | 'outstandingBalance' | 'lastPurchaseDate'>) => void;
  addCustomer: (cus: Omit<Customer, 'id' | 'totalPurchases' | 'outstandingBalance' | 'status'>) => Customer | null;
  recordCreditRepayment: (saleId: string | null, customerId: string, amount: number, method: Exclude<PaymentMethod, 'Credit' | 'Split Payment'>, refNote: string) => boolean;

  addExpense: (exp: Omit<Expense, 'id' | 'reference' | 'user' | 'currency'>) => void;
  approveExpense: (expId: string) => void;

  openCashShift: (openingCash: number) => void;
  countCashShift: (actualCash: number, note?: string) => void;
  closeCashShift: (actualCash: number, discrepancyNote: string) => void;

  reconcilePayment: (paymentId: string, status: PaymentRecord['status']) => void;

  // Role and User Governance Methods (Super Admin Exclusive)
  addUser: (u: Omit<UserAccount, 'id' | 'lastLogin'>, reason?: string) => Promise<boolean>;
  updateUser: (userId: string, partial: Partial<UserAccount>, reason?: string) => Promise<boolean>;
  changeUserRole: (userId: string, newRole: UserRole, reason?: string) => Promise<boolean>;
  updateUserCustomPermissions: (userId: string, customOverrides: UserAccount['customPermissions'], reason?: string) => Promise<boolean>;
  toggleUserStatus: (userId: string, reason?: string) => Promise<boolean>;
  deactivateUser: (userId: string, reason?: string) => Promise<boolean>;
  resetUserAccess: (userId: string, reason?: string) => Promise<boolean>;
  updatePermission: (role: UserRole, module: ModuleKey, action: PermissionAction, value: boolean) => void;
  updateRolePermissions: (role: UserRole, module: ModuleKey, action: PermissionAction, value: boolean, reason?: string) => Promise<boolean>;
  resetRolePermissionsToDefault: (role: UserRole, reason?: string) => void;
  updateSettings: (partial: Partial<BusinessSettings>) => void;
  canDeleteStaff: () => boolean;

  companies: Company[];
  accessibleCompanies: Company[];
  currentCompanyId: string;
  currentCompany: Company | undefined;
  setCurrentCompanyId: (id: string) => void;
  allSales: Sale[];
  allProducts: Product[];
  addCompany: (comp: Omit<Company, 'id' | 'createdAt'>, reason?: string) => Promise<boolean>;
  updateCompany: (id: string, partial: Partial<Company>, reason?: string) => Promise<boolean>;
  toggleCompanyStatus: (id: string, reason?: string) => Promise<boolean>;
  assignUsersToCompany: (companyId: string, userIds: string[], reason?: string) => Promise<boolean>;
  deleteCompany: (companyId: string, reason?: string) => Promise<boolean>;
  updateCompanyFeature: (companyId: string, featureKey: FeatureKey, entitlement: Partial<FeatureEntitlement>, reason?: string) => Promise<boolean>;
  updateCompanySubscription: (companyId: string, sub: Partial<CompanySubscription>, reason?: string) => Promise<boolean>;

  // Automatic Time Synchronization & Attendance Tracking
  currentTime: Date;
  todayString: string;
  yesterdayString: string;
  timeZone: string;
  timeFormat: '12h' | '24h';
  syncStatus: TimeSyncStatus;
  isOnline: boolean;
  lastSyncedAt: Date | null;
  offsetMs: number;
  syncTimeNow: () => Promise<boolean>;
  setTimeZone: (zone: string) => void;
  setTimeFormat: (fmt: '12h' | '24h') => void;
  formatDate: (date?: Date | string | number, options?: { weekday?: 'short' | 'long' | 'none'; includeYear?: boolean }) => string;
  formatTime: (date?: Date | string | number, fmt?: '12h' | '24h', includeSec?: boolean) => string;
  formatDateTime: (date?: Date | string | number) => string;

  // Synchronized Attendance & Shifts
  attendanceRecords: AttendanceRecord[];
  clockInStaff: (userId?: string, notes?: string) => Promise<boolean>;
  clockOutStaff: (recordId?: string, notes?: string) => Promise<boolean>;
  deleteAttendanceRecord: (recordId: string, reason?: string) => void;

  switchToEmptyDatabase: () => void;
  resetToDemoDatabase: () => void;

  // Firebase Cloud Sync
  isFirebaseConnected: boolean;
  firebaseProjectId: string;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);
const STORAGE_KEY = 'fresh_and_more_mpos_v1';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount>(UNAUTHENTICATED_GUEST);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('fresh_pos_token'));
    } catch {
      return false;
    }
  });
  const [rememberedIdentifier, setRememberedIdentifier] = useState<string>(() => {
    try {
      return localStorage.getItem('fresh_pos_remembered') || '';
    } catch {
      return '';
    }
  });
  const [currentBranch, setCurrentBranch] = useState<string>('Main Branch');
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [isEmptyDbMode, setIsEmptyDbMode] = useState<boolean>(false);
  const [isFirebaseConnected] = useState<boolean>(true);
  const firebaseProjectId = 'electric-surface-mqmt3';

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>(INITIAL_GOODS_RECEIPTS);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>(INITIAL_SUPPLIER_INVOICES);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>(INITIAL_PURCHASE_RETURNS);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(INITIAL_STOCK_MOVEMENTS);
  const [stockCounts, setStockCounts] = useState<StockCountSession[]>(INITIAL_STOCK_COUNTS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [cashShifts, setCashShifts] = useState<CashShift[]>(INITIAL_CASH_SHIFTS);
  const [payments, setPayments] = useState<PaymentRecord[]>(INITIAL_PAYMENTS);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [authorizedBusinessUsers, setAuthorizedBusinessUsers] = useState<UserAccount[]>([]);
  const [permissions, setPermissions] = useState<Record<UserRole, RolePermissions>>(INITIAL_PERMISSIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [settings, setSettings] = useState<BusinessSettings>(INITIAL_SETTINGS);
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('comp-1');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const staffDirectoryRequestId = useRef(0);

  // Automatic Time Synchronization State
  const [timeSyncState, setTimeSyncState] = useState<TimeSyncState>(() => timeSync.getState());
  const [currentTime, setCurrentTime] = useState<Date>(() => timeSync.getNow());

  useEffect(() => {
    const unsub = timeSync.subscribe((state) => {
      setTimeSyncState(state);
      setCurrentTime(state.now);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (settings.timezone && settings.timezone !== timeSyncState.timeZone) {
      timeSync.setTimeZone(settings.timezone);
    }
    if (settings.timeFormat && settings.timeFormat !== timeSyncState.timeFormat) {
      timeSync.setTimeFormat(settings.timeFormat);
    }
  }, [settings.timezone, settings.timeFormat]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.products) setProducts(parsed.products);
          if (parsed.categories) setCategories(parsed.categories);
          if (parsed.suppliers) setSuppliers(parsed.suppliers);
          if (parsed.customers) setCustomers(parsed.customers);
          if (parsed.sales && Array.isArray(parsed.sales)) {
            const todayStr = timeSync.getTodayString();
            const yestStr = timeSync.getYesterdayString();
            // Automatically anchor any legacy hardcoded 2025 demo sales to synchronized dates
            const migrated = parsed.sales.map((s: Sale) => {
              if (s.date === '2025-04-26') {
                return { ...s, date: todayStr, timestamp: s.timestamp ? s.timestamp.replace('2025-04-26', todayStr) : `${todayStr}T10:00:00` };
              }
              if (s.date === '2025-04-25') {
                return { ...s, date: yestStr, timestamp: s.timestamp ? s.timestamp.replace('2025-04-25', yestStr) : `${yestStr}T17:00:00` };
              }
              return s;
            });
            setSales(migrated);
          }
          if (parsed.purchaseOrders) setPurchaseOrders(parsed.purchaseOrders);
          if (parsed.goodsReceipts) setGoodsReceipts(parsed.goodsReceipts);
          if (parsed.supplierInvoices) setSupplierInvoices(parsed.supplierInvoices);
          if (parsed.purchaseReturns) setPurchaseReturns(parsed.purchaseReturns);
          if (parsed.stockMovements) setStockMovements(parsed.stockMovements);
          if (parsed.stockCounts) setStockCounts(parsed.stockCounts);
          if (parsed.expenses) setExpenses(parsed.expenses);
          if (parsed.cashShifts) setCashShifts(parsed.cashShifts);
          if (parsed.payments) setPayments(parsed.payments);
          if (parsed.attendanceRecords) setAttendanceRecords(parsed.attendanceRecords);
          if (parsed.users) setUsers(parsed.users);
          if (parsed.permissions) {
            setPermissions({
              ...parsed.permissions,
              'Super Admin': buildRolePermissions('Super Admin'),
            });
          }
          if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
          if (parsed.settings) setSettings(parsed.settings);
          if (parsed.companies) setCompanies(parsed.companies);
          if (parsed.currentCompanyId) setSelectedCompanyId(parsed.currentCompanyId);
          if (typeof parsed.isEmptyDbMode === 'boolean') setIsEmptyDbMode(parsed.isEmptyDbMode);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      const payload = {
        products,
        categories,
        suppliers,
        customers,
        sales,
        purchaseOrders,
        goodsReceipts,
        supplierInvoices,
        purchaseReturns,
        stockMovements,
        stockCounts,
        expenses,
        cashShifts,
        payments,
        attendanceRecords,
        users,
        permissions,
        auditLogs,
        settings,
        companies,
        currentCompanyId: selectedCompanyId,
        isEmptyDbMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [
    products,
    categories,
    suppliers,
    customers,
    sales,
    purchaseOrders,
    goodsReceipts,
    supplierInvoices,
    purchaseReturns,
    stockMovements,
    stockCounts,
    expenses,
    cashShifts,
    payments,
    attendanceRecords,
    users,
    permissions,
    auditLogs,
    settings,
    companies,
    selectedCompanyId,
    isEmptyDbMode,
  ]);

  const notify = (
    typeOrMessage: ToastNotification['type'] | string,
    titleOrTypeOrMessage?: string,
    maybeMessage?: string
  ) => {
    let type: ToastNotification['type'] = 'info';
    let title = 'Notification';
    let message = '';

    const validTypes: Array<ToastNotification['type']> = ['success', 'warning', 'error', 'info'];

    if (maybeMessage !== undefined) {
      type = validTypes.includes(typeOrMessage as ToastNotification['type'])
        ? (typeOrMessage as ToastNotification['type'])
        : 'info';
      title = titleOrTypeOrMessage || 'Notification';
      message = maybeMessage;
    } else if (titleOrTypeOrMessage !== undefined) {
      if (validTypes.includes(typeOrMessage as ToastNotification['type'])) {
        type = typeOrMessage as ToastNotification['type'];
        title = type.charAt(0).toUpperCase() + type.slice(1);
        message = titleOrTypeOrMessage;
      } else if (validTypes.includes(titleOrTypeOrMessage as ToastNotification['type'])) {
        type = titleOrTypeOrMessage as ToastNotification['type'];
        title = type.charAt(0).toUpperCase() + type.slice(1);
        message = typeOrMessage;
      } else {
        type = 'info';
        title = typeOrMessage;
        message = titleOrTypeOrMessage;
      }
    } else {
      type = 'info';
      title = 'Notice';
      message = typeOrMessage;
    }

    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [{ id, type, title, message }, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshAuthorizedBusinessUsers = async (token: string, companyId: string) => {
    const requestId = ++staffDirectoryRequestId.current;
    try {
      const response = await apiFetch('/api/auth/staff-directory', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Company-Id': companyId,
        },
      });
      const data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.users)) {
        throw new Error(data.error || 'Unable to load staff assigned to this business.');
      }
      if (requestId !== staffDirectoryRequestId.current) return;
      setAuthorizedBusinessUsers(
        data.users.map((serverUser: UserAccount) => ({
          ...users.find((cachedUser) => cachedUser.id === serverUser.id),
          ...serverUser,
        }))
      );
    } catch (error) {
      if (requestId !== staffDirectoryRequestId.current) return;
      const message =
        error instanceof Error ? error.message : 'Unable to load staff assigned to this business.';
      setAuthorizedBusinessUsers([]);
      notify('error', 'Business Staff Unavailable', message);
    }
  };

  // Validate existing server session token on initial mount against backend
  useEffect(() => {
    const savedToken = localStorage.getItem('fresh_pos_token');
    if (!savedToken) {
      setIsAuthenticated(false);
      setCurrentUser(UNAUTHENTICATED_GUEST);
      setIsVerifyingSession(false);
      return;
    }

    setIsVerifyingSession(true);
    apiFetch('/api/auth/session', {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.success && data.authenticated && data.user) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
          setAuthToken(savedToken);
          const initialCompanyId = data.user.role === 'Super Admin' ? 'all' : data.user.companyId;
          if (initialCompanyId) {
            void refreshAuthorizedBusinessUsers(savedToken, initialCompanyId);
          }
        } else {
          // Token is invalid, expired, or revoked
          localStorage.removeItem('fresh_pos_token');
          setAuthToken(null);
          setIsAuthenticated(false);
          setCurrentUser(UNAUTHENTICATED_GUEST);
          staffDirectoryRequestId.current += 1;
          setAuthorizedBusinessUsers([]);
        }
      })
      .catch((err) => {
        // Strict security: Reject session and never fall back to local or demo authentication
        localStorage.removeItem('fresh_pos_token');
        setAuthToken(null);
        setIsAuthenticated(false);
        setCurrentUser(UNAUTHENTICATED_GUEST);
        staffDirectoryRequestId.current += 1;
        setAuthorizedBusinessUsers([]);
        console.warn('[Security] Session validation failed:', err);
      })
      .finally(() => {
        setIsVerifyingSession(false);
      });
  }, []);

  const login = async (
    identifier: string,
    password: string,
    rememberMe = false
  ): Promise<{ success: boolean; error?: string; redirectModule?: ModuleKey }> => {
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Authentication failed. Please verify your credentials.',
        };
      }

      setAuthToken(data.token);
      setIsAuthenticated(true);
      setCurrentUser(data.user);
      localStorage.setItem('fresh_pos_token', data.token);
      const initialCompanyId = data.user.role === 'Super Admin' ? 'all' : data.user.companyId;
      if (initialCompanyId) {
        await refreshAuthorizedBusinessUsers(data.token, initialCompanyId);
      }

      if (rememberMe) {
        localStorage.setItem('fresh_pos_remembered', identifier);
        setRememberedIdentifier(identifier);
      } else {
        localStorage.removeItem('fresh_pos_remembered');
        setRememberedIdentifier('');
      }

      const redirectMod = (data.redirectModule as ModuleKey) || 'pos';
      setActiveModule(redirectMod);
      notify('success', 'Authentication Successful', `Welcome back, ${data.user.name}`);
      return { success: true, redirectModule: redirectMod };
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to connect to authentication server. Please check your network connection.';
      return {
        success: false,
        error: message,
      };
    }
  };

  const logout = async () => {
    try {
      if (authToken) {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        });
      }
    } catch {
      // Ignore network failures on logout
    }
    setAuthToken(null);
    setIsAuthenticated(false);
    setCurrentUser(UNAUTHENTICATED_GUEST);
    localStorage.removeItem('fresh_pos_token');
    notify('info', 'Logged Out', 'You have been safely logged out of Fresh & More M-POS.');
  };

  const hasPermission = (module: ModuleKey, action: PermissionAction): boolean => {
    // Super Admin access is authoritative and cannot be narrowed by stored overrides.
    if (currentUser.role === 'Super Admin') {
      return true;
    }
    // 1. Custom user overrides take precedence if defined
    if (currentUser.customPermissions?.[module]?.[action] !== undefined) {
      return Boolean(currentUser.customPermissions[module]![action]);
    }
    // 2. Role matrix default
    const roleMatrix = permissions[currentUser.role];
    if (!roleMatrix || !roleMatrix[module]) {
      if (module === 'staff_management' || module === 'staff_list' || module === 'users_roles') {
        return ['Super Admin', 'Business Owner', 'Manager'].includes(currentUser.role);
      }
      return false;
    }
    return Boolean(roleMatrix[module][action]);
  };

  const enforcePermission = (module: ModuleKey, action: PermissionAction): boolean => {
    const allowed = hasPermission(module, action);
    if (!allowed) {
      notify(
        'error',
        'Permission Denied',
        `Role "${currentUser.role}" is not authorized for "${action.toUpperCase()}" on ${module.replace('_', ' ')}.`
      );
      logAudit(
        `Blocked Unauthorized ${action}`,
        module,
        currentUser.name,
        `Role ${currentUser.role} attempted ${action} without permission`,
        'Warning'
      );
    }
    return allowed;
  };

  const canManageUsersAndRoles = (): boolean => {
    return ['Super Admin', 'Business Owner', 'Manager'].includes(currentUser.role);
  };

  const canDeleteStaff = (): boolean => {
    return ['Super Admin', 'Business Owner'].includes(currentUser.role);
  };

  const canViewCostPrice = (): boolean => {
    return currentUser.role !== 'Cashier';
  };

  const canViewExecutiveFinancials = (): boolean => {
    return ['Super Admin', 'Business Owner', 'Manager'].includes(currentUser.role);
  };

  const canViewGrossProfit = (): boolean => {
    return ['Super Admin', 'Business Owner', 'Manager'].includes(currentUser.role);
  };

  // Helper for background/server API enforcement
  const callBackendApi = async (
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          'X-Company-Id': currentCompanyId,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        const errorMsg = data.error || `Server verification failed (HTTP ${res.status})`;
        notify('error', 'Server Security Error', errorMsg);
        return { success: false, error: errorMsg };
      }
      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unable to contact the authorization server.';
      notify('error', 'Server Security Error', errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Time Sync Helpers
  const todayString = useMemo(
    () => timeSync.getTodayString(timeSyncState.timeZone),
    [timeSyncState.timeZone, currentTime]
  );
  const yesterdayString = useMemo(
    () => timeSync.getYesterdayString(timeSyncState.timeZone),
    [timeSyncState.timeZone, currentTime]
  );

  const syncTimeNow = async (): Promise<boolean> => {
    const res = await timeSync.syncNow();
    if (res) {
      notify('success', 'Time Synchronized', `Synchronized with ${timeSyncState.timeZone} network time.`);
    } else {
      notify('warning', 'Time Sync Offline', 'Using local device clock with cached offset.');
    }
    return res;
  };

  const setTimeZone = (zone: string) => {
    timeSync.setTimeZone(zone);
    setSettings((prev) => ({ ...prev, timezone: zone }));
    logAudit('Time Zone Updated', 'Settings', zone, `Business time zone set to ${zone}`);
    notify('info', 'Time Zone Updated', `System time zone is now ${zone}.`);
  };

  const setTimeFormat = (fmt: '12h' | '24h') => {
    timeSync.setTimeFormat(fmt);
    setSettings((prev) => ({ ...prev, timeFormat: fmt }));
    notify('info', 'Time Format Updated', `Display format set to ${fmt}.`);
  };

  const formatDate = (
    dateInput?: Date | string | number,
    options?: { weekday?: 'short' | 'long' | 'none'; includeYear?: boolean }
  ) => {
    return timeSync.formatDisplayDate(dateInput || currentTime, timeSyncState.timeZone, options);
  };

  const formatTime = (
    dateInput?: Date | string | number,
    fmt: '12h' | '24h' = timeSyncState.timeFormat,
    includeSec: boolean = false
  ) => {
    return timeSync.formatTime(dateInput || currentTime, timeSyncState.timeZone, fmt, includeSec);
  };

  const formatDateTime = (dateInput?: Date | string | number) => {
    return timeSync.formatTimestamp(dateInput || currentTime, timeSyncState.timeZone);
  };

  const logAudit = (
    action: string,
    module: string,
    record: string,
    reason: string,
    severity: AuditLog['severity'] = 'Info'
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      date: timeSync.formatTimestamp(timeSync.getNow(), timeSyncState.timeZone),
      user: currentUser.name,
      role: currentUser.role,
      action,
      module,
      record,
      reason,
      severity,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const completeSale = (
    saleData: Omit<Sale, 'id' | 'reference' | 'date' | 'time' | 'timestamp' | 'cashier' | 'branch'>
  ): Sale | null => {
    if (!enforcePermission('pos', 'create') || !requireSelectedBusiness()) return null;

    for (const item of saleData.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod || !belongsToCurrentBusiness(prod) || prod.stock < item.qty) {
        notify('error', 'Insufficient Stock', `Not enough stock for ${item.productName}. Available: ${prod?.stock ?? 0}`);
        return null;
      }
    }

    const nextNum = 126 + sales.length;
    const reference = `S-000${nextNum}`;
    const nowDate = timeSync.getNow();
    const dateStr = timeSync.getTodayString(timeSyncState.timeZone);
    const timeStr = timeSync.formatTime(nowDate, timeSyncState.timeZone, timeSyncState.timeFormat);
    const newSale: Sale = {
      ...saleData,
      companyId: currentCompanyId,
      id: `sal-${Date.now()}`,
      reference,
      date: dateStr,
      time: timeStr,
      timestamp: nowDate.toISOString(),
      cashier: currentUser.name,
      branch: currentBranch,
    };

    setSales((prev) => [newSale, ...prev]);

    const newMovements: StockMovement[] = [];
    setProducts((prev) =>
      prev.map((p) => {
        const line = saleData.items.find((i) => i.productId === p.id);
        if (!line) return p;
        const updatedStock = Math.max(0, p.stock - line.qty);
        newMovements.push({
          id: `mov-${Date.now()}-${p.id}`,
          date: `${dateStr} ${timeStr}`,
          reference,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          type: 'Sale',
          qtyIn: 0,
          qtyOut: line.qty,
          balance: updatedStock,
          unitCost: p.costPrice,
          user: currentUser.name,
          notes: `POS Sale (${saleData.paymentMethod})`,
          companyId: currentCompanyId,
        });
        return { ...p, stock: updatedStock };
      })
    );
    setStockMovements((prev) => [...newMovements, ...prev]);

    let cashPortion = 0;
    const newPayments: PaymentRecord[] = [];
    if (saleData.paymentMethod === 'Split Payment' && saleData.splits) {
      saleData.splits.forEach((sp, idx) => {
        if (sp.method === 'Cash') cashPortion += sp.amount;
        if (sp.method !== 'Credit' && sp.amount > 0) {
          newPayments.push({
            id: `pay-${Date.now()}-${idx}`,
            reference: `PAY-00${311 + payments.length + idx}`,
            type: 'Sale Payment',
            relatedRecord: reference,
            partyName: saleData.customerName,
            method: sp.method,
            amount: sp.amount,
            user: currentUser.name,
            date: dateStr,
            time: timeStr,
            status: 'Reconciled',
            companyId: currentCompanyId,
          });
        }
      });
    } else if (saleData.paymentMethod !== 'Credit') {
      if (saleData.paymentMethod === 'Cash') cashPortion = saleData.total;
      newPayments.push({
        id: `pay-${Date.now()}`,
        reference: `PAY-00${311 + payments.length}`,
        type: 'Sale Payment',
        relatedRecord: reference,
        partyName: saleData.customerName,
        method: saleData.paymentMethod as Exclude<PaymentMethod, 'Split Payment'>,
        amount: saleData.paidAmount,
        user: currentUser.name,
        date: dateStr,
        time: timeStr,
        status: 'Reconciled',
        companyId: currentCompanyId,
      });
    }
    if (newPayments.length > 0) {
      setPayments((prev) => [...newPayments, ...prev]);
    }

    if (cashPortion > 0) {
      setCashShifts((prev) =>
        prev.map((sh) => {
          if (sh.status !== 'Open' || !belongsToCurrentBusiness(sh)) return sh;
          const nextCashSales = sh.cashSales + cashPortion;
          const nextExpected =
            sh.openingCash + nextCashSales + sh.cashInflows - sh.cashRefunds - sh.cashExpenses - sh.cashWithdrawals;
          return {
            ...sh,
            cashSales: nextCashSales,
            expectedCash: nextExpected,
            actualCash: nextExpected,
            difference: 0,
          };
        })
      );
    }

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== saleData.customerId && c.name !== saleData.customerName) return c;
        return {
          ...c,
          totalPurchases: c.totalPurchases + saleData.total,
          outstandingBalance: c.outstandingBalance + saleData.balanceDue,
          dueDate: saleData.balanceDue > 0 ? saleData.dueDate || '2025-05-03' : c.dueDate,
        };
      })
    );

    logAudit('Sale Created', 'Point of Sale', `${reference} (${saleData.total.toLocaleString()} RWF)`, `Checkout via ${saleData.paymentMethod}`);
    notify('success', 'Sale Completed', `Receipt ${reference} generated (${saleData.total.toLocaleString()} RWF).`);
    return newSale;
  };

  const refundSale = (saleId: string, reason: string) => {
    if (!enforcePermission('pos', 'approve')) return;
    const target = sales.find((s) => s.id === saleId);
    if (!target || !belongsToCurrentBusiness(target) || target.status === 'Refunded') return;

    setSales((prev) => prev.map((s) => (s.id === saleId ? { ...s, status: 'Refunded' } : s)));

    const newMovs: StockMovement[] = [];
    setProducts((prev) =>
      prev.map((p) => {
        const item = target.items.find((i) => i.productId === p.id);
        if (!item) return p;
        const nextStock = p.stock + item.qty;
        newMovs.push({
          id: `mov-ref-${Date.now()}-${p.id}`,
          date: '2025-04-26',
          reference: target.reference,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          type: 'Return',
          qtyIn: item.qty,
          qtyOut: 0,
          balance: nextStock,
          unitCost: p.costPrice,
          user: currentUser.name,
          notes: `Customer Refund: ${reason}`,
          companyId: target.companyId || currentCompanyId,
        });
        return { ...p, stock: nextStock };
      })
    );
    setStockMovements((prev) => [...newMovs, ...prev]);

    if (target.paymentMethod === 'Cash') {
      setCashShifts((prev) =>
        prev.map((sh) => {
          if (sh.status !== 'Open' || !belongsToCurrentBusiness(sh)) return sh;
          const nextRefunds = sh.cashRefunds + target.paidAmount;
          const nextExpected =
            sh.openingCash + sh.cashSales + sh.cashInflows - nextRefunds - sh.cashExpenses - sh.cashWithdrawals;
          return { ...sh, cashRefunds: nextRefunds, expectedCash: nextExpected, actualCash: nextExpected };
        })
      );
    }

    logAudit('Refund Approved', 'Point of Sale', target.reference, reason, 'Warning');
    notify('warning', 'Sale Refunded', `Sale ${target.reference} refunded and stock restored.`);
  };

  const holdSale = (held: Omit<HeldSale, 'id' | 'reference' | 'time'>) => {
    if (!requireSelectedBusiness()) return;
    const newHeld: HeldSale = {
      ...held,
      companyId: currentCompanyId,
      id: `hld-${Date.now()}`,
      reference: `HOLD-${heldSales.length + 1}`,
      time: timeSync.formatTime(timeSync.getNow(), timeSyncState.timeZone, timeSyncState.timeFormat),
    };
    setHeldSales((prev) => [newHeld, ...prev]);
    notify('info', 'Sale Held', `Cart saved as ${newHeld.reference}.`);
  };

  const removeHeldSale = (id: string) => {
    setHeldSales((prev) => prev.filter((h) => h.id !== id));
  };

  const addProduct = (productData: Omit<Product, 'id' | 'imageSvg'> & { imageSvg?: string }) => {
    const targetCompanyId =
      currentUser.role === 'Super Admin'
        ? productData.companyId || (currentCompanyId === 'all' ? '' : currentCompanyId)
        : currentCompanyId;
    if (!enforcePermission('products', 'create')) return;
    if (
      !targetCompanyId ||
      targetCompanyId === 'all' ||
      (currentUser.role !== 'Super Admin' && targetCompanyId !== currentCompanyId) ||
      !accessibleCompanies.some((company) => company.id === targetCompanyId)
    ) {
      notify('error', 'Select a Business', 'Choose an authorized business before creating this product.');
      return;
    }
    const svg =
      productData.imageSvg ||
      makeProductSvg('#dcfce7', '#15803d', productData.name.slice(0, 5).toUpperCase(), 'pack');
    const newProd: Product = {
      ...productData,
      companyId: targetCompanyId,
      id: `prd-${Date.now()}`,
      imageSvg: svg,
    };
    setProducts((prev) => [newProd, ...prev]);

    // Authoritative backend tenant synchronization
    void callBackendApi('/api/products', 'POST', newProd);

    if (newProd.stock > 0) {
      const mov: StockMovement = {
        id: `mov-init-${Date.now()}`,
        date: timeSync.getTodayString(timeSyncState.timeZone),
        reference: 'INIT-STOCK',
        productId: newProd.id,
        productName: newProd.name,
        sku: newProd.sku,
        type: 'Adjustment',
        qtyIn: newProd.stock,
        qtyOut: 0,
        balance: newProd.stock,
        unitCost: newProd.costPrice,
        user: currentUser.name,
        notes: 'Initial opening stock on product creation',
        companyId: targetCompanyId,
      };
      setStockMovements((prev) => [mov, ...prev]);
    }
    logAudit('Product Created', 'Products', `${newProd.name} (${newProd.sku})`, 'New item added to catalog');
    notify('success', 'Product Added', `${newProd.name} added to catalog.`);
  };

  const updateProduct = (updated: Product) => {
    if (!enforcePermission('products', 'edit')) return;
    const existingProduct = products.find((product) => product.id === updated.id);
    if (!existingProduct || !belongsToCurrentBusiness(existingProduct)) {
      notify('error', 'Access Denied', 'This product does not belong to the active business.');
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === updated.id ? { ...updated, companyId: p.companyId || 'comp-1' } : p
      )
    );
    // Authoritative backend tenant synchronization
    void callBackendApi(`/api/products/${updated.id}`, 'PUT', updated);

    logAudit('Product Updated', 'Products', `${updated.name} (${updated.sku})`, 'Updated product details/pricing');
    notify('success', 'Product Updated', `${updated.name} has been updated.`);
  };

  const toggleProductStatus = (productId: string, reason: string) => {
    if (!enforcePermission('products', 'edit')) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod || !belongsToCurrentBusiness(prod)) return;
    const nextStatus = prod.status === 'Active' ? 'Inactive' : 'Active';
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, status: nextStatus } : p)));
    logAudit(`Product ${nextStatus}`, 'Products', `${prod.name} (${prod.sku})`, reason, 'Warning');
    notify('info', `Product ${nextStatus}`, `${prod.name} is now ${nextStatus}.`);
  };

  const adjustStock = (
    productId: string,
    type: StockMovementType,
    qtyDelta: number,
    unitCost: number,
    reason: string
  ) => {
    if (!enforcePermission('inventory', 'edit')) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod || !belongsToCurrentBusiness(prod)) return;

    const newStock = Math.max(0, prod.stock + qtyDelta);
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)));

    const ref = `ADJ-000${20 + stockMovements.length}`;
    const newMov: StockMovement = {
      id: `mov-${Date.now()}`,
      date: `${timeSync.getTodayString(timeSyncState.timeZone)} ${timeSync.formatTime(undefined, timeSyncState.timeZone, timeSyncState.timeFormat)}`,
      reference: ref,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      type,
      qtyIn: qtyDelta > 0 ? qtyDelta : 0,
      qtyOut: qtyDelta < 0 ? Math.abs(qtyDelta) : 0,
      balance: newStock,
      unitCost: unitCost || prod.costPrice,
      user: currentUser.name,
      notes: reason,
      companyId: currentCompanyId,
    };
    setStockMovements((prev) => [newMov, ...prev]);
    logAudit('Stock Adjusted', 'Inventory', `${ref} (${prod.name})`, reason, 'Warning');
    notify('success', 'Stock Adjusted', `${prod.name} stock updated to ${newStock} ${prod.unit}.`);
  };

  const recordStockCount = (category: string, itemsCounted: number, varianceCount: number, varianceValue: number) => {
    if (!enforcePermission('inventory', 'create') || !requireSelectedBusiness()) return;
    const yrMo = timeSync.formatDateISO(undefined, timeSyncState.timeZone).slice(0, 7);
    const ref = `CNT-${yrMo}-${String.fromCharCode(65 + (stockCounts.length % 26))}`;
    const newSession: StockCountSession = {
      id: `sc-${Date.now()}`,
      companyId: currentCompanyId,
      date: timeSync.getTodayString(timeSyncState.timeZone),
      reference: ref,
      category,
      countedBy: currentUser.name,
      itemsCounted,
      varianceCount,
      varianceValue,
      status: 'Completed',
    };
    setStockCounts((prev) => [newSession, ...prev]);
    logAudit('Stock Count Completed', 'Inventory', ref, `Counted ${itemsCounted} items in ${category}`);
    notify('success', 'Stock Count Logged', `Session ${ref} saved.`);
  };

  const addCategory = (name: string, description: string) => {
    if (!enforcePermission('categories', 'create') || !requireSelectedBusiness()) return;
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      companyId: currentCompanyId,
      name,
      description,
      status: 'Active',
    };
    setCategories((prev) => [...prev, newCat]);
    logAudit('Category Created', 'Categories', name, 'New product category');
    notify('success', 'Category Added', `${name} created.`);
  };

  const updateCategory = (id: string, name: string, description: string, status: 'Active' | 'Inactive') => {
    if (!enforcePermission('categories', 'edit')) return;
    const category = categories.find((item) => item.id === id);
    if (!category || !belongsToCurrentBusiness(category)) return;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name, description, status } : c)));
    notify('success', 'Category Updated', `${name} updated.`);
  };

  const deactivateCategory = (id: string) => {
    if (!enforcePermission('categories', 'edit')) return;
    const cat = categories.find((c) => c.id === id);
    if (!cat || !belongsToCurrentBusiness(cat)) return;
    const nextStatus = cat.status === 'Active' ? 'Inactive' : 'Active';
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c)));
    logAudit(`Category ${nextStatus}`, 'Categories', cat.name, 'Non-destructive status toggle');
    notify('info', `Category ${nextStatus}`, `${cat.name} is now ${nextStatus}.`);
  };

  const createPurchaseOrder = (
    poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdBy'>
  ): PurchaseOrder | null => {
    if (!enforcePermission('purchasing', 'create') || !requireSelectedBusiness()) return null;
    const poNumber = `PO-000${47 + purchaseOrders.length}`;
    const newPO: PurchaseOrder = {
      ...poData,
      companyId: currentCompanyId,
      id: `po-${Date.now()}`,
      poNumber,
      createdBy: currentUser.name,
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    logAudit('Purchase Order Created', 'Purchasing', `${poNumber} (${newPO.grandTotal.toLocaleString()} RWF)`, `Supplier: ${newPO.supplierName}`);
    notify('success', 'Purchase Order Created', `${poNumber} saved. Stock will only increase upon Goods Receipt.`);
    return newPO;
  };

  const updatePOStatus = (poId: string, status: PurchaseOrder['status'], reason = 'Manager review') => {
    if (!enforcePermission('purchasing', 'approve')) return;
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po || !belongsToCurrentBusiness(po)) return;
    setPurchaseOrders((prev) => prev.map((p) => (p.id === poId ? { ...p, status } : p)));
    logAudit(`Purchase Order ${status}`, 'Purchasing', po.poNumber, reason);
    notify('info', `PO ${status}`, `${po.poNumber} marked as ${status}.`);
  };

  const confirmGoodsReceipt = (
    receiptData: Omit<GoodsReceipt, 'id' | 'grnNumber' | 'receivedBy'>
  ): GoodsReceipt | null => {
    if (!enforcePermission('receiving', 'create') || !requireSelectedBusiness()) return null;
    const grnNumber = `GRN-000${39 + goodsReceipts.length}`;
    const newGRN: GoodsReceipt = {
      ...receiptData,
      companyId: currentCompanyId,
      id: `grn-${Date.now()}`,
      grnNumber,
      receivedBy: currentUser.name,
    };

    setGoodsReceipts((prev) => [newGRN, ...prev]);

    const newMovs: StockMovement[] = [];
    setProducts((prev) =>
      prev.map((prod) => {
        const line = receiptData.items.find((i) => i.productId === prod.id);
        if (!line || line.receiveNowQty <= 0) return prod;
        const netGoodQty = Math.max(0, line.receiveNowQty - line.damagedQty);
        const updatedStock = prod.stock + netGoodQty;
        newMovs.push({
          id: `mov-grn-${Date.now()}-${prod.id}`,
          date: `${receiptData.date} ${timeSync.formatTime(timeSync.getNow(), timeSyncState.timeZone, timeSyncState.timeFormat)}`,
          reference: grnNumber,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          type: 'Purchase Receipt',
          qtyIn: netGoodQty,
          qtyOut: 0,
          balance: updatedStock,
          unitCost: line.actualUnitCost,
          user: currentUser.name,
          notes: `Received against ${receiptData.poNumber}`,
          companyId: currentCompanyId,
        });
        return {
          ...prod,
          stock: updatedStock,
          costPrice: line.actualUnitCost || prod.costPrice,
          batchNumber: line.batchNumber || prod.batchNumber,
          expiryDate: line.expiryDate || prod.expiryDate,
        };
      })
    );
    setStockMovements((prev) => [...newMovs, ...prev]);

    setPurchaseOrders((prev) =>
      prev.map((po) => {
        if (po.id !== receiptData.poId && po.poNumber !== receiptData.poNumber) return po;
        const updatedItems = po.items.map((item) => {
          const rLine = receiptData.items.find((ri) => ri.productId === item.productId);
          if (!rLine) return item;
          return {
            ...item,
            receivedQty: item.receivedQty + rLine.receiveNowQty,
            rejectedQty: item.rejectedQty + rLine.rejectedQty,
          };
        });
        const allFulfilled = updatedItems.every((i) => i.receivedQty >= i.orderedQty);
        return {
          ...po,
          items: updatedItems,
          status: allFulfilled ? 'Received' : 'Partially Received',
        };
      })
    );

    setSuppliers((prev) =>
      prev.map((sup) => {
        if (sup.id !== receiptData.supplierId && sup.name !== receiptData.supplierName) return sup;
        return {
          ...sup,
          totalPurchases: sup.totalPurchases + receiptData.totalReceivedValue,
          outstandingBalance: sup.outstandingBalance + receiptData.totalReceivedValue,
          lastPurchaseDate: receiptData.date,
        };
      })
    );

    const newInvoice: SupplierInvoice = {
      id: `sinv-${Date.now()}`,
      companyId: currentCompanyId,
      invoiceNumber: `INV-${receiptData.poNumber.replace('PO-', '')}`,
      poNumber: receiptData.poNumber,
      supplierId: receiptData.supplierId,
      supplierName: receiptData.supplierName,
      date: receiptData.date,
      dueDate: '2025-05-10',
      amount: receiptData.totalReceivedValue,
      paidAmount: 0,
      status: 'Unpaid',
    };
    setSupplierInvoices((prev) => [newInvoice, ...prev]);

    logAudit('Purchase Approved & Received', 'Goods Receiving', `${grnNumber} (${receiptData.totalReceivedValue.toLocaleString()} RWF)`, `Receipt for ${receiptData.poNumber}`);
    notify('success', 'Goods Receipt Confirmed', `${grnNumber} posted. Inventory and supplier payables updated.`);
    return newGRN;
  };

  const recordSupplierPayment = (
    supplierId: string,
    invoiceId: string | null,
    amount: number,
    method: Exclude<PaymentMethod, 'Credit' | 'Split Payment'>,
    referenceNote: string
  ) => {
    if (!enforcePermission('purchasing', 'create')) return;
    const sup = suppliers.find((s) => s.id === supplierId);
    if (!sup || !belongsToCurrentBusiness(sup)) return;

    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === supplierId ? { ...s, outstandingBalance: Math.max(0, s.outstandingBalance - amount) } : s
      )
    );

    if (invoiceId) {
      setSupplierInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== invoiceId) return inv;
          const nextPaid = inv.paidAmount + amount;
          return {
            ...inv,
            paidAmount: nextPaid,
            status: nextPaid >= inv.amount ? 'Paid' : 'Partially Paid',
          };
        })
      );
    }

    const payRef = `PAY-00${311 + payments.length}`;
    const newPay: PaymentRecord = {
      id: `pay-${Date.now()}`,
      companyId: currentCompanyId,
      reference: payRef,
      type: 'Supplier Payment',
      relatedRecord: referenceNote || sup.name,
      partyName: sup.name,
      method,
      amount,
      user: currentUser.name,
      date: timeSync.getTodayString(timeSyncState.timeZone),
      time: timeSync.formatTime(undefined, timeSyncState.timeZone, timeSyncState.timeFormat),
      status: 'Reconciled',
    };
    setPayments((prev) => [newPay, ...prev]);

    logAudit('Payment Recorded', 'Suppliers', `${payRef} (${amount.toLocaleString()} RWF)`, `Paid to ${sup.name}`);
    notify('success', 'Supplier Payment Recorded', `${amount.toLocaleString()} RWF paid to ${sup.name}.`);
  };

  const createPurchaseReturn = (
    poNumber: string,
    supplierName: string,
    productId: string,
    qty: number,
    reason: string
  ) => {
    if (!enforcePermission('purchasing', 'edit')) return;
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const amount = qty * prod.costPrice;
    const retNum = `PR-000${13 + purchaseReturns.length}`;
    const newRet: PurchaseReturn = {
      id: `pret-${Date.now()}`,
      companyId: currentCompanyId,
      returnNumber: retNum,
      poNumber,
      supplierName,
      productName: prod.name,
      qty,
      amount,
      reason,
      date: timeSync.getTodayString(timeSyncState.timeZone),
      status: 'Completed',
    };
    setPurchaseReturns((prev) => [newRet, ...prev]);
    adjustStock(productId, 'Return', -qty, prod.costPrice, `Purchase return ${retNum}: ${reason}`);
  };

  const addSupplier = (supData: Omit<Supplier, 'id' | 'totalPurchases' | 'outstandingBalance' | 'lastPurchaseDate'>) => {
    if (!enforcePermission('suppliers', 'create') || !requireSelectedBusiness()) return;
    const newSup: Supplier = {
      ...supData,
      companyId: currentCompanyId,
      id: `sup-${Date.now()}`,
      totalPurchases: 0,
      outstandingBalance: 0,
      lastPurchaseDate: '-',
    };
    setSuppliers((prev) => [newSup, ...prev]);
    logAudit('Supplier Added', 'Suppliers', newSup.name, `TIN: ${newSup.tin}`);
    notify('success', 'Supplier Created', `${newSup.name} added.`);
  };

  const addCustomer = (
    cusData: Omit<Customer, 'id' | 'totalPurchases' | 'outstandingBalance' | 'status'>
  ): Customer | null => {
    if (!enforcePermission('customers', 'create') || !requireSelectedBusiness()) return null;
    const newCus: Customer = {
      ...cusData,
      companyId: currentCompanyId,
      id: `cus-${Date.now()}`,
      totalPurchases: 0,
      outstandingBalance: 0,
      status: 'Active',
    };
    setCustomers((prev) => [newCus, ...prev]);
    logAudit('Customer Added', 'Customers', newCus.name, `Credit limit: ${newCus.creditLimit.toLocaleString()} RWF`);
    notify('success', 'Customer Added', `${newCus.name} registered.`);
    return newCus;
  };

  const recordCreditRepayment = (
    saleId: string | null,
    customerId: string,
    amount: number,
    method: Exclude<PaymentMethod, 'Credit' | 'Split Payment'>,
    refNote: string
  ): boolean => {
    if (!enforcePermission('credit_sales', 'create')) return false;
    const cust = customers.find((c) => c.id === customerId);
    if (!cust || !belongsToCurrentBusiness(cust)) return false;

    if (amount <= 0 || amount > cust.outstandingBalance) {
      notify(
        'error',
        'Invalid Repayment Amount',
        `Repayment (${amount.toLocaleString()} RWF) cannot exceed outstanding balance (${cust.outstandingBalance.toLocaleString()} RWF).`
      );
      return false;
    }

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId) return c;
        const nextBal = Math.max(0, c.outstandingBalance - amount);
        return {
          ...c,
          outstandingBalance: nextBal,
          status: nextBal === 0 ? 'Active' : c.status,
        };
      })
    );

    if (saleId) {
      setSales((prev) =>
        prev.map((s) => {
          if (s.id !== saleId) return s;
          const nextPaid = s.paidAmount + amount;
          const nextBal = Math.max(0, s.balanceDue - amount);
          return {
            ...s,
            paidAmount: nextPaid,
            balanceDue: nextBal,
            status: nextBal === 0 ? 'Completed' : 'Pending',
          };
        })
      );
    }

    const payRef = `PAY-00${311 + payments.length}`;
    const newPay: PaymentRecord = {
      id: `pay-${Date.now()}`,
      companyId: currentCompanyId,
      reference: payRef,
      type: 'Credit Collection',
      relatedRecord: refNote || cust.name,
      partyName: cust.name,
      method,
      amount,
      user: currentUser.name,
      date: timeSync.getTodayString(timeSyncState.timeZone),
      time: timeSync.formatTime(undefined, timeSyncState.timeZone, timeSyncState.timeFormat),
      status: 'Reconciled',
    };
    setPayments((prev) => [newPay, ...prev]);

    if (method === 'Cash') {
      setCashShifts((prev) =>
        prev.map((sh) => {
          if (sh.status !== 'Open' || !belongsToCurrentBusiness(sh)) return sh;
          const nextInflows = sh.cashInflows + amount;
          const nextExpected =
            sh.openingCash + sh.cashSales + nextInflows - sh.cashRefunds - sh.cashExpenses - sh.cashWithdrawals;
          return { ...sh, cashInflows: nextInflows, expectedCash: nextExpected, actualCash: nextExpected };
        })
      );
    }

    logAudit('Payment Recorded', 'Credit Sales', `${payRef} (${amount.toLocaleString()} RWF)`, `Received from ${cust.name}`);
    notify('success', 'Credit Repayment Recorded', `Collected ${amount.toLocaleString()} RWF from ${cust.name}.`);
    return true;
  };

  const addExpense = (expData: Omit<Expense, 'id' | 'reference' | 'user' | 'currency'>) => {
    if (!enforcePermission('expenses', 'create') || !requireSelectedBusiness()) return;
    const reference = `EXP-000${82 + expenses.length}`;
    const newExp: Expense = {
      ...expData,
      companyId: currentCompanyId,
      id: `exp-${Date.now()}`,
      reference,
      currency: 'RWF',
      user: currentUser.name,
    };
    setExpenses((prev) => [newExp, ...prev]);

    if (expData.status === 'Approved') {
      const payRef = `PAY-00${311 + payments.length}`;
      setPayments((prev) => [
        {
          id: `pay-${Date.now()}`,
          companyId: currentCompanyId,
          reference: payRef,
          type: 'Expense Payment',
          relatedRecord: reference,
          partyName: expData.category,
          method: expData.paymentMethod,
          amount: expData.amount,
          user: currentUser.name,
          date: expData.date || timeSync.getTodayString(timeSyncState.timeZone),
          time: timeSync.formatTime(undefined, timeSyncState.timeZone, timeSyncState.timeFormat),
          status: 'Reconciled',
        },
        ...prev,
      ]);

      if (expData.paymentMethod === 'Cash') {
        setCashShifts((prev) =>
          prev.map((sh) => {
            if (sh.status !== 'Open' || !belongsToCurrentBusiness(sh)) return sh;
            const nextExp = sh.cashExpenses + expData.amount;
            const nextExpected =
              sh.openingCash + sh.cashSales + sh.cashInflows - sh.cashRefunds - nextExp - sh.cashWithdrawals;
            return { ...sh, cashExpenses: nextExp, expectedCash: nextExpected, actualCash: nextExpected };
          })
        );
      }
    }

    logAudit('Expense Created', 'Expenses', `${reference} (${expData.amount.toLocaleString()} RWF)`, expData.description);
    notify('success', 'Expense Logged', `${reference} saved.`);
  };

  const approveExpense = (expId: string) => {
    if (!enforcePermission('expenses', 'approve')) return;
    const target = expenses.find((e) => e.id === expId);
    if (!target || target.status === 'Approved') return;
    setExpenses((prev) => prev.map((e) => (e.id === expId ? { ...e, status: 'Approved' } : e)));
    logAudit('Expense Approved', 'Expenses', target.reference, `Approved ${target.amount.toLocaleString()} RWF`);
    notify('success', 'Expense Approved', `${target.reference} is now Approved.`);
  };

  const openCashShift = (openingCash: number) => {
    if (!enforcePermission('cash_management', 'create') || !requireSelectedBusiness()) return;
    const hasOpen = cashShifts.some((s) => s.status === 'Open' && belongsToCurrentBusiness(s));
    if (hasOpen) {
      notify('warning', 'Shift Already Open', 'Please close the active shift first.');
      return;
    }
    const newShift: CashShift = {
      id: `shf-${Date.now()}`,
      companyId: currentCompanyId,
      cashier: currentUser.name,
      openingTime: timeSync.formatTimestamp(undefined, timeSyncState.timeZone),
      closingTime: '-',
      openingCash,
      cashSales: 0,
      cashInflows: 0,
      cashRefunds: 0,
      cashExpenses: 0,
      cashWithdrawals: 0,
      expectedCash: openingCash,
      actualCash: openingCash,
      difference: 0,
      status: 'Open',
    };
    setCashShifts((prev) => [newShift, ...prev]);
    logAudit('Shift Opened', 'Cash Management', `Opening: ${openingCash.toLocaleString()} RWF`, 'Cashier shift opened');
    notify('success', 'Shift Opened', `Drawer opened with ${openingCash.toLocaleString()} RWF.`);
  };

  const countCashShift = (actualCash: number, note?: string) => {
    setCashShifts((prev) =>
      prev.map((sh) => {
        if (sh.status !== 'Open' || !belongsToCurrentBusiness(sh)) return sh;
        const diff = actualCash - sh.expectedCash;
        return { ...sh, actualCash, difference: diff, discrepancyNote: note || sh.discrepancyNote };
      })
    );
    notify('info', 'Cash Count Updated', `Count: ${actualCash.toLocaleString()} RWF.`);
  };

  const closeCashShift = (actualCash: number, discrepancyNote: string) => {
    if (!enforcePermission('cash_management', 'edit')) return;
    const openShift = cashShifts.find((s) => s.status === 'Open');
    if (!openShift) return;

    const diff = actualCash - openShift.expectedCash;
    if (diff !== 0 && !discrepancyNote.trim()) {
      notify('error', 'Explanation Required', 'Cash discrepancy detected. Please explain.');
      return;
    }

    setCashShifts((prev) =>
      prev.map((sh) =>
        sh.id === openShift.id
          ? {
              ...sh,
              actualCash,
              difference: diff,
              discrepancyNote,
              closingTime: timeSync.formatTimestamp(undefined, timeSyncState.timeZone),
              status: 'Closed',
            }
          : sh
      )
    );
    logAudit('Cash Shift Closed', 'Cash Management', `Actual: ${actualCash.toLocaleString()} RWF`, discrepancyNote || 'Closed');
    notify('success', 'Shift Closed', `Final count: ${actualCash.toLocaleString()} RWF.`);
  };

  const reconcilePayment = (paymentId: string, status: PaymentRecord['status']) => {
    if (!enforcePermission('payments', 'edit')) return;
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status } : p)));
    notify('success', 'Payment Status Updated', `Payment marked as ${status}.`);
  };

  // Synchronized Attendance & Shift Punching
  const clockInStaff = async (userId?: string, notes?: string): Promise<boolean> => {
    const targetUser = userId ? users.find((u) => u.id === userId) || currentUser : currentUser;
    const today = timeSync.getTodayString(timeSyncState.timeZone);
    const clockTime = timeSync.formatTime(timeSync.getNow(), timeSyncState.timeZone, timeSyncState.timeFormat, true);

    const existing = attendanceRecords.find(
      (a) => a.userId === targetUser.id && a.date === today && a.status === 'Clocked In'
    );
    if (existing) {
      notify('info', 'Already Clocked In', `${targetUser.name} already clocked in today at ${existing.clockInTime}.`);
      return false;
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      companyId: currentCompanyId,
      userId: targetUser.id,
      userName: targetUser.name,
      role: targetUser.role,
      branch: currentBranch,
      date: today,
      clockInTime: clockTime,
      status: 'Clocked In',
      method: targetUser.role === 'Cashier' ? 'POS Sign-in' : 'Biometric/PIN',
      notes: notes || 'Automated timestamp recorded via synchronized clock',
    };

    setAttendanceRecords((prev) => [newRecord, ...prev]);
    logAudit('Staff Shift Clock-In', 'Attendance', targetUser.name, `Clocked in at ${clockTime} (${timeSyncState.timeZone})`);
    notify('success', 'Clock-In Recorded', `${targetUser.name} clocked in at ${clockTime}.`);
    return true;
  };

  const clockOutStaff = async (recordId?: string, notes?: string): Promise<boolean> => {
    const clockTime = timeSync.formatTime(timeSync.getNow(), timeSyncState.timeZone, timeSyncState.timeFormat, true);

    setAttendanceRecords((prev) =>
      prev.map((rec) => {
        const matches = recordId ? rec.id === recordId : rec.userId === currentUser.id && rec.status === 'Clocked In';
        if (!matches) return rec;

        return {
          ...rec,
          clockOutTime: clockTime,
          status: 'Clocked Out',
          notes: notes ? `${rec.notes ? rec.notes + ' • ' : ''}${notes}` : rec.notes,
        };
      })
    );

    logAudit('Staff Shift Clock-Out', 'Attendance', currentUser.name, `Clocked out at ${clockTime} (${timeSyncState.timeZone})`);
    notify('info', 'Clock-Out Recorded', `Clocked out at ${clockTime}.`);
    return true;
  };

  const deleteAttendanceRecord = (recordId: string, reason?: string) => {
    if (currentUser.role !== 'Super Admin' && currentUser.role !== 'Manager') {
      notify('error', 'Access Denied', 'Only Managers or Super Admins can delete attendance records.');
      return;
    }
    const target = attendanceRecords.find((a) => a.id === recordId);
    if (!target) return;
    setAttendanceRecords((prev) => prev.filter((a) => a.id !== recordId));
    logAudit('Attendance Record Deleted', 'Attendance', `${target.userName} (${target.date})`, reason || 'Attendance record removed', 'Warning');
    notify('info', 'Attendance Record Deleted', `Record for ${target.userName} removed.`);
  };

  const addUser = async (
    uData: Omit<UserAccount, 'id' | 'lastLogin'>,
    reason?: string
  ): Promise<boolean> => {
    if (!canManageUsersAndRoles()) {
      notify('error', 'Access Denied', 'Only authorized managers or administrators can create user accounts.');
      logAudit('Unauthorized User Creation Blocked', 'Staff Management', uData.name, 'Non-manager attempted user creation', 'Critical');
      return false;
    }
    const newUser: UserAccount = {
      ...uData,
      id: `usr-${Date.now()}`,
      lastLogin: 'Never',
    };
    const serverResult = await callBackendApi('/api/users', 'POST', { ...newUser, reason: reason || 'Staff account provisioned' });
    if (!serverResult.success) return false;
    setUsers((prev) => [...prev, newUser]);
    logAudit('User Account Created', 'Staff Management', `${newUser.name} (${newUser.role})`, reason || `Staff created by ${currentUser.name}`);
    notify('success', 'User Created', `${newUser.name} added as ${newUser.role}.`);
    return true;
  };

  const updateUser = async (
    userId: string,
    partial: Partial<UserAccount>,
    reason?: string
  ): Promise<boolean> => {
    if (!canManageUsersAndRoles()) {
      notify('error', 'Access Denied', 'Only authorized managers or administrators can edit user accounts.');
      return false;
    }
    const target = users.find((u) => u.id === userId);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...partial } : u)));
    logAudit(
      'User Account Updated',
      'Staff Management',
      `${target?.name || userId} profile updated`,
      reason || 'Staff profile modified',
      'Info'
    );
    notify('success', 'User Updated', 'Account details updated successfully.');
    return true;
  };

  const changeUserRole = async (
    userId: string,
    newRole: UserRole,
    reason?: string
  ): Promise<boolean> => {
    if (!canManageUsersAndRoles()) {
      notify('error', 'Access Denied', 'Only authorized managers or administrators can change staff roles.');
      logAudit(
        'Security Violation: Unauthorized Role Change Attempt',
        'Staff Management',
        userId,
        `Role change attempt blocked. User ${currentUser.name} is ${currentUser.role}`,
        'Critical'
      );
      return false;
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return false;
    const prevRole = target.role;

    // Call backend endpoint
    const serverResult = await callBackendApi(`/api/users/${userId}/role`, 'PUT', {
      newRole,
      previousRole: prevRole,
      targetUserName: target.name,
      reason: reason || `Assigned new role by ${currentUser.name}`,
    });
    if (!serverResult.success) return false;

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole, customPermissions: undefined } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, role: newRole, customPermissions: undefined }));
    }

    logAudit(
      'User Role Changed',
      'Staff Management',
      `${target.name}: ${prevRole} → ${newRole}`,
      reason || `${currentUser.name} changed ${target.name}'s role from ${prevRole} to ${newRole}`,
      'Warning'
    );
    notify('success', 'Role Updated', `${target.name}'s role changed to ${newRole}.`);
    return true;
  };

  const updateUserCustomPermissions = async (
    userId: string,
    customOverrides: UserAccount['customPermissions'],
    reason?: string
  ): Promise<boolean> => {
    if (!canManageUsersAndRoles()) {
      notify('error', 'Access Denied', 'Only authorized managers or administrators can configure custom permissions.');
      return false;
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return false;

    const serverResult = await callBackendApi(`/api/users/${userId}/permissions`, 'PUT', {
      targetUserName: target.name,
      customPermissions: customOverrides,
      reason: reason || 'Tailored operational clearance granted',
    });
    if (!serverResult.success) return false;

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, customPermissions: customOverrides } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, customPermissions: customOverrides }));
    }

    logAudit(
      'Custom User Permissions Updated',
      'Staff Management',
      `${target.name} customized permissions`,
      reason || 'Applied custom permission overrides',
      'Warning'
    );
    notify('success', 'Custom Permissions Saved', `Permissions customized for ${target.name}.`);
    return true;
  };

  const toggleUserStatus = async (userId: string, reason?: string): Promise<boolean> => {
    if (!canManageUsersAndRoles()) {
      notify('error', 'Access Denied', 'Only authorized managers or administrators can change account status.');
      return false;
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return false;
    const nextStatus = target.status === 'Active' ? 'Suspended' : 'Active';

    const serverResult = await callBackendApi(`/api/users/${userId}/toggle-status`, 'POST', {
      targetUserName: target.name,
      newStatus: nextStatus,
      reason: reason || 'Account status toggled',
    });
    if (!serverResult.success) return false;

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
    );
    logAudit(
      `User ${nextStatus === 'Active' ? 'Activated' : 'Suspended'}`,
      'Staff Management',
      `${target.name} (${nextStatus})`,
      reason || 'Staff status update',
      nextStatus === 'Suspended' ? 'Warning' : 'Info'
    );
    notify('info', 'User Status Updated', `${target.name} is now ${nextStatus}.`);
    return true;
  };

  const deactivateUser = async (userId: string, reason?: string): Promise<boolean> => {
    return toggleUserStatus(userId, reason || 'Account deactivated');
  };

  const resetUserAccess = async (userId: string, reason?: string): Promise<boolean> => {
    if (!canManageUsersAndRoles()) {
      notify('error', 'Access Denied', 'Only authorized managers or administrators can reset user access.');
      return false;
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return false;

    const serverResult = await callBackendApi(`/api/users/${userId}/reset`, 'POST', {
      targetUserName: target.name,
      reason: reason || 'Security reset requested',
    });
    if (!serverResult.success) return false;

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, pin: '1234', customPermissions: undefined, status: 'Active' } : u))
    );
    logAudit(
      'User Access Reset',
      'Staff Management',
      `${target.name} access reset to defaults (PIN: 1234)`,
      reason || 'Security credential reset',
      'Warning'
    );
    notify('success', 'Access Reset', `${target.name}'s credentials reset and custom overrides cleared.`);
    return true;
  };

  const updatePermission = (role: UserRole, module: ModuleKey, action: PermissionAction, value: boolean) => {
    updateRolePermissions(role, module, action, value);
  };

  const updateRolePermissions = async (
    role: UserRole,
    module: ModuleKey,
    action: PermissionAction,
    value: boolean,
    reason?: string
  ): Promise<boolean> => {
    if (role === 'Super Admin') {
      notify('error', 'Protected Role', 'Super Admin permissions are fixed at full system access.');
      return false;
    }
    if (!canManageUsersAndRoles()) {
      notify('error', 'Access Denied', 'Only authorized managers or administrators can modify permissions.');
      logAudit(
        'Security Violation: Unauthorized Permission Matrix Edit',
        'Staff Management',
        `${role} → ${module} (${action})`,
        `Unauthorized role (${currentUser.role}) attempted matrix alteration`,
        'Critical'
      );
      return false;
    }

    const serverResult = await callBackendApi(`/api/roles/${role}/permissions`, 'POST', {
      module,
      action,
      value,
      reason: reason || 'Policy matrix updated',
    });
    if (!serverResult.success) return false;

    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [module]: {
          ...prev[role][module],
          [action]: value,
        },
      },
    }));
    logAudit(
      'Role Permission Matrix Updated',
      'Role Management',
      `${role} → ${module} [${action} = ${value ? 'Allowed' : 'Denied'}]`,
      reason || 'Super Admin updated role permissions matrix',
      'Warning'
    );
    notify('info', 'Permission Updated', `${role}: ${module} [${action}] is now ${value ? 'Enabled' : 'Disabled'}.`);
    return true;
  };

  const resetRolePermissionsToDefault = (role: UserRole, reason?: string) => {
    if (currentUser.role !== 'Super Admin') {
      notify('error', 'Access Denied', 'Only Super Admin can reset role permissions.');
      return;
    }
    const defaults = buildRolePermissions(role);
    setPermissions((prev) => ({
      ...prev,
      [role]: defaults,
    }));
    logAudit(
      'Role Permissions Reset to Default',
      'Role Management',
      `${role} permissions reset`,
      reason || 'Super Admin restored default permissions matrix',
      'Warning'
    );
    notify('success', 'Reset Completed', `${role} permissions restored to factory defaults.`);
  };

  const updateSettings = (partial: Partial<BusinessSettings>) => {
    if (!enforcePermission('settings', 'edit')) return;
    setSettings((prev) => ({ ...prev, ...partial }));
    logAudit('Settings Updated', 'Settings', 'Configuration', 'Modified settings');
    notify('success', 'Settings Saved', 'Configuration applied.');
  };

  const deleteProduct = (productId: string, reason?: string) => {
    if (!enforcePermission('products', 'delete')) return;
    const product = products.find((item) => item.id === productId);
    if (!product || !belongsToCurrentBusiness(product)) {
      notify('error', 'Access Denied', 'This product does not belong to the active business.');
      return;
    }
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    // Authoritative backend tenant synchronization
    void callBackendApi(`/api/products/${productId}`, 'DELETE', { reason });

    logAudit('Product Deleted', 'Products', `${target.name} (${target.sku})`, reason || 'Deleted from inventory catalog', 'Warning');
    notify('info', 'Product Deleted', `${target.name} has been removed from catalog.`);
  };

  const deleteCategory = (categoryId: string, reason?: string) => {
    if (!enforcePermission('categories', 'delete')) return;
    const target = categories.find((c) => c.id === categoryId);
    if (!target || !belongsToCurrentBusiness(target)) return;
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    logAudit('Category Deleted', 'Categories', target.name, reason || 'Deleted by user', 'Info');
    notify('info', 'Category Deleted', `${target.name} removed.`);
  };

  const deleteSupplier = (supplierId: string, reason?: string) => {
    if (!enforcePermission('suppliers', 'delete')) return;
    const target = suppliers.find((s) => s.id === supplierId);
    if (!target || !belongsToCurrentBusiness(target)) return;
    setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
    logAudit('Supplier Deleted', 'Suppliers', target.name, reason || 'Vendor profile deleted', 'Warning');
    notify('info', 'Supplier Deleted', `${target.name} removed.`);
  };

  const deleteCustomer = (customerId: string, reason?: string) => {
    if (!enforcePermission('customers', 'delete')) return;
    const target = customers.find((c) => c.id === customerId);
    if (!target || !belongsToCurrentBusiness(target)) return;
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    logAudit('Customer Deleted', 'Customers', target.name, reason || 'Customer account deleted', 'Warning');
    notify('info', 'Customer Deleted', `${target.name} removed.`);
  };

  const deletePurchaseOrder = (poId: string, reason?: string) => {
    if (!enforcePermission('purchasing', 'delete')) return;
    const target = purchaseOrders.find((p) => p.id === poId);
    if (!target || !belongsToCurrentBusiness(target)) return;
    setPurchaseOrders((prev) => prev.filter((p) => p.id !== poId));
    logAudit('Purchase Order Deleted', 'Purchasing', target.poNumber, reason || 'Purchase order removed', 'Warning');
    notify('info', 'Purchase Order Deleted', `${target.poNumber} deleted.`);
  };

  const deleteGoodsReceipt = (grnId: string, reason?: string) => {
    if (!enforcePermission('receiving', 'delete')) return;
    const target = goodsReceipts.find((g) => g.id === grnId);
    if (!target || !belongsToCurrentBusiness(target)) return;
    setGoodsReceipts((prev) => prev.filter((g) => g.id !== grnId));
    logAudit('Goods Receipt Deleted', 'Goods Receiving', target.grnNumber, reason || 'GRN entry deleted', 'Warning');
    notify('info', 'Goods Receipt Deleted', `${target.grnNumber} removed.`);
  };

  const deleteSupplierInvoice = (invoiceId: string, reason?: string) => {
    if (!enforcePermission('purchasing', 'delete')) return;
    const target = supplierInvoices.find((i) => i.id === invoiceId);
    if (!target || !belongsToCurrentBusiness(target)) return;
    setSupplierInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
    logAudit('Supplier Invoice Deleted', 'Purchasing', target.invoiceNumber, reason || 'Invoice record deleted', 'Warning');
    notify('info', 'Invoice Deleted', `${target.invoiceNumber} removed.`);
  };

  const deletePurchaseReturn = (returnId: string, reason?: string) => {
    if (!enforcePermission('purchasing', 'delete')) return;
    const target = purchaseReturns.find((r) => r.id === returnId);
    if (!target || !belongsToCurrentBusiness(target)) return;
    setPurchaseReturns((prev) => prev.filter((r) => r.id !== returnId));
    logAudit('Purchase Return Deleted', 'Purchasing', target.returnNumber, reason || 'Return record deleted', 'Warning');
    notify('info', 'Return Deleted', `${target.returnNumber} removed.`);
  };

  const deleteStockMovement = (movementId: string, reason?: string) => {
    if (!enforcePermission('inventory', 'delete')) return;
    const target = stockMovements.find((m) => m.id === movementId);
    if (!target || !belongsToCurrentBusiness(target)) return;
    setStockMovements((prev) => prev.filter((m) => m.id !== movementId));
    logAudit('Stock Movement Deleted', 'Inventory', target.reference, reason || 'Movement record removed', 'Warning');
    notify('info', 'Stock Movement Deleted', `Record ${target.reference} removed.`);
  };

  const deleteStockCount = (countId: string, reason?: string) => {
    if (!enforcePermission('inventory', 'delete')) return;
    const target = stockCounts.find((c) => c.id === countId);
    if (!target || !belongsToCurrentBusiness(target)) return;
    setStockCounts((prev) => prev.filter((c) => c.id !== countId));
    logAudit('Stock Count Deleted', 'Inventory', target.reference, reason || 'Count session removed', 'Info');
    notify('info', 'Stock Count Deleted', `${target.reference} removed.`);
  };

  const deleteExpense = (expenseId: string, reason?: string) => {
    if (!enforcePermission('expenses', 'delete')) return;
    const target = expenses.find((e) => e.id === expenseId);
    if (!target || !belongsToCurrentBusiness(target)) return;
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    logAudit('Expense Deleted', 'Expenses', target.reference, reason || 'Expense record deleted', 'Warning');
    notify('info', 'Expense Deleted', `${target.reference} removed.`);
  };

  const deleteCashShift = (shiftId: string, reason?: string) => {
    if (!enforcePermission('cash_management', 'delete')) return;
    const target = cashShifts.find((s) => s.id === shiftId);
    if (!target || !belongsToCurrentBusiness(target)) return;
    setCashShifts((prev) => prev.filter((s) => s.id !== shiftId));
    logAudit('Cash Shift Deleted', 'Cash Management', `${target.cashier} (${target.openingTime})`, reason || 'Shift record deleted', 'Warning');
    notify('info', 'Cash Shift Deleted', `Shift entry removed.`);
  };

  const deletePayment = (paymentId: string, reason?: string) => {
    if (!enforcePermission('payments', 'delete')) return;
    const target = payments.find((p) => p.id === paymentId);
    if (!target || !belongsToCurrentBusiness(target)) return;
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    logAudit('Payment Deleted', 'Payments', target.reference, reason || 'Payment record deleted', 'Warning');
    notify('info', 'Payment Deleted', `${target.reference} removed.`);
  };

  const deleteSale = (saleId: string, reason?: string) => {
    if (!enforcePermission('pos', 'delete') && !enforcePermission('reports', 'delete')) return;
    const target = sales.find((s) => s.id === saleId);
    if (!target || !belongsToCurrentBusiness(target)) return;
    setSales((prev) => prev.filter((s) => s.id !== saleId));
    logAudit('Sale Record Deleted / Voided', 'Point of Sale', target.reference, reason || 'Sale record removed', 'Critical');
    notify('warning', 'Sale Deleted', `${target.reference} was deleted.`);
  };

  const deleteUser = async (userId: string, reason?: string): Promise<boolean> => {
    // Only the System Admin (Super Admin) and Business Owner are authorized to delete staff
    if (!['Super Admin', 'Business Owner'].includes(currentUser.role)) {
      notify('error', 'Access Denied', 'Only the System Admin and Business Owner are authorized to delete staff.');
      logAudit(
        'Unauthorized Staff Deletion Blocked',
        'Staff Management',
        `Staff ID: ${userId}`,
        `Role "${currentUser.role}" attempted to delete staff without System Admin or Business Owner authorization`,
        'Critical'
      );
      return false;
    }
    if (currentUser.id === userId) {
      notify('error', 'Cannot Delete Self', 'You cannot delete your own active administrator account.');
      return false;
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return false;

    const res = await callBackendApi(`/api/users/${userId}`, 'DELETE', {
      targetUserName: target.name,
      reason: reason || `Staff member deleted by ${currentUser.name} (${currentUser.role})`,
    });

    if (res && res.success === false) {
      return false;
    }

    // Remove staff member account from users list
    // Important: Historical sales, transactions, payments, shifts, and audit records linked to that staff member are preserved intact
    setUsers((prev) => prev.filter((u) => u.id !== userId));

    // Record every deletion in Audit Logs, including the staff member deleted, the user who performed the action, and the date and time
    logAudit(
      'Staff Member Deleted',
      'Staff Management',
      `Staff Member Deleted: ${target.name} (${target.role}) [ID: ${target.id}]`,
      `Deleted by ${currentUser.name} (${currentUser.role}) on ${timeSync.formatTimestamp(timeSync.getNow(), timeSyncState.timeZone)}. Reason: ${reason || 'Staff record removed'}. Historical sales, payments, transactions, and audit records preserved for reporting and accountability.`,
      'Critical'
    );
    notify('info', 'Staff Member Deleted', `${target.name} has been deleted. Historical records preserved.`);
    return true;
  };

  const deleteAuditLog = (logId: string) => {
    if (currentUser.role !== 'Super Admin') {
      notify('error', 'Access Denied', 'Only Super Admin can delete audit records.');
      return;
    }
    setAuditLogs((prev) => prev.filter((l) => l.id !== logId));
    notify('info', 'Audit Log Deleted', 'Audit record removed.');
  };

  const clearAllAuditLogs = () => {
    if (currentUser.role !== 'Super Admin') {
      notify('error', 'Access Denied', 'Only Super Admin can clear audit trail.');
      return;
    }
    setAuditLogs([]);
    notify('warning', 'Audit Trail Cleared', 'All audit logs have been purged.');
  };

  const clearAllHeldSales = () => {
    setHeldSales([]);
    notify('info', 'Held Orders Cleared', 'All suspended carts have been removed.');
  };

  const deleteBranch = (branchId: string) => {
    if (!enforcePermission('settings', 'edit')) return;
    const target = settings.branches.find((b) => b.id === branchId);
    if (!target) return;
    setSettings((prev) => ({
      ...prev,
      branches: prev.branches.filter((b) => b.id !== branchId),
    }));
    logAudit('Branch Deleted', 'Settings', target.name, 'Branch outlet location removed');
    notify('info', 'Branch Removed', `${target.name} was removed.`);
  };

  const addBranch = (branch: { name: string; location: string; manager: string; isWarehouse?: boolean }) => {
    if (!enforcePermission('settings', 'edit')) return;
    const newBranch = {
      ...branch,
      id: `br-${Date.now()}`,
    };
    setSettings((prev) => ({
      ...prev,
      branches: [...prev.branches, newBranch],
    }));
    logAudit('Branch Created', 'Settings', branch.name, 'New branch location added');
    notify('success', 'Branch Added', `${branch.name} was added.`);
  };

  const clearCart = () => {
    // POS-level cart clearing helper hook
  };

  const switchToEmptyDatabase = () => {
    setProducts([]);
    setCategories(INITIAL_CATEGORIES);
    setSuppliers([]);
    setCustomers([{ id: 'cus-0', name: 'Walk-in Customer', phone: '-', email: '-', totalPurchases: 0, creditLimit: 0, outstandingBalance: 0, dueDate: '-', status: 'Active' }]);
    setSales([]);
    setHeldSales([]);
    setPurchaseOrders([]);
    setGoodsReceipts([]);
    setSupplierInvoices([]);
    setPurchaseReturns([]);
    setStockMovements([]);
    setStockCounts([]);
    setExpenses([]);
    setCashShifts([]);
    setPayments([]);
    setAttendanceRecords([]);
    setAuditLogs([]);
    setIsEmptyDbMode(true);
    notify('info', 'Empty Database Mode Active', 'All records cleared. Displaying 0 RWF.');
  };

  const resetToDemoDatabase = () => {
    setProducts(INITIAL_PRODUCTS);
    setCategories(INITIAL_CATEGORIES);
    setSuppliers(INITIAL_SUPPLIERS);
    setCustomers(INITIAL_CUSTOMERS);
    setSales(INITIAL_SALES);
    setHeldSales([]);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setGoodsReceipts(INITIAL_GOODS_RECEIPTS);
    setSupplierInvoices(INITIAL_SUPPLIER_INVOICES);
    setPurchaseReturns(INITIAL_PURCHASE_RETURNS);
    setStockMovements(INITIAL_STOCK_MOVEMENTS);
    setStockCounts(INITIAL_STOCK_COUNTS);
    setExpenses(INITIAL_EXPENSES);
    setCashShifts(INITIAL_CASH_SHIFTS);
    setPayments(INITIAL_PAYMENTS);
    setAttendanceRecords(INITIAL_ATTENDANCE);
    setUsers(INITIAL_USERS);
    setPermissions(INITIAL_PERMISSIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSettings(INITIAL_SETTINGS);
    setIsEmptyDbMode(false);
    notify('success', 'Kigali Store Data Loaded', 'Restored Fresh & More operational records.');
  };

  const accessibleCompanies = useMemo(
    () =>
      currentUser.role === 'Super Admin'
        ? companies
        : companies.filter(
            (company) =>
              currentUser.companyId === company.id ||
              currentUser.assignedCompanyIds?.includes(company.id)
          ),
    [companies, currentUser.id, currentUser.role, currentUser.companyId, currentUser.assignedCompanyIds]
  );
  const currentCompanyId =
    currentUser.role === 'Super Admin'
      ? selectedCompanyId === 'all' || companies.some((company) => company.id === selectedCompanyId)
        ? selectedCompanyId
        : companies[0]?.id || ''
      : accessibleCompanies.some((company) => company.id === selectedCompanyId)
        ? selectedCompanyId
        : accessibleCompanies[0]?.id || '';
  const setCurrentCompanyId = (companyId: string) => {
    if (companyId === 'all' && currentUser.role !== 'Super Admin') {
      notify('error', 'Access Denied', 'Only Super Admin can view consolidated business data.');
      return;
    }
    if (companyId !== 'all' && !accessibleCompanies.some((company) => company.id === companyId)) {
      notify('error', 'Access Denied', 'You are not assigned to that business.');
      return;
    }
    setSelectedCompanyId(companyId);
    if (currentUser.role !== 'Super Admin' && authToken) {
      setAuthorizedBusinessUsers([]);
      void refreshAuthorizedBusinessUsers(authToken, companyId);
    }
  };
  const currentCompany = useMemo(
    () => companies.find((company) => company.id === currentCompanyId),
    [companies, currentCompanyId]
  );
  const requireSelectedBusiness = () => {
    if (!currentCompanyId || currentCompanyId === 'all') {
      notify('warning', 'Select a Business', 'Choose a specific business workspace before changing operational records.');
      return false;
    }
    return true;
  };
  const belongsToCurrentBusiness = (record: { companyId?: string }) =>
    currentUser.role === 'Super Admin' && currentCompanyId === 'all'
      ? true
      : (record.companyId || 'comp-1') === currentCompanyId;
  const scopeRecords = <T extends { companyId?: string }>(records: T[]) =>
    currentUser.role === 'Super Admin' && currentCompanyId === 'all'
      ? records
      : records.filter((record) => (record.companyId || 'comp-1') === currentCompanyId);
  const scopedProducts = useMemo(() => scopeRecords(products), [products, currentCompanyId, currentUser.role]);
  const scopedCategories = useMemo(() => scopeRecords(categories), [categories, currentCompanyId, currentUser.role]);
  const scopedSuppliers = useMemo(() => scopeRecords(suppliers), [suppliers, currentCompanyId, currentUser.role]);
  const scopedCustomers = useMemo(() => scopeRecords(customers), [customers, currentCompanyId, currentUser.role]);
  const scopedSales = useMemo(() => scopeRecords(sales), [sales, currentCompanyId, currentUser.role]);
  const scopedHeldSales = useMemo(() => scopeRecords(heldSales), [heldSales, currentCompanyId, currentUser.role]);
  const scopedPurchaseOrders = useMemo(() => scopeRecords(purchaseOrders), [purchaseOrders, currentCompanyId, currentUser.role]);
  const scopedGoodsReceipts = useMemo(() => scopeRecords(goodsReceipts), [goodsReceipts, currentCompanyId, currentUser.role]);
  const scopedSupplierInvoices = useMemo(() => scopeRecords(supplierInvoices), [supplierInvoices, currentCompanyId, currentUser.role]);
  const scopedPurchaseReturns = useMemo(() => scopeRecords(purchaseReturns), [purchaseReturns, currentCompanyId, currentUser.role]);
  const scopedStockMovements = useMemo(() => scopeRecords(stockMovements), [stockMovements, currentCompanyId, currentUser.role]);
  const scopedStockCounts = useMemo(() => scopeRecords(stockCounts), [stockCounts, currentCompanyId, currentUser.role]);
  const scopedExpenses = useMemo(() => scopeRecords(expenses), [expenses, currentCompanyId, currentUser.role]);
  const scopedCashShifts = useMemo(() => scopeRecords(cashShifts), [cashShifts, currentCompanyId, currentUser.role]);
  const scopedPayments = useMemo(() => scopeRecords(payments), [payments, currentCompanyId, currentUser.role]);
  const scopedAttendance = useMemo(() => scopeRecords(attendanceRecords), [attendanceRecords, currentCompanyId, currentUser.role]);
  const scopedUsers = currentUser.role === 'Super Admin' ? users : authorizedBusinessUsers;

  const allSales = useMemo(
    () => (currentUser.role === 'Super Admin' ? sales : scopedSales),
    [currentUser.role, sales, scopedSales]
  );
  const allProducts = useMemo(
    () => (currentUser.role === 'Super Admin' ? products : scopedProducts),
    [currentUser.role, products, scopedProducts]
  );

  const addCompany = async (comp: Omit<Company, 'id' | 'createdAt'>, reason?: string): Promise<boolean> => {
    if (currentUser.role !== 'Super Admin') {
      notify('error', 'Unauthorized', 'Only Super Admin can register new companies.');
      return false;
    }
    const newCompany: Company = {
      ...comp,
      id: `comp-${Date.now()}`,
      createdAt: timeSync.getTodayString(timeSyncState.timeZone),
      features: comp.features || createCompanyFeatures(),
    };
    setCompanies((prev) => [newCompany, ...prev]);
    logAudit('Company Registered', 'Governance', newCompany.name, reason || `New corporate entity registered: ${newCompany.code}`);
    notify('success', 'Company Created', `${newCompany.name} registered successfully.`);
    return true;
  };

  const updateCompany = async (id: string, partial: Partial<Company>, reason?: string): Promise<boolean> => {
    if (currentUser.role !== 'Super Admin') {
      notify('error', 'Unauthorized', 'Only Super Admin can update companies.');
      return false;
    }
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...partial } : c)));
    logAudit('Company Updated', 'Governance', id, reason || 'Company profile details modified');
    notify('success', 'Company Updated', 'Company details saved successfully.');
    return true;
  };

  const toggleCompanyStatus = async (id: string, reason?: string): Promise<boolean> => {
    if (currentUser.role !== 'Super Admin') {
      notify('error', 'Unauthorized', 'Only Super Admin can modify company status.');
      return false;
    }
    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const nextStatus: 'Active' | 'Inactive' = c.status === 'Active' ? 'Inactive' : 'Active';
        logAudit('Company Status Changed', 'Governance', c.name, reason || `Status set to ${nextStatus}`);
        return { ...c, status: nextStatus };
      })
    );
    notify('info', 'Status Updated', 'Company operational status updated.');
    return true;
  };

  const assignUsersToCompany = async (companyId: string, userIds: string[], reason?: string): Promise<boolean> => {
    if (currentUser.role !== 'Super Admin') {
      notify('error', 'Unauthorized', 'Only Super Admin can assign users to company.');
      return false;
    }
    const serverResult = await callBackendApi(`/api/companies/${companyId}/users`, 'PUT', {
      userIds,
      reason: reason || `Assigned ${userIds.length} users to ${companyId}`,
    });
    if (!serverResult.success) return false;
    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, assignedUserIds: userIds } : c))
    );
    setUsers((prev) =>
      prev.map((user) => {
        const assigned = new Set(user.assignedCompanyIds || []);
        if (userIds.includes(user.id)) assigned.add(companyId);
        else assigned.delete(companyId);
        const assignedCompanyIds = [...assigned];
        return {
          ...user,
          companyId:
            user.companyId === companyId && !userIds.includes(user.id)
              ? assignedCompanyIds[0]
              : user.companyId || (userIds.includes(user.id) ? companyId : undefined),
          assignedCompanyIds,
        };
      })
    );
    logAudit('Company Staff Assigned', 'Governance', companyId, reason || `Assigned ${userIds.length} users`);
    notify('success', 'Staff Assigned', `Assigned ${userIds.length} staff members.`);
    return true;
  };

  const deleteCompany = async (companyId: string, reason?: string): Promise<boolean> => {
    if (currentUser.role !== 'Super Admin') {
      notify('error', 'Unauthorized', 'Only Super Admin can delete companies.');
      return false;
    }
    const target = companies.find((c) => c.id === companyId);
    if (!target) return false;
    setCompanies((prev) => prev.filter((c) => c.id !== companyId));
    if (currentCompanyId === companyId) {
      const remaining = companies.filter((c) => c.id !== companyId);
      if (remaining.length > 0) {
        setCurrentCompanyId(remaining[0].id);
      }
    }
    logAudit(
      'Company Deleted',
      'Governance',
      target.name,
      reason || 'Super Admin deleted corporate entity',
      'Critical'
    );
    notify('warning', 'Company Deleted', `Company ${target.name} has been permanently deleted.`);
    return true;
  };

  const updateCompanyFeature = async (
    companyId: string,
    featureKey: FeatureKey,
    entitlement: Partial<FeatureEntitlement>,
    reason?: string
  ): Promise<boolean> => {
    if (currentUser.role !== 'Super Admin') {
      notify('error', 'Unauthorized', 'Only Super Admin can modify feature entitlements.');
      return false;
    }
    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id !== companyId) return c;
        const currentFeats = c.features || createCompanyFeatures();
        const existing = currentFeats[featureKey] || {
          key: featureKey,
          name: featureKey,
          category: 'Operations',
          allowed: false,
          paymentStatus: 'Paid',
          accessStatus: 'Unlocked',
        };
        const updatedFeat = { ...existing, ...entitlement };
        return {
          ...c,
          features: {
            ...currentFeats,
            [featureKey]: updatedFeat,
          },
        };
      })
    );
    logAudit('Company Feature Entitlement Modified', 'Governance', `${companyId}:${featureKey}`, reason || `Feature ${featureKey} entitlement updated`);
    notify('success', 'Feature Updated', `Feature entitlement for ${featureKey} updated.`);
    return true;
  };

  const updateCompanySubscription = async (
    companyId: string,
    sub: Partial<CompanySubscription>,
    reason?: string
  ): Promise<boolean> => {
    if (currentUser.role !== 'Super Admin') {
      notify('error', 'Unauthorized', 'Only Super Admin can update company subscriptions.');
      return false;
    }
    setCompanies((prev) =>
      prev.map((c) => {
        if (c.id !== companyId) return c;
        const currentSub: CompanySubscription = c.subscription || {
          planName: 'Enterprise Growth',
          planStatus: 'Paid & Active',
          billingCycle: 'Monthly',
          monthlyFee: 150000,
          startDate: '2025-01-01',
          renewalDate: '2026-12-31',
          currency: 'RWF',
          autoRenew: true,
        };
        const updatedSub: CompanySubscription = {
          ...currentSub,
          ...sub,
        };
        return {
          ...c,
          subscription: updatedSub,
        };
      })
    );
    logAudit('Company Subscription Updated', 'Governance', companyId, reason || `Subscription updated for ${companyId}`);
    notify('success', 'Subscription Saved', 'Company plan and subscription updated.');
    return true;
  };

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated,
        isVerifyingSession,
        authToken,
        rememberedIdentifier,
        setRememberedIdentifier,
        login,
        logout,
        currentBranch,
        setCurrentBranch,
        activeModule,
        setActiveModule,
        globalSearch,
        setGlobalSearch,
        isEmptyDbMode,
        products: scopedProducts,
        categories: scopedCategories,
        suppliers: scopedSuppliers,
        customers: scopedCustomers,
        sales: scopedSales,
        heldSales: scopedHeldSales,
        purchaseOrders: scopedPurchaseOrders,
        goodsReceipts: scopedGoodsReceipts,
        supplierInvoices: scopedSupplierInvoices,
        purchaseReturns: scopedPurchaseReturns,
        stockMovements: scopedStockMovements,
        stockCounts: scopedStockCounts,
        expenses: scopedExpenses,
        cashShifts: scopedCashShifts,
        payments: scopedPayments,
        users: scopedUsers,
        permissions,
        auditLogs,
        settings,
        companies: accessibleCompanies,
        accessibleCompanies,
        currentCompanyId,
        currentCompany,
        setCurrentCompanyId,
        allSales,
        allProducts,
        addCompany,
        updateCompany,
        toggleCompanyStatus,
        assignUsersToCompany,
        deleteCompany,
        updateCompanyFeature,
        updateCompanySubscription,
        toasts,
        notify,
        dismissToast,
        hasPermission,
        enforcePermission,
        canManageUsersAndRoles,
        canDeleteStaff,
        canViewCostPrice,
        canViewExecutiveFinancials,
        canViewGrossProfit,
        logAudit,
        completeSale,
        refundSale,
        holdSale,
        removeHeldSale,
        addProduct,
        updateProduct,
        toggleProductStatus,
        adjustStock,
        recordStockCount,
        addCategory,
        updateCategory,
        deactivateCategory,
        deleteProduct,
        deleteCategory,
        deleteSupplier,
        deleteCustomer,
        deletePurchaseOrder,
        deleteGoodsReceipt,
        deleteSupplierInvoice,
        deletePurchaseReturn,
        deleteStockMovement,
        deleteStockCount,
        deleteExpense,
        deleteCashShift,
        deletePayment,
        deleteSale,
        deleteUser,
        deleteAuditLog,
        clearAllAuditLogs,
        clearAllHeldSales,
        deleteBranch,
        addBranch,
        clearCart,
        createPurchaseOrder,
        updatePOStatus,
        confirmGoodsReceipt,
        recordSupplierPayment,
        createPurchaseReturn,
        addSupplier,
        addCustomer,
        recordCreditRepayment,
        addExpense,
        approveExpense,
        openCashShift,
        countCashShift,
        closeCashShift,
        reconcilePayment,
        addUser,
        updateUser,
        changeUserRole,
        updateUserCustomPermissions,
        toggleUserStatus,
        deactivateUser,
        resetUserAccess,
        updatePermission,
        updateRolePermissions,
        resetRolePermissionsToDefault,
        updateSettings,
        switchToEmptyDatabase,
        resetToDemoDatabase,

        // Automatic Time Synchronization & Attendance
        currentTime,
        todayString,
        yesterdayString,
        timeZone: timeSyncState.timeZone,
        timeFormat: timeSyncState.timeFormat,
        syncStatus: timeSyncState.status,
        isOnline: timeSyncState.isOnline,
        lastSyncedAt: timeSyncState.lastSyncedAt,
        offsetMs: timeSyncState.offsetMs,
        syncTimeNow,
        setTimeZone,
        setTimeFormat,
        formatDate,
        formatTime,
        formatDateTime,

        attendanceRecords: scopedAttendance,
        clockInStaff,
        clockOutStaff,
        deleteAttendanceRecord,

        // Firebase Cloud Sync
        isFirebaseConnected,
        firebaseProjectId,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
