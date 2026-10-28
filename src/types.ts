export type UserRole =
  | 'Super Admin'
  | 'Business Owner'
  | 'Manager'
  | 'Cashier'
  | 'Stock Manager';

export type ModuleKey =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'inventory'
  | 'categories'
  | 'purchasing'
  | 'receiving'
  | 'suppliers'
  | 'customers'
  | 'credit_sales'
  | 'expenses'
  | 'cash_management'
  | 'payments'
  | 'accounting'
  | 'reports'
  | 'companies'
  | 'super_admin'
  | 'users_roles'
  | 'staff_management'
  | 'staff_list'
  | 'audit_logs'
  | 'settings';

export type PermissionAction = 'view' | 'create' | 'edit' | 'approve' | 'delete' | 'export';

export type RolePermissions = Record<ModuleKey, Record<PermissionAction, boolean>>;

export type PaymentMethod = 'Cash' | 'MoMo' | 'Bank' | 'Card' | 'Credit' | 'Split Payment';

export interface CompanyBranch {
  id: string;
  name: string;
  location: string;
  manager: string;
  isWarehouse?: boolean;
}

export type FeatureCategory =
  | 'Sales'
  | 'Inventory'
  | 'Purchasing'
  | 'Finance'
  | 'Administration'
  | 'Reports';

export type FeatureKey =
  // Sales
  | 'pos'
  | 'selling_items'
  | 'sales'
  | 'customers'
  | 'discounts'
  | 'receipts'
  // Inventory
  | 'inventory'
  | 'stock_management'
  | 'stock_transfers'
  | 'stock_adjustments'
  | 'low_stock_alerts'
  // Purchasing
  | 'suppliers'
  | 'purchase_orders'
  | 'purchases'
  | 'supplier_payments'
  // Finance
  | 'expenses'
  | 'payments'
  | 'financial_reports'
  // Administration
  | 'users'
  | 'roles_permissions'
  | 'business_settings'
  // Reports
  | 'sales_reports'
  | 'inventory_reports'
  | 'business_reports';

export type FeaturePaymentStatus = 'Paid' | 'Trial' | 'Pending Payment' | 'Expired' | 'Disabled';
export type FeatureAccessStatus = 'Active' | 'Restricted' | 'Disabled' | 'Not Assigned';

export interface FeatureEntitlement {
  key: FeatureKey;
  name: string;
  category: FeatureCategory;
  allowed: boolean;
  paymentStatus: FeaturePaymentStatus;
  accessStatus: FeatureAccessStatus;
  monthlyFee: number;
  validUntil: string;
  notes?: string;
}

export interface CompanySubscription {
  planName: 'Enterprise Growth' | 'Professional Retail' | 'Standard Business' | 'Custom Plan' | 'Starter Trial';
  planStatus: 'Paid & Active' | 'Trial' | 'Pending Payment' | 'Expired' | 'Disabled';
  billingCycle: 'Monthly' | 'Quarterly' | 'Annual';
  monthlyFee: number;
  startDate: string;
  renewalDate: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  currency: 'RWF' | 'USD';
  autoRenew: boolean;
  notes?: string;
}

export interface Company {
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
  description?: string;
  logoSvg?: string;
  createdAt: string;
  branches: CompanyBranch[];
  assignedUserIds?: string[];
  ownerName?: string;
  subscription?: CompanySubscription;
  features?: Partial<Record<FeatureKey, FeatureEntitlement>>;
}

export interface Product {
  id: string;
  companyId?: string;
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
  expiryDate: string; // YYYY-MM-DD
  taxRate: number; // e.g. 18
  status: 'Active' | 'Inactive';
  imageSvg: string;
  description?: string;
}

export interface Category {
  id: string;
  companyId?: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
}

export type StockMovementType =
  | 'Purchase Receipt'
  | 'Sale'
  | 'Return'
  | 'Damage'
  | 'Expired'
  | 'Adjustment'
  | 'Transfer';

export interface StockMovement {
  id: string;
  companyId?: string;
  date: string;
  reference: string;
  productId: string;
  productName: string;
  sku: string;
  type: StockMovementType;
  qtyIn: number;
  qtyOut: number;
  balance: number;
  unitCost: number;
  user: string;
  notes?: string;
}

export interface StockCountSession {
  id: string;
  companyId?: string;
  date: string;
  reference: string;
  category: string;
  countedBy: string;
  itemsCounted: number;
  varianceCount: number;
  varianceValue: number;
  status: 'Completed' | 'Pending Review';
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  orderedQty: number;
  receivedQty: number;
  rejectedQty: number;
  unitCost: number;
  discount: number;
  tax: number;
  total: number;
}

export type POStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Partially Received'
  | 'Received'
  | 'Cancelled';

export interface PurchaseOrder {
  id: string;
  companyId?: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  expectedDelivery: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  additionalCosts: number;
  grandTotal: number;
  status: POStatus;
  notes: string;
  createdBy: string;
}

export interface GoodsReceiptItem {
  productId: string;
  productName: string;
  orderedQty: number;
  previouslyReceivedQty: number;
  receiveNowQty: number;
  rejectedQty: number;
  damagedQty: number;
  actualUnitCost: number;
  batchNumber: string;
  expiryDate: string;
}

export interface GoodsReceipt {
  id: string;
  companyId?: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: GoodsReceiptItem[];
  totalReceivedValue: number;
  notes: string;
  receivedBy: string;
}

export interface SupplierInvoice {
  id: string;
  companyId?: string;
  invoiceNumber: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'Paid' | 'Partially Paid' | 'Unpaid' | 'Overdue';
}

export interface PurchaseReturn {
  id: string;
  companyId?: string;
  returnNumber: string;
  poNumber: string;
  supplierName: string;
  productName: string;
  qty: number;
  amount: number;
  reason: string;
  date: string;
  status: 'Completed' | 'Pending';
}

export interface Supplier {
  id: string;
  companyId?: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  tin: string;
  address: string;
  totalPurchases: number;
  outstandingBalance: number;
  lastPurchaseDate: string;
  status: 'Active' | 'Inactive';
}

export interface Customer {
  id: string;
  companyId?: string;
  name: string;
  phone: string;
  email: string;
  tin?: string;
  address?: string;
  totalPurchases: number;
  creditLimit: number;
  outstandingBalance: number;
  dueDate: string;
  status: 'Active' | 'Overdue' | 'Blocked';
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  qty: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  taxRate: number;
  total: number;
}

export interface PaymentSplit {
  method: Exclude<PaymentMethod, 'Split Payment'>;
  amount: number;
}

export type SaleStatus = 'Completed' | 'Pending' | 'Refunded' | 'Cancelled';

export interface Sale {
  id: string;
  companyId?: string;
  reference: string;
  date: string;
  time: string;
  timestamp: string;
  customerId: string;
  customerName: string;
  cashier: string;
  branch: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  cogs: number;
  paymentMethod: PaymentMethod;
  splits?: PaymentSplit[];
  amountReceived: number;
  changeGiven: number;
  paidAmount: number;
  balanceDue: number;
  dueDate?: string;
  status: SaleStatus;
}

export interface HeldSale {
  id: string;
  companyId?: string;
  reference: string;
  time: string;
  customerName: string;
  items: SaleItem[];
  total: number;
  note?: string;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Salaries & Wages'
  | 'Electricity & Water'
  | 'Transport'
  | 'Internet'
  | 'Packaging'
  | 'Repairs'
  | 'Bank Charges'
  | 'Other';

export interface Expense {
  id: string;
  companyId?: string;
  reference: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: 'RWF';
  paymentMethod: Exclude<PaymentMethod, 'Credit' | 'Split Payment'>;
  date: string;
  status: 'Approved' | 'Pending Approval' | 'Rejected';
  user: string;
  supportingDoc?: string;
}

export interface CashShift {
  id: string;
  companyId?: string;
  cashier: string;
  openingTime: string;
  closingTime: string;
  openingCash: number;
  cashSales: number;
  cashInflows: number;
  cashRefunds: number;
  cashExpenses: number;
  cashWithdrawals: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  discrepancyNote?: string;
  status: 'Open' | 'Closed';
}

export interface PaymentRecord {
  id: string;
  companyId?: string;
  reference: string;
  type: 'Sale Payment' | 'Credit Collection' | 'Supplier Payment' | 'Expense Payment' | 'Refund';
  relatedRecord: string;
  partyName: string;
  method: Exclude<PaymentMethod, 'Split Payment'>;
  amount: number;
  user: string;
  date: string;
  time: string;
  status: 'Reconciled' | 'Pending' | 'Flagged';
}

export interface UserAccount {
  id: string;
  name: string;
  username?: string;
  role: UserRole;
  email: string;
  phone: string;
  branch: string;
  companyId?: string;
  assignedCompanyIds?: string[];
  status: 'Active' | 'Suspended';
  lastLogin: string;
  pin?: string;
  customPermissions?: Partial<Record<ModuleKey, Partial<Record<PermissionAction, boolean>>>>;
}

export interface RoleMetadata {
  role: UserRole;
  title: string;
  subtitle: string;
  description: string;
  status: 'Active' | 'Protected';
  lastUpdated: string;
}

export interface AuditLog {
  id: string;
  date: string;
  user: string;
  role: UserRole;
  action: string;
  module: string;
  record: string;
  reason: string;
  severity: 'Info' | 'Warning' | 'Critical';
}

export interface AttendanceRecord {
  id: string;
  companyId?: string;
  userId: string;
  userName: string;
  role: UserRole;
  branch: string;
  date: string;
  clockInTime: string;
  clockOutTime?: string;
  totalHours?: string;
  status: 'Clocked In' | 'Clocked Out';
  method: 'Biometric/PIN' | 'POS Sign-in' | 'Manual Punch';
  notes?: string;
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  tin: string;
  currency: 'RWF';
  timezone: string;
  timeFormat?: '12h' | '24h';
  autoTimeSync?: boolean;
  defaultTaxRate: number;
  receiptHeader: string;
  receiptFooter: string;
  maxCashierDiscountPercent: number;
  enabledPaymentMethods: Exclude<PaymentMethod, 'Split Payment'>[];
  units: string[];
  globalLowStockThreshold: number;
  valuationMethod: 'FIFO' | 'Weighted Average';
  expiryAlertDays: number;
  sessionTimeoutMinutes: number;
  requireReasonOnSensitiveActions: boolean;
  branches: { id: string; name: string; location: string; manager: string; isWarehouse?: boolean }[];
  lastBackupDate: string;
  backupFrequency: 'Daily' | 'Hourly' | 'Weekly';
  retentionDays: number;
}
