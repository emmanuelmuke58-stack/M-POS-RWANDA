import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Company,
  UserAccount,
  Sale,
  ModuleKey,
  FeatureKey,
  FeatureCategory,
  FeaturePaymentStatus,
  FeatureAccessStatus,
  CompanySubscription,
  FeatureEntitlement,
  Product,
  UserRole,
} from '../types';
import { createCompanyFeatures, makeProductSvg } from '../data/initialData';
import { AccessRestrictedView } from './AccessRestrictedView';
import { timeSync } from '../services/timeSyncService';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  BarChart3,
  Calendar,
  Filter,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Download,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Edit2,
  RotateCcw,
  Settings,
  MoreHorizontal,
  X,
  Check,
  MapPin,
  Phone,
  Mail,
  Store,
  Package,
  Layers,
  Info,
  ExternalLink,
  Power,
  SlidersHorizontal,
  Trash2,
  CreditCard,
  Sparkles,
  UserCheck,
  FileText,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Clock,
  RefreshCw,
  AlertCircle,
  Lock,
  Crown,
} from 'lucide-react';

type DatePreset = 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Last Month' | 'This Year' | 'Custom';
type SortField = 'name' | 'id' | 'users' | 'transactions' | 'amount' | 'status' | 'date';
type SortDirection = 'asc' | 'desc';
type DashboardTab =
  | 'overview'
  | 'businesses'
  | 'subscriptions'
  | 'features'
  | 'selling_items'
  | 'users'
  | 'reports'
  | 'charts';

const FEATURE_DEFINITIONS: Array<{
  key: FeatureKey;
  name: string;
  category: FeatureCategory;
  description: string;
}> = [
  // Sales
  { key: 'pos', name: 'Point of Sale (POS)', category: 'Sales', description: 'Touchscreen checkout terminal & multi-payment cashier station' },
  { key: 'selling_items', name: 'Selling Items & Catalog', category: 'Sales', description: 'Business-owned selling products, barcodes, categories & pricing' },
  { key: 'sales', name: 'Sales & Credit Ledger', category: 'Sales', description: 'Historical transactions, held sales & credit sales management' },
  { key: 'customers', name: 'Customers & Debtor Credit', category: 'Sales', description: 'Customer directory, credit limits, terms & outstanding balances' },
  { key: 'discounts', name: 'Discounts & Promotions', category: 'Sales', description: 'Line-item and bill discounts, promotions & supervisor overrides' },
  { key: 'receipts', name: 'Receipts & Print Invoices', category: 'Sales', description: 'Custom thermal receipt headers, footers & RRA tax invoices' },
  // Inventory
  { key: 'inventory', name: 'Inventory & Stock Valuation', category: 'Inventory', description: 'Live stock ledger, FIFO/average cost valuation & movement history' },
  { key: 'stock_management', name: 'Stock Movement Tracking', category: 'Inventory', description: 'Stock receiving, wastage, adjustments & balance tracking' },
  { key: 'stock_transfers', name: 'Inter-Branch Transfers', category: 'Inventory', description: 'Dispatches, transit tracking & destination branch receiving' },
  { key: 'stock_adjustments', name: 'Stock Counts & Reconciliations', category: 'Inventory', description: 'Physical audits, barcode stock taking & discrepancy variances' },
  { key: 'low_stock_alerts', name: 'Low Stock Alerts', category: 'Inventory', description: 'Automated reorder triggers, min thresholds & restocking warnings' },
  // Purchasing
  { key: 'suppliers', name: 'Suppliers Directory', category: 'Purchasing', description: 'Vendor directory, contact persons, phone numbers & TIN records' },
  { key: 'purchase_orders', name: 'Purchase Orders Workflow', category: 'Purchasing', description: 'PO drafting, manager approvals & supplier email dispatches' },
  { key: 'purchases', name: 'Goods Receipts & Invoices', category: 'Purchasing', description: 'GRN warehouse receiving, batch tracking & vendor invoices' },
  { key: 'supplier_payments', name: 'Supplier Bill Payments', category: 'Purchasing', description: 'Vendor settlements, bank transfers & payment reconciliation' },
  // Finance
  { key: 'expenses', name: 'Operating Expenses Tracker', category: 'Finance', description: 'Overhead expenses, receipts upload & manager approval workflow' },
  { key: 'payments', name: 'Cash Shifts & Payment Ledger', category: 'Finance', description: 'Cashier drawer reconciliation, closing counts & discrepancy tracking' },
  { key: 'financial_reports', name: 'Financial & P&L Statements', category: 'Finance', description: 'Gross margin, COGS breakdown & executive income statements' },
  // Administration
  { key: 'users', name: 'Staff User Accounts', category: 'Administration', description: 'Employee login credentials, PINs & operational profiles' },
  { key: 'roles_permissions', name: 'Role & Permission Controls', category: 'Administration', description: 'Granular action matrix across all business operations' },
  { key: 'business_settings', name: 'Business POS Settings', category: 'Administration', description: 'Tax rates, store branding, payment methods & session timeout' },
  // Reports
  { key: 'sales_reports', name: 'Sales Analytics & Reports', category: 'Reports', description: 'Daily, weekly & monthly product sales and cashier breakdowns' },
  { key: 'inventory_reports', name: 'Inventory Valuation Reports', category: 'Reports', description: 'Slow-moving goods, stock aging & inventory valuation reports' },
  { key: 'business_reports', name: 'Executive Business Reports', category: 'Reports', description: 'Cross-branch revenue, customer growth & consolidated performance' },
];

const SuperAdminDashboardContent: React.FC = () => {
  const {
    currentUser,
    companies,
    currentCompanyId,
    setCurrentCompanyId,
    allSales,
    allProducts,
    categories,
    suppliers,
    users,
    hasPermission,
    addCompany,
    updateCompany,
    toggleCompanyStatus,
    assignUsersToCompany,
    deleteCompany,
    updateCompanyFeature,
    updateCompanySubscription,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
    deleteUser,
    changeUserRole,
    setActiveModule,
    notify,
    todayString,
    yesterdayString,
    timeZone,
    timeFormat,
    currentTime,
    formatDate,
    formatTime,
    syncStatus,
  } = useStore();

  // -------------------------------------------------------------
  // 1. GLOBAL REPORTING FILTERS STATE
  // -------------------------------------------------------------
  const [datePreset, setDatePreset] = useState<DatePreset>('This Month');
  const [customStartDate, setCustomStartDate] = useState(() => (todayString ? `${todayString.slice(0, 7)}-01` : '2026-10-01'));
  const [customEndDate, setCustomEndDate] = useState(() => todayString || '2026-10-31');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedTxType, setSelectedTxType] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Active view section tab
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('features');

  // Directory Search & Sort State
  const [companySearch, setCompanySearch] = useState('');
  const [companyStatusFilter, setCompanyStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [companyTypeFilter, setCompanyTypeFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('amount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Subscriptions Tab State
  const [subPlanFilter, setSubPlanFilter] = useState<string>('All');
  const [editingSubCompany, setEditingSubCompany] = useState<Company | null>(null);
  const [subPlanName, setSubPlanName] = useState<CompanySubscription['planName']>('Enterprise Growth');
  const [subPlanStatus, setSubPlanStatus] = useState<CompanySubscription['planStatus']>('Paid & Active');
  const [subBillingCycle, setSubBillingCycle] = useState<CompanySubscription['billingCycle']>('Monthly');
  const [subMonthlyFee, setSubMonthlyFee] = useState<string>('150000');
  const [subRenewalDate, setSubRenewalDate] = useState('2026-12-31');
  const [subNotes, setSubNotes] = useState('');

  // Feature Management Tab State
  const [featureSelectedCompId, setFeatureSelectedCompId] = useState<string>(companies[0]?.id || 'comp-1');
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState<'All' | FeatureCategory>('All');
  const [selectedFeatureKeys, setSelectedFeatureKeys] = useState<Set<FeatureKey>>(() => new Set());
  const [featureBusinessByKey, setFeatureBusinessByKey] = useState<Partial<Record<FeatureKey, string>>>({});
  const [featurePage, setFeaturePage] = useState(1);
  const [expandedFeatureKey, setExpandedFeatureKey] = useState<FeatureKey | null>(null);

  // Selling Items Tab State
  const [itemCompanyFilter, setItemCompanyFilter] = useState<string>('all');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('All');
  const [itemSearch, setItemSearch] = useState('');
  const [itemStatusFilter, setItemStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [deletingItem, setDeletingItem] = useState<Product | null>(null);
  const [deleteItemReason, setDeleteItemReason] = useState('Super Admin deleted item from catalog');

  // Add/Edit Selling Item Form State
  const [itemFormCompanyId, setItemFormCompanyId] = useState('comp-1');
  const [itemFormName, setItemFormName] = useState('');
  const [itemFormSku, setItemFormSku] = useState('');
  const [itemFormBarcode, setItemFormBarcode] = useState('');
  const [itemFormCategory, setItemFormCategory] = useState('Food');
  const [itemFormBrand, setItemFormBrand] = useState('Fresh & More');
  const [itemFormCost, setItemFormCost] = useState('1000');
  const [itemFormPrice, setItemFormPrice] = useState('1500');
  const [itemFormStock, setItemFormStock] = useState('50');
  const [itemFormUnit, setItemFormUnit] = useState('pcs');
  const [itemFormMinStock, setItemFormMinStock] = useState('10');
  const [itemFormSupplierId, setItemFormSupplierId] = useState('sup-1');
  const [itemFormDesc, setItemFormDesc] = useState('');

  // Users & Roles Tab State
  const [userSearch, setUserSearch] = useState('');
  const [userCompanyFilter, setUserCompanyFilter] = useState<string>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);
  const [deleteUserReason, setDeleteUserReason] = useState('Super Admin decommissioned user account');
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Business Modals state
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [assigningCompany, setAssigningCompany] = useState<Company | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Company Deletion modal state
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [deleteCompanyReason, setDeleteCompanyReason] = useState('Super Admin deleted company from system dashboard');
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);

  // Registration form state
  const [regName, setRegName] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regType, setRegType] = useState('Supermarket & Grocery Retail');
  const [regTin, setRegTin] = useState('');
  const [regPhone, setRegPhone] = useState('+250 788 ');
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regDescription, setRegDescription] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editType, setEditType] = useState('Supermarket & Grocery Retail');
  const [editTin, setEditTin] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // -------------------------------------------------------------
  // 2. DATE RANGE CALCULATION (Synchronized to Active Timezone)
  // -------------------------------------------------------------
  const dateInterval = useMemo(() => {
    switch (datePreset) {
      case 'Today':
        return { start: todayString, end: todayString };
      case 'Yesterday':
        return { start: yesterdayString, end: yesterdayString };
      case 'This Week':
        return { start: timeSync.getDateDaysAgo(6, timeZone), end: todayString };
      case 'This Month': {
        const start = `${todayString.slice(0, 7)}-01`;
        return { start, end: todayString };
      }
      case 'Last Month': {
        const cur = new Date(todayString + 'T12:00:00');
        const lastMonthDate = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
        const lastMonthEnd = new Date(cur.getFullYear(), cur.getMonth(), 0);
        return {
          start: timeSync.formatDateISO(lastMonthDate, timeZone),
          end: timeSync.formatDateISO(lastMonthEnd, timeZone),
        };
      }
      case 'This Year':
        return { start: `${todayString.slice(0, 4)}-01-01`, end: todayString };
      case 'Custom':
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: `${todayString.slice(0, 7)}-01`, end: todayString };
    }
  }, [datePreset, customStartDate, customEndDate, todayString, yesterdayString, timeZone]);

  // -------------------------------------------------------------
  // 3. FILTERED TRANSACTIONS
  // -------------------------------------------------------------
  const filteredTransactions = useMemo(() => {
    return allSales.filter((s) => {
      const matchDate = s.date >= dateInterval.start && s.date <= dateInterval.end;
      if (!matchDate) return false;

      const companyId = s.companyId || 'comp-1';
      if (selectedCompanyId !== 'all' && companyId !== selectedCompanyId) return false;

      if (selectedTxType !== 'All' && s.paymentMethod !== selectedTxType) return false;
      if (selectedStatus !== 'All' && s.status !== selectedStatus) return false;

      return true;
    });
  }, [allSales, dateInterval, selectedCompanyId, selectedTxType, selectedStatus]);

  // -------------------------------------------------------------
  // 4. SYSTEM OVERVIEW METRICS (Exact Requirements Section 2.A & 8)
  // -------------------------------------------------------------
  const systemOverview = useMemo(() => {
    const totalCompanies = companies.length;
    const totalUsers = users.length;
    const totalTransactions = filteredTransactions.length;
    const totalTransactionAmount = filteredTransactions.reduce((acc, s) => acc + s.total, 0);
    const activeCompanies = companies.filter((c) => c.status === 'Active').length;
    const activeUsers = users.filter((u) => u.status === 'Active').length;
    const paidCompanies = companies.filter(
      (c) => c.subscription?.planStatus === 'Paid & Active'
    ).length;
    const expiredPlansCount = companies.filter(
      (c) => c.subscription?.planStatus === 'Expired'
    ).length;
    const pendingPaymentCount = companies.filter(
      (c) => c.subscription?.planStatus === 'Pending Payment'
    ).length;
    const totalMRR = companies.reduce(
      (sum, c) => (c.subscription?.planStatus === 'Paid & Active' ? sum + (c.subscription?.monthlyFee || 0) : sum),
      0
    );

    return {
      totalCompanies,
      totalUsers,
      totalTransactions,
      totalTransactionAmount,
      activeCompanies,
      activeUsers,
      paidCompanies,
      expiredPlansCount,
      pendingPaymentCount,
      totalMRR,
    };
  }, [companies, users, filteredTransactions]);

  // -------------------------------------------------------------
  // 5. PER-COMPANY AGGREGATES
  // -------------------------------------------------------------
  const companyAggregates = useMemo(() => {
    const map: Record<
      string,
      {
        totalUsers: number;
        filteredTxCount: number;
        filteredTxAmount: number;
        allTimeTxCount: number;
        allTimeTxAmount: number;
      }
    > = {};

    companies.forEach((c) => {
      const assignedUsers = users.filter(
        (u) =>
          u.companyId === c.id ||
          (u.assignedCompanyIds && u.assignedCompanyIds.includes(c.id))
      );

      const periodSales = filteredTransactions.filter(
        (s) => (s.companyId || 'comp-1') === c.id
      );
      const allTimeSales = allSales.filter(
        (s) => (s.companyId || 'comp-1') === c.id
      );

      map[c.id] = {
        totalUsers: assignedUsers.length,
        filteredTxCount: periodSales.length,
        filteredTxAmount: periodSales.reduce((sum, s) => sum + s.total, 0),
        allTimeTxCount: allTimeSales.length,
        allTimeTxAmount: allTimeSales.reduce((sum, s) => sum + s.total, 0),
      };
    });

    return map;
  }, [companies, users, filteredTransactions, allSales]);

  // -------------------------------------------------------------
  // 6. CHART DATA PREPARATION
  // -------------------------------------------------------------
  const timelineData = useMemo(() => {
    const dateMap: Record<string, { date: string; amount: number; count: number }> = {};
    filteredTransactions.forEach((s) => {
      if (!dateMap[s.date]) {
        dateMap[s.date] = { date: s.date, amount: 0, count: 0 };
      }
      dateMap[s.date].amount += s.total;
      dateMap[s.date].count += 1;
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions]);

  const maxTimelineAmount = useMemo(() => {
    return Math.max(...timelineData.map((d) => d.amount), 1000);
  }, [timelineData]);

  const maxTimelineCount = useMemo(() => {
    return Math.max(...timelineData.map((d) => d.count), 5);
  }, [timelineData]);

  const companyChartData = useMemo(() => {
    const colors = ['#0c4a26', '#2563eb', '#d97706', '#9333ea', '#dc2626', '#0891b2'];
    return companies.map((c, idx) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      amount: companyAggregates[c.id]?.filteredTxAmount || 0,
      count: companyAggregates[c.id]?.filteredTxCount || 0,
      color: colors[idx % colors.length],
    }));
  }, [companies, companyAggregates]);

  const usersByCompanyData = useMemo(() => {
    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      users: companyAggregates[c.id]?.totalUsers || 0,
    }));
  }, [companies, companyAggregates]);

  // -------------------------------------------------------------
  // 7. DIRECTORY SEARCH & PAGINATION
  // -------------------------------------------------------------
  const businessTypes = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => set.add(c.businessType));
    return Array.from(set);
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies
      .filter((c) => {
        const matchesSearch =
          c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
          c.code.toLowerCase().includes(companySearch.toLowerCase()) ||
          c.id.toLowerCase().includes(companySearch.toLowerCase()) ||
          c.tin.includes(companySearch);

        const matchesStatus =
          companyStatusFilter === 'All' || c.status === companyStatusFilter;
        const matchesType =
          companyTypeFilter === 'All' || c.businessType === companyTypeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a, b) => {
        const aggA = companyAggregates[a.id] || { totalUsers: 0, filteredTxCount: 0, filteredTxAmount: 0 };
        const aggB = companyAggregates[b.id] || { totalUsers: 0, filteredTxCount: 0, filteredTxAmount: 0 };

        let valA: any = a.name;
        let valB: any = b.name;

        switch (sortField) {
          case 'name':
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
            break;
          case 'id':
            valA = a.id;
            valB = b.id;
            break;
          case 'users':
            valA = aggA.totalUsers;
            valB = aggB.totalUsers;
            break;
          case 'transactions':
            valA = aggA.filteredTxCount;
            valB = aggB.filteredTxCount;
            break;
          case 'amount':
            valA = aggA.filteredTxAmount;
            valB = aggB.filteredTxAmount;
            break;
          case 'status':
            valA = a.status;
            valB = b.status;
            break;
          case 'date':
            valA = a.createdAt;
            valB = b.createdAt;
            break;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [companies, companySearch, companyStatusFilter, companyTypeFilter, sortField, sortDirection, companyAggregates]);

  const totalPages = Math.ceil(filteredCompanies.length / pageSize) || 1;
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCompanies.slice(start, start + pageSize);
  }, [filteredCompanies, currentPage, pageSize]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // -------------------------------------------------------------
  // 8. HANDLERS FOR BUSINESS PROFILE, USER ASSIGNMENT & DELETION
  // -------------------------------------------------------------
  const handleOpenAssign = (c: Company) => {
    setAssigningCompany(c);
    const assigned = users
      .filter((u) => u.assignedCompanyIds?.includes(c.id) || u.companyId === c.id)
      .map((u) => u.id);
    setSelectedUserIds(assigned);
  };

  const handleOpenBusinessWorkspace = (c: Company) => {
    setCurrentCompanyId(c.id);
    setActiveModule('dashboard');
    notify('success', 'Workspace Activated', `Opened ${c.name} dedicated workspace.`);
  };

  const handleSaveAssignUsers = async () => {
    if (!assigningCompany) return;
    await assignUsersToCompany(
      assigningCompany.id,
      selectedUserIds,
      `Super Admin updated user assignments for ${assigningCompany.name}`
    );
    setAssigningCompany(null);
  };

  const handleOpenEdit = (c: Company) => {
    setEditingCompany(c);
    setEditName(c.name);
    setEditCode(c.code);
    setEditType(c.businessType);
    setEditTin(c.tin);
    setEditPhone(c.phone);
    setEditEmail(c.email);
    setEditAddress(c.address);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    await updateCompany(
      editingCompany.id,
      {
        name: editName,
        code: editCode,
        businessType: editType,
        tin: editTin,
        phone: editPhone,
        email: editEmail,
        address: editAddress,
      },
      `Super Admin updated company settings for ${editName}`
    );
    setEditingCompany(null);
  };

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regCode.trim()) {
      notify('error', 'Required Fields', 'Please provide company name and unique code.');
      return;
    }

    const success = await addCompany(
      {
        name: regName.trim(),
        code: regCode.trim().toUpperCase(),
        businessType: regType,
        tin: regTin.trim() || '109990000',
        phone: regPhone.trim() || '+250 788 000 000',
        email: regEmail.trim() || `info@${regCode.toLowerCase()}.rw`,
        address: regAddress.trim() || 'Kigali, Rwanda',
        city: 'Kigali',
        country: 'Rwanda',
        currency: 'RWF',
        status: 'Active',
        description: regDescription.trim() || 'Enterprise entity provisioned by System Super Admin',
        branches: [
          {
            id: `br-${Date.now().toString().slice(-4)}`,
            name: `${regName.trim()} Headquarters`,
            location: regAddress.trim() || 'Kigali',
            manager: currentUser.name,
          },
        ],
        assignedUserIds: [currentUser.id],
      },
      `Super Admin registered new enterprise entity ${regName}`
    );

    if (success) {
      setIsRegisterOpen(false);
      setRegName('');
      setRegCode('');
      setRegTin('');
      setRegEmail('');
      setRegAddress('');
      setRegDescription('');
    }
  };

  const handleConfirmDeleteCompany = async () => {
    if (!deletingCompany) return;
    setIsDeletingCompany(true);
    const success = await deleteCompany(
      deletingCompany.id,
      deleteCompanyReason.trim() || 'Super Admin deleted company from system dashboard'
    );
    setIsDeletingCompany(false);
    if (success) {
      setDeletingCompany(null);
      setDeleteCompanyReason('Super Admin deleted company from system dashboard');
    }
  };

  // -------------------------------------------------------------
  // 9. SUBSCRIPTIONS EDIT HANDLERS
  // -------------------------------------------------------------
  const handleOpenEditSubscription = (c: Company) => {
    setEditingSubCompany(c);
    const sub = c.subscription;
    setSubPlanName(sub?.planName || 'Enterprise Growth');
    setSubPlanStatus(sub?.planStatus || 'Paid & Active');
    setSubBillingCycle(sub?.billingCycle || 'Monthly');
    setSubMonthlyFee((sub?.monthlyFee || 150000).toString());
    setSubRenewalDate(sub?.renewalDate || '2026-12-31');
    setSubNotes(sub?.notes || '');
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubCompany) return;
    await updateCompanySubscription(
      editingSubCompany.id,
      {
        planName: subPlanName,
        planStatus: subPlanStatus,
        billingCycle: subBillingCycle,
        monthlyFee: Number(subMonthlyFee) || 0,
        renewalDate: subRenewalDate,
        notes: subNotes,
      },
      `Super Admin updated subscription plan for ${editingSubCompany.name}`
    );
    setEditingSubCompany(null);
  };

  // -------------------------------------------------------------
  // 10. SELLING ITEMS HANDLERS
  // -------------------------------------------------------------
  const filteredSellingItems = useMemo(() => {
    return allProducts.filter((p) => {
      const pCompanyId = p.companyId || 'comp-1';
      const matchComp = itemCompanyFilter === 'all' || pCompanyId === itemCompanyFilter;
      const matchCat = itemCategoryFilter === 'All' || p.category === itemCategoryFilter;
      const matchStatus = itemStatusFilter === 'All' || p.status === itemStatusFilter;
      const matchSearch =
        p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(itemSearch.toLowerCase()) ||
        p.barcode.includes(itemSearch);
      return matchComp && matchCat && matchStatus && matchSearch;
    });
  }, [allProducts, itemCompanyFilter, itemCategoryFilter, itemStatusFilter, itemSearch]);

  const handleOpenAddItem = () => {
    setItemFormCompanyId(companies[0]?.id || 'comp-1');
    setItemFormName('');
    setItemFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setItemFormBarcode(`600${Math.floor(100000000 + Math.random() * 900000000)}`);
    setItemFormCategory(categories[0]?.name || 'Food');
    setItemFormBrand('Fresh & More');
    setItemFormCost('1000');
    setItemFormPrice('1500');
    setItemFormStock('50');
    setItemFormUnit('pcs');
    setItemFormMinStock('10');
    setItemFormSupplierId(suppliers[0]?.id || 'sup-1');
    setItemFormDesc('');
    setEditingItem(null);
    setIsAddItemOpen(true);
  };

  const handleOpenEditItem = (p: Product) => {
    setEditingItem(p);
    setItemFormCompanyId(p.companyId || 'comp-1');
    setItemFormName(p.name);
    setItemFormSku(p.sku);
    setItemFormBarcode(p.barcode);
    setItemFormCategory(p.category);
    setItemFormBrand(p.brand);
    setItemFormCost(p.costPrice.toString());
    setItemFormPrice(p.sellingPrice.toString());
    setItemFormStock(p.stock.toString());
    setItemFormUnit(p.unit);
    setItemFormMinStock(p.minStock.toString());
    setItemFormSupplierId(p.supplierId);
    setItemFormDesc(p.description || '');
    setIsAddItemOpen(true);
  };

  const handleSaveSellingItem = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === itemFormSupplierId);
    const supName = sup ? sup.name : 'Supermec Ltd';

    if (editingItem) {
      updateProduct({
        ...editingItem,
        companyId: itemFormCompanyId,
        name: itemFormName,
        sku: itemFormSku,
        barcode: itemFormBarcode,
        category: itemFormCategory,
        brand: itemFormBrand,
        description: itemFormDesc,
        costPrice: Number(itemFormCost) || 0,
        sellingPrice: Number(itemFormPrice) || 0,
        stock: Number(itemFormStock) || 0,
        unit: itemFormUnit,
        minStock: Number(itemFormMinStock) || 0,
        supplierId: itemFormSupplierId,
        supplierName: supName,
      });
    } else {
      addProduct({
        companyId: itemFormCompanyId,
        name: itemFormName,
        sku: itemFormSku,
        barcode: itemFormBarcode,
        category: itemFormCategory,
        brand: itemFormBrand,
        description: itemFormDesc,
        costPrice: Number(itemFormCost) || 0,
        sellingPrice: Number(itemFormPrice) || 0,
        wholesalePrice: Math.round((Number(itemFormPrice) || 0) * 0.9),
        stock: Number(itemFormStock) || 0,
        unit: itemFormUnit,
        minStock: Number(itemFormMinStock) || 0,
        supplierId: itemFormSupplierId,
        supplierName: supName,
        batchNumber: `LOT-${Date.now().toString().slice(-4)}`,
        expiryDate: '2026-12-31',
        taxRate: 18,
        status: 'Active',
      });
    }
    setIsAddItemOpen(false);
  };

  const handleConfirmDeleteItem = async () => {
    if (!deletingItem) return;
    await deleteProduct(deletingItem.id, deleteItemReason);
    setDeletingItem(null);
  };

  // -------------------------------------------------------------
  // 11. USER MANAGEMENT HANDLERS (Section 8: Delete User)
  // -------------------------------------------------------------
  const filteredUsersList = useMemo(() => {
    return users.filter((u) => {
      const matchComp =
        userCompanyFilter === 'all' ||
        u.companyId === userCompanyFilter ||
        u.assignedCompanyIds?.includes(userCompanyFilter);
      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      const matchSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.phone.includes(userSearch);
      return matchComp && matchRole && matchSearch;
    });
  }, [users, userCompanyFilter, userRoleFilter, userSearch]);

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeletingUser(true);
    const success = await deleteUser(deletingUser.id, deleteUserReason.trim() || 'Super Admin deleted user');
    setIsDeletingUser(false);
    if (success) {
      setDeletingUser(null);
      setDeleteUserReason('Super Admin decommissioned user account');
    }
  };

  // -------------------------------------------------------------
  // 12. EXPORT SYSTEM-WIDE CSV REPORT
  // -------------------------------------------------------------
  const handleExportSystemReport = () => {
    const headers = [
      'Company ID',
      'Company Name',
      'Business Code',
      'Business Type',
      'TIN',
      'Status',
      'Subscription Plan',
      'Plan Status',
      'Assigned Users',
      'Filtered Transactions',
      'Filtered Total (RWF)',
      'All-Time Total (RWF)',
    ];

    const rows = companies.map((c) => {
      const agg = companyAggregates[c.id] || { totalUsers: 0, filteredTxCount: 0, filteredTxAmount: 0, allTimeTxAmount: 0 };
      return [
        c.id,
        `"${c.name}"`,
        c.code,
        `"${c.businessType}"`,
        c.tin,
        c.status,
        c.subscription?.planName || 'Standard',
        c.subscription?.planStatus || 'Active',
        agg.totalUsers,
        agg.filteredTxCount,
        agg.filteredTxAmount,
        agg.allTimeTxAmount,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `superadmin_system_report_${dateInterval.start}_to_${dateInterval.end}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('success', 'Report Exported', 'Consolidated multi-business report downloaded as CSV.');
  };

  // Active company object for feature management
  const activeFeatureCompany = useMemo(() => {
    return companies.find((c) => c.id === featureSelectedCompId) || companies[0];
  }, [companies, featureSelectedCompId]);
  const filteredFeatureDefinitions = useMemo(
    () =>
      FEATURE_DEFINITIONS.filter(
        (feature) => featureCategoryFilter === 'All' || feature.category === featureCategoryFilter
      ),
    [featureCategoryFilter]
  );
  const featurePageSize = 10;
  const featurePageCount = Math.max(1, Math.ceil(filteredFeatureDefinitions.length / featurePageSize));
  const paginatedFeatureDefinitions = filteredFeatureDefinitions.slice(
    (featurePage - 1) * featurePageSize,
    featurePage * featurePageSize
  );

  return (
    <div className="space-y-3 text-slate-800">
      {/* ============================================================ */}
      {/* 1. MASTER HEADER                                             */}
      {/* ============================================================ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Feature Management</h1>
          <p className="text-[10px] text-slate-500">Configure module access, payment, and entitlements by business.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/owner"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-sm transition-all cursor-pointer border border-amber-300/40"
            title="Open dedicated Owner Page in a new browser tab (/owner)"
          >
            <Crown className="w-4 h-4 text-slate-950" />
            <span>Owner Page (New Tab)</span>
            <ExternalLink className="w-3 h-3 text-slate-900" />
          </a>

          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-white bg-[#0c4a26] hover:bg-[#093a1d] rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Register new legal company entity"
          >
            <Plus className="w-4 h-4" />
            <span>Register Business</span>
          </button>

          <button
            onClick={handleExportSystemReport}
            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-300"
            title="Download consolidated database report"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. GLOBAL REPORTING FILTERS TOOLBAR                          */}
      {/* ============================================================ */}
      <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 space-y-2">
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
          <Filter className="w-4 h-4 text-[#0c4a26]" />
          <span>Global Reporting Filters</span>
          <span className="text-[11px] font-normal text-slate-400">
            (Applies across KPI cards, charts, and report breakdowns)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* A. Date Preset */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Date Range Preset
            </label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
            >
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="This Year">This Year</option>
              <option value="Custom">Custom Date Range...</option>
            </select>
          </div>

          {/* B. Company Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Operating Company
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
            >
              <option value="all">All Registered Companies ({companies.length})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* C. Transaction Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Payment Method
            </label>
            <select
              value={selectedTxType}
              onChange={(e) => setSelectedTxType(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
            >
              <option value="All">All Payment Methods</option>
              <option value="Cash">Cash Currency</option>
              <option value="MoMo">MTN Mobile Money (MoMo)</option>
              <option value="Bank">Bank Transfer</option>
              <option value="Card">Credit / Debit Card</option>
              <option value="Credit">Credit Sale (Account)</option>
            </select>
          </div>

          {/* D. Status */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Transaction Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
            >
              <option value="All">All Transaction Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {datePreset === 'Custom' && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3 text-xs flex-wrap">
            <span className="font-semibold text-slate-600">Custom Date Range:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        )}

        {/* Filter Badges Bar */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-medium">Applied Interval:</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              {dateInterval.start} → {dateInterval.end}
            </span>
            {selectedCompanyId !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold border border-blue-200">
                {companies.find((c) => c.id === selectedCompanyId)?.name}
              </span>
            )}
            {selectedTxType !== 'All' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200">
                Method: {selectedTxType}
              </span>
            )}
            {selectedStatus !== 'All' && (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-bold border border-purple-200">
                Status: {selectedStatus}
              </span>
            )}
          </div>

          <div className="font-mono text-slate-500">
            Found <strong className="text-slate-900">{filteredTransactions.length}</strong> matching transaction records
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. SYSTEM OVERVIEW CARDS (Section 2.A & Section 8)            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Total Companies */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Businesses</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 tabular-nums">{systemOverview.totalCompanies}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Registered entities</p>
        </div>

        {/* 2. Active Businesses */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Businesses</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2 tabular-nums">{systemOverview.activeCompanies}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Currently operational</p>
        </div>

        {/* 3. Paid Businesses */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Paid Businesses</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-700 mt-2 tabular-nums">{systemOverview.paidCompanies}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Active subscriptions</p>
        </div>

        {/* 4. Expired Plans */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Expired Plans</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2 tabular-nums">{systemOverview.expiredPlansCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Pending renewal</p>
        </div>

        {/* 5. Total Transactions */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Transactions</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-900 mt-2 tabular-nums">{systemOverview.totalTransactions}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">In selected period</p>
        </div>

        {/* 6. Total Transaction Amount */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Revenue (Period)</span>
            <DollarSign className="w-4 h-4 text-[#0c4a26]" />
          </div>
          <p className="text-lg font-black text-[#0c4a26] mt-2 tabular-nums truncate" title={`${systemOverview.totalTransactionAmount.toLocaleString()} RWF`}>
            {systemOverview.totalTransactionAmount.toLocaleString()} <span className="text-xs font-normal">RWF</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Across businesses</p>
        </div>

        {/* 7. Total Users */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Users</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 tabular-nums">{systemOverview.totalUsers}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">{systemOverview.activeUsers} active accounts</p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. SUPER ADMIN NAVIGATION TABS BAR (All 8 Modules)            */}
      {/* ============================================================ */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => setDashboardTab('overview')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'overview'
              ? 'bg-[#0c4a26] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setDashboardTab('businesses')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'businesses'
              ? 'bg-[#0c4a26] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Businesses ({companies.length})</span>
        </button>

        <button
          onClick={() => setDashboardTab('subscriptions')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'subscriptions'
              ? 'bg-[#0c4a26] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Access &amp; Plans</span>
        </button>

        <button
          onClick={() => setDashboardTab('features')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'features'
              ? 'bg-[#0c4a26] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Feature Management</span>
        </button>

        <button
          onClick={() => setDashboardTab('selling_items')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'selling_items'
              ? 'bg-[#0c4a26] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Selling Items &amp; Products ({allProducts.length})</span>
        </button>

        <button
          onClick={() => setDashboardTab('users')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'users'
              ? 'bg-[#0c4a26] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users &amp; Roles ({users.length})</span>
        </button>

        <button
          onClick={() => setDashboardTab('reports')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'reports'
              ? 'bg-[#0c4a26] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>System Reports</span>
        </button>

        <button
          onClick={() => setDashboardTab('charts')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            dashboardTab === 'charts'
              ? 'bg-[#0c4a26] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Interactive Charts</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 5. TAB: OVERVIEW                                             */}
      {/* ============================================================ */}
      {dashboardTab === 'overview' && (
        <div className="space-y-4">
          {/* Quick Action Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div
              onClick={() => setDashboardTab('businesses')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#0c4a26] cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Businesses Directory</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{companies.length} Companies</p>
                <p className="text-[11px] text-emerald-700 font-semibold mt-1">Manage profiles, status &amp; delete →</p>
              </div>
              <Building2 className="w-8 h-8 text-emerald-600/20" />
            </div>

            <div
              onClick={() => setDashboardTab('subscriptions')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-purple-600 cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Access &amp; Plans</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{systemOverview.paidCompanies} Paid / {systemOverview.totalMRR.toLocaleString()} RWF</p>
                <p className="text-[11px] text-purple-700 font-semibold mt-1">Configure subscription plans →</p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-600/20" />
            </div>

            <div
              onClick={() => setDashboardTab('features')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-600 cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Feature Access Control</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">24 System Modules</p>
                <p className="text-[11px] text-blue-700 font-semibold mt-1">Enable/disable features per company →</p>
              </div>
              <SlidersHorizontal className="w-8 h-8 text-blue-600/20" />
            </div>

            <div
              onClick={() => setDashboardTab('selling_items')}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-amber-600 cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">Selling Items &amp; Products</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{allProducts.length} Items Listed</p>
                <p className="text-[11px] text-amber-700 font-semibold mt-1">Control selling catalog &amp; stock →</p>
              </div>
              <Package className="w-8 h-8 text-amber-600/20" />
            </div>
          </div>

          {/* Charts 1 & 2 Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Revenue Over Time */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">1. Transaction Amount Over Time</h3>
                  <p className="text-[11px] text-slate-400">Total revenue generated by date across selected period</p>
                </div>
                <span className="text-xs font-extrabold text-[#0c4a26] font-mono">
                  {systemOverview.totalTransactionAmount.toLocaleString()} RWF
                </span>
              </div>

              {timelineData.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                  <Info className="w-6 h-6 mb-1 text-slate-300" />
                  <span>No transactions recorded for the selected filter interval.</span>
                </div>
              ) : (
                <div className="h-52 w-full pt-2">
                  <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="amountGradOv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {[0, 50, 100, 150].map((y) => (
                      <line key={y} x1="40" y1={y} x2="490" y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                    ))}
                    <text x="35" y="10" fontSize="9" textAnchor="end" fill="#94a3b8">
                      {Math.round(maxTimelineAmount / 1000)}k
                    </text>
                    <text x="35" y="165" fontSize="9" textAnchor="end" fill="#94a3b8">
                      0
                    </text>
                    {(() => {
                      const count = timelineData.length;
                      const step = count > 1 ? 440 / (count - 1) : 440;
                      const points = timelineData.map((d, i) => {
                        const x = 45 + i * step;
                        const y = 165 - (d.amount / maxTimelineAmount) * 145;
                        return { x, y, ...d };
                      });
                      const pathStr = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const areaStr = `${pathStr} L ${points[points.length - 1].x} 165 L ${points[0].x} 165 Z`;
                      return (
                        <>
                          <path d={areaStr} fill="url(#amountGradOv)" />
                          <path d={pathStr} fill="none" stroke="#0c4a26" strokeWidth="2.5" />
                          {points.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#0c4a26" strokeWidth="2" />
                              <text x={p.x} y="185" fontSize="8" textAnchor="middle" fill="#64748b">
                                {p.date.slice(5)}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
            </div>

            {/* Chart 2: Transaction Volume Over Time */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">2. Transaction Count Over Time</h3>
                  <p className="text-[11px] text-slate-400">Total transaction count per date across selected period</p>
                </div>
                <span className="text-xs font-extrabold text-blue-700 font-mono">
                  {systemOverview.totalTransactions} Orders
                </span>
              </div>

              {timelineData.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                  <Info className="w-6 h-6 mb-1 text-slate-300" />
                  <span>No transactions recorded for the selected filter interval.</span>
                </div>
              ) : (
                <div className="h-52 w-full pt-2">
                  <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                    {[0, 50, 100, 150].map((y) => (
                      <line key={y} x1="40" y1={y} x2="490" y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                    ))}
                    <text x="35" y="10" fontSize="9" textAnchor="end" fill="#94a3b8">
                      {maxTimelineCount}
                    </text>
                    <text x="35" y="165" fontSize="9" textAnchor="end" fill="#94a3b8">
                      0
                    </text>
                    {(() => {
                      const count = timelineData.length;
                      const colWidth = Math.min(32, 400 / count - 6);
                      const step = 440 / count;
                      return timelineData.map((d, i) => {
                        const barHeight = (d.count / maxTimelineCount) * 145;
                        const x = 50 + i * step;
                        const y = 165 - barHeight;
                        return (
                          <g key={i}>
                            <rect x={x} y={y} width={colWidth} height={barHeight} rx="3" fill="#2563eb" />
                            <text x={x + colWidth / 2} y={y - 4} fontSize="8" textAnchor="middle" fill="#1e3a8a" fontWeight="bold">
                              {d.count}
                            </text>
                            <text x={x + colWidth / 2} y="185" fontSize="8" textAnchor="middle" fill="#64748b">
                              {d.date.slice(5)}
                            </text>
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. TAB: BUSINESSES DIRECTORY (Section 2.B)                   */}
      {/* ============================================================ */}
      {dashboardTab === 'businesses' && (
        <div className="space-y-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Registered Businesses &amp; Companies Directory</h2>
                <p className="text-xs text-slate-500">
                  Comprehensive listing of all legal corporate entities registered in the system. Controlled exclusively by Super Admin.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  Showing {filteredCompanies.length} of {companies.length} companies
                </span>
                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0c4a26] text-white rounded-xl text-xs font-bold hover:bg-[#093a1d] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Company</span>
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by company name, ID, or code..."
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0c4a26]"
                />
              </div>

              <select
                value={companyStatusFilter}
                onChange={(e) => {
                  setCompanyStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>

              <select
                value={companyTypeFilter}
                onChange={(e) => {
                  setCompanyTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="All">All Business Types</option>
                {businessTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <th onClick={() => toggleSort('name')} className="p-3.5 cursor-pointer hover:text-slate-900 select-none">
                      <div className="flex items-center gap-1">
                        <span>Business Name</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th onClick={() => toggleSort('id')} className="p-3.5 cursor-pointer hover:text-slate-900 select-none">
                      <div className="flex items-center gap-1">
                        <span>Business ID</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-3.5">Business Owner</th>
                    <th className="p-3.5">Business Type</th>
                    <th className="p-3.5 text-center">Enabled Features</th>
                    <th className="p-3.5 text-center">Subscription Status</th>
                    <th onClick={() => toggleSort('users')} className="p-3.5 text-center cursor-pointer hover:text-slate-900 select-none">
                      <div className="flex items-center justify-center gap-1">
                        <span>Users</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th onClick={() => toggleSort('status')} className="p-3.5 text-center cursor-pointer hover:text-slate-900 select-none">
                      <div className="flex items-center justify-center gap-1">
                        <span>Status</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedCompanies.map((c) => {
                    const agg = companyAggregates[c.id] || { totalUsers: 0, filteredTxCount: 0, filteredTxAmount: 0 };
                    const allowedFeaturesCount = Object.values(c.features || {}).filter(
                      (f) => f && f.allowed
                    ).length;
                    const planStatus = c.subscription?.planStatus || 'Paid & Active';
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0c4a26] font-extrabold flex items-center justify-center text-xs shrink-0 border border-emerald-200">
                              {c.code.slice(0, 3)}
                            </div>
                            <div>
                              <button
                                onClick={() => handleOpenBusinessWorkspace(c)}
                                className="font-bold text-slate-900 hover:text-[#0c4a26] text-left hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <span>{c.name}</span>
                              </button>
                              <span className="block text-[10px] text-slate-400 font-normal">TIN: {c.tin} • Code: {c.code}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-[11px] text-slate-600 font-semibold">{c.id}</td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-slate-800">{c.ownerName || 'Aimable Mugisha'}</span>
                          </div>
                        </td>

                        <td className="p-3.5 text-slate-700 font-medium">{c.businessType}</td>

                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => {
                              setFeatureSelectedCompId(c.id);
                              setDashboardTab('features');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Click to manage features for this business"
                          >
                            <SlidersHorizontal className="w-3 h-3 text-blue-600" />
                            <span>{allowedFeaturesCount || 20} / 24 Features</span>
                          </button>
                        </td>

                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => {
                              setDashboardTab('subscriptions');
                            }}
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-transform hover:scale-105 ${
                              planStatus === 'Paid & Active'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : planStatus === 'Trial'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : planStatus === 'Pending Payment'
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : planStatus === 'Expired'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                            title="Click to view subscription details"
                          >
                            {planStatus}
                          </button>
                        </td>

                        <td className="p-3.5 text-center font-bold text-slate-900 tabular-nums">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                            {agg.totalUsers} users
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenBusinessWorkspace(c)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#0c4a26] hover:bg-[#093a1d] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
                              title={`Open ${c.name} Workspace directly`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open Business</span>
                            </button>

                            <button
                              onClick={() => setViewingCompany(c)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="View authorized profile & branches"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 text-slate-500 hover:text-[#0c4a26] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Manage company settings"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenAssign(c)}
                              className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                              title="Assign user staff accounts"
                            >
                              <Users className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => toggleCompanyStatus(c.id, 'Super Admin toggled status')}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                c.status === 'Active'
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={c.status === 'Active' ? 'Deactivate Company' : 'Activate Company'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setDeletingCompany(c)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Registered Business Permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {paginatedCompanies.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No registered businesses found matching your search and filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {currentPage} of {totalPages} ({filteredCompanies.length} total entities)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5 inline mr-1" />
                  Previous
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. TAB: SUBSCRIPTIONS & PLANS ("Business Access & Plans")     */}
      {/* ============================================================ */}
      {dashboardTab === 'subscriptions' && (
        <div className="space-y-4">
          {/* Subscriptions Overview Header */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Business Access &amp; Subscription Plans</h2>
                <p className="text-xs text-slate-500">
                  Manage commercial subscription status, monthly fees, renewal dates, and module entitlements across all businesses.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={subPlanFilter}
                  onChange={(e) => setSubPlanFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="All">All Plan Statuses</option>
                  <option value="Paid & Active">Paid &amp; Active</option>
                  <option value="Trial">Trial Period</option>
                  <option value="Pending Payment">Pending Payment</option>
                  <option value="Expired">Expired</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>
            </div>

            {/* KPI Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Monthly Platform MRR</span>
                <p className="text-lg font-black text-[#0c4a26] mt-0.5">{systemOverview.totalMRR.toLocaleString()} RWF</p>
              </div>
              <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                <span className="text-[10px] font-bold text-purple-800 uppercase">Paid &amp; Active</span>
                <p className="text-lg font-black text-purple-800 mt-0.5">{systemOverview.paidCompanies} Businesses</p>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Pending Payment</span>
                <p className="text-lg font-black text-amber-800 mt-0.5">{systemOverview.pendingPaymentCount} Invoices</p>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-[10px] font-bold text-rose-800 uppercase">Expired Plans</span>
                <p className="text-lg font-black text-rose-800 mt-0.5">{systemOverview.expiredPlansCount} Businesses</p>
              </div>
            </div>
          </div>

          {/* Matrix Table per Prompt Section 3 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <th className="p-3.5">Business</th>
                    <th className="p-3.5 text-center">POS Terminal</th>
                    <th className="p-3.5 text-center">Selling Items &amp; Inventory</th>
                    <th className="p-3.5 text-center">Purchases &amp; Vendors</th>
                    <th className="p-3.5 text-center">Financial Reports</th>
                    <th className="p-3.5 text-center">Users &amp; Roles</th>
                    <th className="p-3.5 text-center">Plan Status</th>
                    <th className="p-3.5 text-right">Monthly Fee</th>
                    <th className="p-3.5 text-center">Renewal Date</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companies
                    .filter((c) => {
                      if (subPlanFilter === 'All') return true;
                      return c.subscription?.planStatus === subPlanFilter;
                    })
                    .map((c) => {
                      const sub = c.subscription || {
                        planName: 'Standard Business',
                        planStatus: 'Paid & Active',
                        billingCycle: 'Monthly',
                        monthlyFee: 60000,
                        renewalDate: '2026-12-31',
                      };
                      const feats = c.features || createCompanyFeatures();
                      const posActive = feats.pos?.allowed && feats.pos?.accessStatus === 'Active';
                      const invActive = feats.inventory?.allowed && feats.inventory?.accessStatus === 'Active';
                      const purActive = feats.purchases?.allowed && feats.purchases?.accessStatus === 'Active';
                      const repActive = feats.financial_reports?.allowed && feats.financial_reports?.accessStatus === 'Active';
                      const usrActive = feats.users?.allowed && feats.users?.accessStatus === 'Active';

                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-purple-50 text-purple-800 font-extrabold flex items-center justify-center text-[10px]">
                                {c.code.slice(0, 2)}
                              </div>
                              <div>
                                <span>{c.name}</span>
                                <span className="block text-[10px] text-slate-400 font-normal">{sub.planName}</span>
                              </div>
                            </div>
                          </td>

                          {/* POS */}
                          <td className="p-3.5 text-center">
                            {posActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0c4a26]">
                                <Check className="w-3 h-3" /> Paid &amp; Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                                <X className="w-3 h-3" /> Disabled
                              </span>
                            )}
                          </td>

                          {/* Inventory */}
                          <td className="p-3.5 text-center">
                            {invActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0c4a26]">
                                <Check className="w-3 h-3" /> Paid &amp; Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                                <X className="w-3 h-3" /> Disabled
                              </span>
                            )}
                          </td>

                          {/* Purchases */}
                          <td className="p-3.5 text-center">
                            {purActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0c4a26]">
                                <Check className="w-3 h-3" /> Paid &amp; Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                                <X className="w-3 h-3" /> Disabled
                              </span>
                            )}
                          </td>

                          {/* Reports */}
                          <td className="p-3.5 text-center">
                            {repActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0c4a26]">
                                <Check className="w-3 h-3" /> Paid
                              </span>
                            ) : feats.financial_reports?.paymentStatus === 'Pending Payment' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                ⌛ Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                                <X className="w-3 h-3" /> Disabled
                              </span>
                            )}
                          </td>

                          {/* Users */}
                          <td className="p-3.5 text-center">
                            {usrActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0c4a26]">
                                <Check className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                                <X className="w-3 h-3" /> Restricted
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                sub.planStatus === 'Paid & Active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : sub.planStatus === 'Trial'
                                  ? 'bg-blue-100 text-blue-800'
                                  : sub.planStatus === 'Pending Payment'
                                  ? 'bg-amber-100 text-amber-800'
                                  : sub.planStatus === 'Expired'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {sub.planStatus}
                            </span>
                          </td>

                          {/* Monthly Fee */}
                          <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                            {(sub.monthlyFee || 0).toLocaleString()} RWF
                          </td>

                          {/* Renewal Date */}
                          <td className="p-3.5 text-center font-mono text-[11px] text-slate-600">
                            {sub.renewalDate || '—'}
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => handleOpenEditSubscription(c)}
                              className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                              title="Update plan & billing terms"
                            >
                              Configure Plan
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. TAB: FEATURE MANAGEMENT (Section 4 & 5)                   */}
      {/* ============================================================ */}
      {dashboardTab === 'features' && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['All', 'Sales', 'Inventory', 'Purchasing', 'Finance', 'Administration', 'Reports'] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setFeatureCategoryFilter(category);
                    setFeaturePage(1);
                  }}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition-colors ${
                    featureCategoryFilter === category
                      ? 'bg-[#20232b] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {category}
                </button>
              ))}
              {selectedFeatureKeys.size > 0 && (
                <span className="ml-1 text-[10px] font-semibold text-slate-500">
                  {selectedFeatureKeys.size} selected
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedFeatureKeys.size > 0 && (
                <button
                  onClick={async () => {
                    for (const key of selectedFeatureKeys) {
                      const companyId = featureBusinessByKey[key] || featureSelectedCompId;
                      await updateCompanyFeature(companyId, key, {
                        allowed: true,
                        paymentStatus: 'Paid',
                        accessStatus: 'Active',
                      });
                    }
                    setSelectedFeatureKeys(new Set());
                    notify('success', 'Selected Features Enabled', 'Selected feature access has been enabled.');
                  }}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-[#0c4a26] hover:bg-emerald-100"
                >
                  Enable Selected
                </button>
              )}
              <button
                onClick={async () => {
                  const compFeatures = createCompanyFeatures();
                  for (const fKey of Object.keys(compFeatures) as FeatureKey[]) {
                    await updateCompanyFeature(featureSelectedCompId, fKey, {
                      allowed: true,
                      paymentStatus: 'Paid',
                      accessStatus: 'Active',
                    });
                  }
                  notify('success', 'Full Access Enabled', `All features activated for ${activeFeatureCompany.name}.`);
                }}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-[#0c4a26] hover:bg-emerald-100"
              >
                ✓ Enable All Features
              </button>
              <button
                onClick={async () => {
                  const restrictedKeys: FeatureKey[] = ['financial_reports', 'roles_permissions', 'stock_transfers'];
                  for (const fKey of restrictedKeys) {
                    await updateCompanyFeature(featureSelectedCompId, fKey, {
                      allowed: false,
                      paymentStatus: 'Pending Payment',
                      accessStatus: 'Restricted',
                    });
                  }
                  notify('info', 'Standard Package Applied', `Standard tier preset applied to ${activeFeatureCompany.name}.`);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
              >
                Standard Tier Preset
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-left text-[10px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="w-9 px-3 py-2.5">
                      <input
                        type="checkbox"
                        aria-label="Select visible features"
                        checked={paginatedFeatureDefinitions.length > 0 && paginatedFeatureDefinitions.every((feature) => selectedFeatureKeys.has(feature.key))}
                        onChange={(event) => {
                          setSelectedFeatureKeys((previous) => {
                            const next = new Set(previous);
                            for (const feature of paginatedFeatureDefinitions) {
                              if (event.target.checked) next.add(feature.key);
                              else next.delete(feature.key);
                            }
                            return next;
                          });
                        }}
                        className="accent-[#0c4a26]"
                      />
                    </th>
                    <th className="px-3 py-2.5">Feature Name</th>
                    <th className="px-3 py-2.5">Category</th>
                    <th className="px-3 py-2.5">Description</th>
                    <th className="px-3 py-2.5">Business Scope</th>
                    <th className="px-3 py-2.5">Payment Status</th>
                    <th className="px-3 py-2.5">Access State</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedFeatureDefinitions.map((feature) => {
                    const businessId = featureBusinessByKey[feature.key] || featureSelectedCompId;
                    const business = companies.find((company) => company.id === businessId) || activeFeatureCompany;
                    const entitlement = business?.features?.[feature.key] || {
                      key: feature.key,
                      name: feature.name,
                      category: feature.category,
                      allowed: true,
                      paymentStatus: 'Paid' as FeaturePaymentStatus,
                      accessStatus: 'Active' as FeatureAccessStatus,
                      monthlyFee: 10000,
                      validUntil: '2026-12-31',
                    };
                    const isExpanded = expandedFeatureKey === feature.key;
                    const categoryColors: Record<FeatureCategory, string> = {
                      Sales: 'bg-emerald-50 text-emerald-700',
                      Inventory: 'bg-blue-50 text-blue-700',
                      Purchasing: 'bg-indigo-50 text-indigo-700',
                      Finance: 'bg-rose-50 text-rose-700',
                      Administration: 'bg-purple-50 text-purple-700',
                      Reports: 'bg-amber-50 text-amber-700',
                    };
                    return (
                      <React.Fragment key={feature.key}>
                        <tr className="align-middle hover:bg-slate-50/70">
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              aria-label={`Select ${feature.name}`}
                              checked={selectedFeatureKeys.has(feature.key)}
                              onChange={(event) => {
                                setSelectedFeatureKeys((previous) => {
                                  const next = new Set(previous);
                                  if (event.target.checked) next.add(feature.key);
                                  else next.delete(feature.key);
                                  return next;
                                });
                              }}
                              className="accent-[#0c4a26]"
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 font-bold text-slate-900">{feature.name}</td>
                          <td className="px-3 py-2.5">
                            <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wide ${categoryColors[feature.category]}`}>
                              {feature.category}
                            </span>
                          </td>
                          <td className="max-w-[240px] px-3 py-2.5 text-slate-500">{feature.description}</td>
                          <td className="px-3 py-2.5">
                            <select
                              aria-label={`Business scope for ${feature.name}`}
                              value={business?.id || featureSelectedCompId}
                              onChange={(event) =>
                                setFeatureBusinessByKey((previous) => ({ ...previous, [feature.key]: event.target.value }))
                              }
                              className="w-48 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-semibold text-slate-700"
                            >
                              {companies.map((company) => (
                                <option key={company.id} value={company.id}>Business: {company.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              aria-label={`Payment status for ${feature.name}`}
                              value={entitlement.paymentStatus}
                              onChange={(event) =>
                                updateCompanyFeature(business?.id || featureSelectedCompId, feature.key, {
                                  paymentStatus: event.target.value as FeaturePaymentStatus,
                                })
                              }
                              className={`rounded-md border px-2 py-1.5 text-[9px] font-bold ${
                                entitlement.paymentStatus === 'Paid'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : 'border-slate-200 bg-white text-slate-700'
                              }`}
                            >
                              <option value="Paid">Paid</option>
                              <option value="Trial">Trial</option>
                              <option value="Pending Payment">Pending</option>
                              <option value="Expired">Expired</option>
                              <option value="Disabled">Disabled</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <select
                              aria-label={`Access state for ${feature.name}`}
                              value={entitlement.accessStatus}
                              onChange={(event) =>
                                updateCompanyFeature(business?.id || featureSelectedCompId, feature.key, {
                                  accessStatus: event.target.value as FeatureAccessStatus,
                                  allowed: event.target.value === 'Active',
                                })
                              }
                              className={`rounded-md border px-2 py-1.5 text-[9px] font-bold ${
                                entitlement.accessStatus === 'Active'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : 'border-amber-200 bg-amber-50 text-amber-800'
                              }`}
                            >
                              <option value="Active">Active</option>
                              <option value="Restricted">Restricted</option>
                              <option value="Disabled">Disabled</option>
                              <option value="Not Assigned">Not Assigned</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                onClick={() => setExpandedFeatureKey(isExpanded ? null : feature.key)}
                                title="Feature details"
                                aria-label={`View details for ${feature.name}`}
                                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setExpandedFeatureKey(isExpanded ? null : feature.key)}
                                title="Edit feature settings"
                                aria-label={`Edit ${feature.name}`}
                                className="rounded p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-[#0c4a26]"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setExpandedFeatureKey(isExpanded ? null : feature.key)}
                                title="Configure feature"
                                aria-label={`Configure ${feature.name}`}
                                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Settings className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  updateCompanyFeature(business?.id || featureSelectedCompId, feature.key, {
                                    allowed: !entitlement.allowed,
                                    accessStatus: entitlement.allowed ? 'Disabled' : 'Active',
                                    paymentStatus: entitlement.allowed ? 'Disabled' : 'Paid',
                                  })
                                }
                                title={entitlement.allowed ? 'Disable feature' : 'Enable feature'}
                                aria-label={`${entitlement.allowed ? 'Disable' : 'Enable'} ${feature.name}`}
                                className="rounded p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => notify('info', feature.name, `${entitlement.monthlyFee.toLocaleString()} RWF/month · Valid until ${entitlement.validUntil}`)}
                                title="More feature information"
                                aria-label={`More actions for ${feature.name}`}
                                className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-50">
                            <td colSpan={8} className="px-12 py-3">
                              <div className="grid gap-3 text-[10px] sm:grid-cols-[minmax(0,1fr)_150px_170px]">
                                <div>
                                  <p className="font-bold text-slate-800">{feature.name}</p>
                                  <p className="mt-1 text-slate-500">{feature.description}</p>
                                </div>
                                <label className="font-semibold text-slate-500">
                                  Monthly Fee (RWF)
                                  <input
                                    type="number"
                                    min="0"
                                    value={entitlement.monthlyFee}
                                    onChange={(event) =>
                                      updateCompanyFeature(business?.id || featureSelectedCompId, feature.key, {
                                        monthlyFee: Number(event.target.value) || 0,
                                      })
                                    }
                                    className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
                                  />
                                </label>
                                <label className="font-semibold text-slate-500">
                                  Valid Until
                                  <input
                                    type="date"
                                    value={entitlement.validUntil}
                                    onChange={(event) =>
                                      updateCompanyFeature(business?.id || featureSelectedCompId, feature.key, {
                                        validUntil: event.target.value,
                                      })
                                    }
                                    className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-slate-800"
                                  />
                                </label>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-200 px-3 py-2.5 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {filteredFeatureDefinitions.length === 0
                  ? 'No features'
                  : `${(featurePage - 1) * featurePageSize + 1}–${Math.min(featurePage * featurePageSize, filteredFeatureDefinitions.length)} of ${filteredFeatureDefinitions.length} features`}
              </span>
              <div className="flex items-center gap-2">
                <span>Page {featurePage} of {featurePageCount}</span>
                <button
                  onClick={() => setFeaturePage((page) => Math.max(1, page - 1))}
                  disabled={featurePage <= 1}
                  aria-label="Previous page"
                  className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setFeaturePage((page) => Math.min(featurePageCount, page + 1))}
                  disabled={featurePage >= featurePageCount}
                  aria-label="Next page"
                  className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. TAB: SELLING ITEMS & PRODUCTS (Section 2 & 7)             */}
      {/* ============================================================ */}
      {dashboardTab === 'selling_items' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Selling Items &amp; Products Across All Businesses</h2>
                <p className="text-xs text-slate-500">
                  Every selling item belongs to a specific business. Business owners can only manage their own items when enabled.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0c4a26] text-white rounded-xl text-xs font-bold hover:bg-[#093a1d] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Selling Item</span>
                </button>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="relative sm:col-span-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item, SKU, barcode..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0c4a26]"
                />
              </div>

              <select
                value={itemCompanyFilter}
                onChange={(e) => setItemCompanyFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="all">All Owning Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={itemCategoryFilter}
                onChange={(e) => setItemCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={itemStatusFilter}
                onChange={(e) => setItemStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="All">All Item Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          {/* Selling Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <th className="p-3.5">Selling Item</th>
                    <th className="p-3.5">SKU / Barcode</th>
                    <th className="p-3.5">Owning Business</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-right">Retail Price</th>
                    <th className="p-3.5 text-right">Cost Price</th>
                    <th className="p-3.5 text-center">Available Stock</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSellingItems.map((p) => {
                    const owningCompany = companies.find((c) => c.id === (p.companyId || 'comp-1'));
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            {p.imageSvg ? (
                              <img src={p.imageSvg} alt={p.name} className="w-7 h-7 rounded-lg border border-slate-200 object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#0c4a26] flex items-center justify-center font-bold text-[10px]">
                                {p.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span>{p.name}</span>
                              {p.description && (
                                <span className="block text-[10px] text-slate-400 font-normal truncate max-w-[180px]">{p.description}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-[11px] text-slate-600">
                          <span>{p.sku}</span>
                          <span className="block text-[10px] text-slate-400">{p.barcode}</span>
                        </td>

                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            {owningCompany?.name || 'Fresh & More Ltd'}
                          </span>
                        </td>

                        <td className="p-3.5 text-slate-700">{p.category}</td>
                        <td className="p-3.5 text-right font-extrabold text-[#0c4a26] font-mono tabular-nums">
                          {p.sellingPrice.toLocaleString()} RWF
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-500 tabular-nums">
                          {p.costPrice.toLocaleString()} RWF
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-900 tabular-nums">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${p.stock <= p.minStock ? 'bg-amber-100 text-amber-800 font-extrabold' : 'bg-slate-100 text-slate-700'}`}>
                            {p.stock} {p.unit}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditItem(p)}
                              className="p-1.5 text-slate-500 hover:text-[#0c4a26] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit selling item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => toggleProductStatus(p.id, 'Super Admin toggled product status')}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                p.status === 'Active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={p.status === 'Active' ? 'Deactivate item' : 'Activate item'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setDeletingItem(p)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete selling item permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSellingItems.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No selling items found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 10. TAB: USERS & ROLES (Delete User, Permissions, Roles)     */}
      {/* ============================================================ */}
      {dashboardTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">System Users &amp; Company Role Assignments</h2>
                <p className="text-xs text-slate-500">
                  Super Admin can manage user accounts, change roles, assign multi-business access, and permanently delete accounts.
                </p>
              </div>

              <button
                onClick={() => setActiveModule('users_roles')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors cursor-pointer"
              >
                <span>Full Role Matrix &amp; Permissions Console →</span>
              </button>
            </div>

            {/* Filter toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user name, email, phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0c4a26]"
                />
              </div>

              <select
                value={userCompanyFilter}
                onChange={(e) => setUserCompanyFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="all">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="all">All System Roles</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Business Owner">Business Owner</option>
                <option value="Manager">Manager</option>
                <option value="Cashier">Cashier</option>
                <option value="Stock Manager">Stock Manager</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Primary Business</th>
                    <th className="p-3.5">Authorized Companies</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Last Login</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsersList.map((u) => {
                    const primaryComp = companies.find((c) => c.id === u.companyId);
                    const isSelf = u.id === currentUser.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div>
                            <span>{u.name}</span>
                            <span className="block text-[10px] text-slate-400 font-normal">{u.email} • {u.phone}</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              u.role === 'Super Admin'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'Business Owner'
                                ? 'bg-blue-100 text-blue-800'
                                : u.role === 'Manager'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="p-3.5 font-medium text-slate-800">{primaryComp?.name || 'Fresh & More Ltd'}</td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            {(u.assignedCompanyIds && u.assignedCompanyIds.length > 0
                              ? u.assignedCompanyIds
                              : [u.companyId || 'comp-1']
                            ).map((cid) => {
                              const compObj = companies.find((c) => c.id === cid);
                              return (
                                <span key={cid} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {compObj?.code || cid}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${u.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {u.status}
                          </span>
                        </td>

                        <td className="p-3.5 text-center font-mono text-[11px] text-slate-500">{u.lastLogin}</td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Role Quick Selector */}
                            <select
                              value={u.role}
                              disabled={isSelf}
                              onChange={(e) => changeUserRole(u.id, e.target.value as UserRole, 'Super Admin modified role')}
                              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-800 disabled:opacity-50"
                            >
                              <option value="Super Admin">Super Admin</option>
                              <option value="Business Owner">Business Owner</option>
                              <option value="Manager">Manager</option>
                              <option value="Cashier">Cashier</option>
                              <option value="Stock Manager">Stock Manager</option>
                            </select>

                            {/* Delete User Button */}
                            <button
                              disabled={isSelf}
                              onClick={() => setDeletingUser(u)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isSelf ? 'Cannot delete your own active login' : 'Permanently Delete User Account'}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 11. TAB: SYSTEM REPORTS (Section 2.C)                        */}
      {/* ============================================================ */}
      {dashboardTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">System-Wide Aggregated Reports</h2>
                <p className="text-xs text-slate-500">
                  Consolidated multi-business sales volume, revenues, headcount, and growth metrics for {dateInterval.start} to {dateInterval.end}.
                </p>
              </div>

              <button
                onClick={handleExportSystemReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0c4a26] text-white rounded-xl text-xs font-bold hover:bg-[#093a1d] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Consolidated CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <th className="p-3.5">Company Name</th>
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Users</th>
                    <th className="p-3.5 text-right">Transactions (Period)</th>
                    <th className="p-3.5 text-right">Amount (Period)</th>
                    <th className="p-3.5 text-right">Period Share (%)</th>
                    <th className="p-3.5 text-right">All-Time Cumulative</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companies.map((c) => {
                    const agg = companyAggregates[c.id] || { totalUsers: 0, filteredTxCount: 0, filteredTxAmount: 0, allTimeTxAmount: 0 };
                    const share =
                      systemOverview.totalTransactionAmount > 0
                        ? (agg.filteredTxAmount / systemOverview.totalTransactionAmount) * 100
                        : 0;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-bold text-slate-900">{c.name}</td>
                        <td className="p-3.5 font-mono text-slate-500">{c.code}</td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-800 tabular-nums">{agg.totalUsers}</td>
                        <td className="p-3.5 text-right font-medium text-slate-700 tabular-nums">{agg.filteredTxCount}</td>
                        <td className="p-3.5 text-right font-extrabold text-[#0c4a26] tabular-nums font-mono">
                          {agg.filteredTxAmount.toLocaleString()} RWF
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-800 tabular-nums">{share.toFixed(1)}%</td>
                        <td className="p-3.5 text-right font-mono text-slate-600 tabular-nums">
                          {agg.allTimeTxAmount.toLocaleString()} RWF
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                    <td className="p-3.5" colSpan={3}>Consolidated System Total</td>
                    <td className="p-3.5 text-center tabular-nums">{systemOverview.totalUsers}</td>
                    <td className="p-3.5 text-right tabular-nums">{systemOverview.totalTransactions}</td>
                    <td className="p-3.5 text-right font-black text-[#0c4a26] tabular-nums font-mono">
                      {systemOverview.totalTransactionAmount.toLocaleString()} RWF
                    </td>
                    <td className="p-3.5 text-right font-mono tabular-nums">100.0%</td>
                    <td className="p-3.5 text-right font-mono text-slate-900 tabular-nums">
                      {allSales.reduce((s, x) => s + x.total, 0).toLocaleString()} RWF
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 12. TAB: ALL 5 INTERACTIVE CHARTS (Section 2.D)              */}
      {/* ============================================================ */}
      {dashboardTab === 'charts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Transaction Amount Over Time */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">1. Transaction Amount Over Time</h3>
                  <p className="text-[11px] text-slate-400">Total revenue generated by date across selected period</p>
                </div>
                <span className="text-xs font-extrabold text-[#0c4a26] font-mono">
                  {systemOverview.totalTransactionAmount.toLocaleString()} RWF
                </span>
              </div>
              <div className="h-56 w-full pt-2">
                <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="amountGradFull" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {[0, 50, 100, 150].map((y) => (
                    <line key={y} x1="40" y1={y} x2="490" y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                  ))}
                  <text x="35" y="10" fontSize="9" textAnchor="end" fill="#94a3b8">
                    {Math.round(maxTimelineAmount / 1000)}k
                  </text>
                  <text x="35" y="165" fontSize="9" textAnchor="end" fill="#94a3b8">0</text>
                  {(() => {
                    const count = timelineData.length;
                    if (count === 0) return null;
                    const step = count > 1 ? 440 / (count - 1) : 440;
                    const points = timelineData.map((d, i) => {
                      const x = 45 + i * step;
                      const y = 165 - (d.amount / maxTimelineAmount) * 145;
                      return { x, y, ...d };
                    });
                    const pathStr = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const areaStr = `${pathStr} L ${points[points.length - 1].x} 165 L ${points[0].x} 165 Z`;
                    return (
                      <>
                        <path d={areaStr} fill="url(#amountGradFull)" />
                        <path d={pathStr} fill="none" stroke="#0c4a26" strokeWidth="2.5" />
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#0c4a26" strokeWidth="2" />
                            <text x={p.x} y="185" fontSize="8" textAnchor="middle" fill="#64748b">{p.date.slice(5)}</text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* 2. Transaction Count Over Time */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">2. Transaction Count Over Time</h3>
                  <p className="text-[11px] text-slate-400">Total transaction volume per date across selected period</p>
                </div>
                <span className="text-xs font-extrabold text-blue-700 font-mono">
                  {systemOverview.totalTransactions} Orders
                </span>
              </div>
              <div className="h-56 w-full pt-2">
                <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                  {[0, 50, 100, 150].map((y) => (
                    <line key={y} x1="40" y1={y} x2="490" y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                  ))}
                  <text x="35" y="10" fontSize="9" textAnchor="end" fill="#94a3b8">{maxTimelineCount}</text>
                  <text x="35" y="165" fontSize="9" textAnchor="end" fill="#94a3b8">0</text>
                  {(() => {
                    const count = timelineData.length;
                    if (count === 0) return null;
                    const colWidth = Math.min(32, 400 / count - 6);
                    const step = 440 / count;
                    return timelineData.map((d, i) => {
                      const barHeight = (d.count / maxTimelineCount) * 145;
                      const x = 50 + i * step;
                      const y = 165 - barHeight;
                      return (
                        <g key={i}>
                          <rect x={x} y={y} width={colWidth} height={barHeight} rx="3" fill="#2563eb" />
                          <text x={x + colWidth / 2} y={y - 4} fontSize="8" textAnchor="middle" fill="#1e3a8a" fontWeight="bold">
                            {d.count}
                          </text>
                          <text x={x + colWidth / 2} y="185" fontSize="8" textAnchor="middle" fill="#64748b">{d.date.slice(5)}</text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              </div>
            </div>
          </div>

          {/* Bottom 3 Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 3. Transaction Amount by Company */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">3. Transaction Amount by Company</h3>
                  <p className="text-[10px] text-slate-400">Revenue split across companies</p>
                </div>
                <DollarSign className="w-4 h-4 text-[#0c4a26]" />
              </div>
              <div className="space-y-2.5 pt-2">
                {companyChartData.map((c) => {
                  const pct =
                    systemOverview.totalTransactionAmount > 0
                      ? (c.amount / systemOverview.totalTransactionAmount) * 100
                      : 0;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-[140px]">{c.name}</span>
                        <span className="font-mono font-bold text-[#0c4a26]">{c.amount.toLocaleString()} RWF</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${pct}%`, backgroundColor: c.color }} className="h-full rounded-full transition-all duration-300" />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Code: {c.code}</span>
                        <span>{pct.toFixed(1)}% share</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Transactions by Company */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">4. Transactions by Company</h3>
                  <p className="text-[10px] text-slate-400">Transaction volume per company</p>
                </div>
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="space-y-2.5 pt-2">
                {companyChartData.map((c) => {
                  const pct =
                    systemOverview.totalTransactions > 0
                      ? (c.count / systemOverview.totalTransactions) * 100
                      : 0;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-[140px]">{c.name}</span>
                        <span className="font-mono font-bold text-blue-700">{c.count} orders</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-blue-600 transition-all duration-300" />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>ID: {c.id}</span>
                        <span>{pct.toFixed(1)}% volume</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Users by Company */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">5. Users by Company</h3>
                  <p className="text-[10px] text-slate-400">Staff distribution across companies</p>
                </div>
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div className="space-y-2.5 pt-2">
                {usersByCompanyData.map((c) => {
                  const pct =
                    systemOverview.totalUsers > 0 ? (c.users / systemOverview.totalUsers) * 100 : 0;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 truncate max-w-[140px]">{c.name}</span>
                        <span className="font-mono font-bold text-purple-700">{c.users} users</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-purple-600 transition-all duration-300" />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{c.code}</span>
                        <span>{pct.toFixed(1)}% staff</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 13. ALL MODALS (View, Edit, Register, Delete, Subscription)   */}
      {/* ============================================================ */}

      {/* MODAL 1: VIEW COMPANY PROFILE */}
      {viewingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-[#0c4a26] rounded-xl font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{viewingCompany.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    ID: {viewingCompany.id} • Code: {viewingCompany.code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingCompany(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-medium">Business Type:</span>
                <p className="font-bold text-slate-800">{viewingCompany.businessType}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">TIN Number:</span>
                <p className="font-mono font-bold text-slate-800">{viewingCompany.tin}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Phone Contact:</span>
                <p className="font-semibold text-slate-800">{viewingCompany.phone}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Email Address:</span>
                <p className="font-semibold text-slate-800">{viewingCompany.email}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-medium">Headquarters Location:</span>
                <p className="font-semibold text-slate-800">{viewingCompany.address}, {viewingCompany.city}, {viewingCompany.country}</p>
              </div>
            </div>

            {/* Subscription Summary */}
            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 space-y-1">
              <span className="text-[10px] font-bold text-purple-800 uppercase">Subscription Status</span>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-900">{viewingCompany.subscription?.planName || 'Enterprise Growth'}</span>
                <span className="font-extrabold text-purple-800 font-mono">
                  {(viewingCompany.subscription?.monthlyFee || 150000).toLocaleString()} RWF / month
                </span>
              </div>
              <p className="text-[11px] text-purple-700">
                Plan Status: <strong>{viewingCompany.subscription?.planStatus || 'Paid & Active'}</strong> • Renews: {viewingCompany.subscription?.renewalDate || '2026-12-31'}
              </p>
            </div>

            {/* Registered Branches */}
            <div>
              <span className="font-bold text-slate-700 block mb-1">
                Operational Branches ({viewingCompany.branches.length})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {viewingCompany.branches.map((b) => (
                  <div key={b.id} className="p-2 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <span className="font-bold text-slate-800">{b.name}</span>
                      <span className="block text-[10px] text-slate-400">{b.location} • Manager: {b.manager}</span>
                    </div>
                    {b.isWarehouse && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[9px]">Warehouse</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewingCompany(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN USERS */}
      {assigningCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Assign Staff to Company</h3>
                  <p className="text-[11px] text-slate-400">Manage user access for {assigningCompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setAssigningCompany(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {users.map((u) => {
                const isChecked = selectedUserIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-purple-50 border-purple-300 text-purple-900'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds((prev) => [...prev, u.id]);
                          } else {
                            setSelectedUserIds((prev) => prev.filter((id) => id !== u.id));
                          }
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <div>
                        <span className="font-bold text-xs">{u.name}</span>
                        <span className="block text-[10px] text-slate-400">{u.role} • {u.email}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setAssigningCompany(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAssignUsers}
                className="px-4 py-2 bg-[#0c4a26] hover:bg-[#093a1d] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Assignments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT COMPANY SETTINGS */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-[#0c4a26] rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Manage Company Settings</h3>
                  <p className="text-[11px] text-slate-400">Configure {editingCompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCompany(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">TIN</label>
                  <input
                    type="text"
                    value={editTin}
                    onChange={(e) => setEditTin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0c4a26] hover:bg-[#093a1d] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIGURE SUBSCRIPTION PLAN */}
      {editingSubCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Configure Subscription Plan</h3>
                  <p className="text-[11px] text-slate-400">Business: {editingSubCompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingSubCompany(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plan Package</label>
                  <select
                    value={subPlanName}
                    onChange={(e) => setSubPlanName(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Enterprise Growth">Enterprise Growth (Tier 1)</option>
                    <option value="Professional Retail">Professional Retail (Tier 2)</option>
                    <option value="Standard Business">Standard Business (Tier 3)</option>
                    <option value="Starter Trial">Starter Trial (Tier 4)</option>
                    <option value="Custom Plan">Custom Plan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Commercial Status</label>
                  <select
                    value={subPlanStatus}
                    onChange={(e) => setSubPlanStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-purple-800"
                  >
                    <option value="Paid & Active">Paid &amp; Active</option>
                    <option value="Trial">Trial Period</option>
                    <option value="Pending Payment">Pending Payment</option>
                    <option value="Expired">Expired</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={subBillingCycle}
                    onChange={(e) => setSubBillingCycle(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monthly Recurring Fee (RWF)</label>
                  <input
                    type="number"
                    required
                    value={subMonthlyFee}
                    onChange={(e) => setSubMonthlyFee(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Renewal / Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={subRenewalDate}
                    onChange={(e) => setSubRenewalDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Subscription Notes / SLA</label>
                  <input
                    type="text"
                    placeholder="e.g. Wire transfer invoice reference, SLA terms..."
                    value={subNotes}
                    onChange={(e) => setSubNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSubCompany(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Subscription Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: REGISTER NEW BUSINESS */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-[#0c4a26] rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Register New Company</h3>
                  <p className="text-[11px] text-slate-400">Establish and provision an enterprise entity</p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterCompany} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kigali Fresh Mini-Mart Ltd"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KFM-KGL"
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">TIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 109882310"
                    value={regTin}
                    onChange={(e) => setRegTin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Headquarters Address</label>
                  <input
                    type="text"
                    placeholder="e.g. KG 17 Ave, Remera, Kigali"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0c4a26] hover:bg-[#093a1d] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Register Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: DELETE BUSINESS CONFIRMATION */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Delete Registered Business</span>
              </div>
              <button
                onClick={() => setDeletingCompany(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-red-900">
                <span>Are you sure you want to delete this business entity?</span>
              </div>
              <p className="text-red-700 leading-relaxed text-[11px]">
                This will permanently delete the corporate entity <strong className="text-red-900">{deletingCompany.name}</strong> (Code: <strong className="text-red-900">{deletingCompany.code}</strong>, TIN: {deletingCompany.tin}). All corporate configurations will be removed. Active operational sessions will be safely reassigned. This action cannot be undone.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deletion Reason (Audit Trail)
              </label>
              <input
                type="text"
                value={deleteCompanyReason}
                onChange={(e) => setDeleteCompanyReason(e.target.value)}
                placeholder="Reason for business deletion..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingCompany(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCompany}
                disabled={isDeletingCompany}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingCompany ? 'Deleting...' : 'Delete Business Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: CREATE / EDIT SELLING ITEM */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-[#0c4a26] rounded-xl font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{editingItem ? 'Edit Selling Item' : 'Create Selling Item'}</h3>
                  <p className="text-[11px] text-slate-400">Configure item details, owning business, and retail price</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddItemOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSellingItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Owning Business *</label>
                  <select
                    value={itemFormCompanyId}
                    onChange={(e) => setItemFormCompanyId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#0c4a26]"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arabica Roast Coffee 500g"
                    value={itemFormName}
                    onChange={(e) => setItemFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={itemFormSku}
                    onChange={(e) => setItemFormSku(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={itemFormBarcode}
                    onChange={(e) => setItemFormBarcode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={itemFormCategory}
                    onChange={(e) => setItemFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={itemFormBrand}
                    onChange={(e) => setItemFormBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Retail Selling Price (RWF) *</label>
                  <input
                    type="number"
                    required
                    value={itemFormPrice}
                    onChange={(e) => setItemFormPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#0c4a26]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cost Price (RWF)</label>
                  <input
                    type="number"
                    value={itemFormCost}
                    onChange={(e) => setItemFormCost(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    value={itemFormStock}
                    onChange={(e) => setItemFormStock(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={itemFormUnit}
                    onChange={(e) => setItemFormUnit(e.target.value)}
                    placeholder="pcs, kg, bottle, pack"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={itemFormDesc}
                    onChange={(e) => setItemFormDesc(e.target.value)}
                    placeholder="Product description, ingredients, details..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0c4a26] hover:bg-[#093a1d] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Save Selling Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: DELETE SELLING ITEM CONFIRMATION */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Delete Selling Item</span>
              </div>
              <button
                onClick={() => setDeletingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete <strong className="text-slate-900">{deletingItem.name}</strong> ({deletingItem.sku})? This product will be deleted from the owning business catalog and will no longer appear in POS or inventory.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Audit Reason</label>
              <input
                type="text"
                value={deleteItemReason}
                onChange={(e) => setDeleteItemReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteItem}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: DELETE USER CONFIRMATION (Prompt #3 & #4) */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Delete System User</span>
              </div>
              <button
                onClick={() => setDeletingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs">
              <p className="text-red-700 leading-relaxed text-[11px]">
                Are you sure you want to permanently delete user account <strong className="text-red-900">{deletingUser.name}</strong> ({deletingUser.email}, Role: {deletingUser.role})? The user will be immediately revoked from all assigned companies. This operation cannot be undone.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Decommission Reason (Audit Trail)
              </label>
              <input
                type="text"
                value={deleteUserReason}
                onChange={(e) => setDeleteUserReason(e.target.value)}
                placeholder="Reason for deleting user..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingUser ? 'Deleting...' : 'Delete User Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SuperAdminDashboardView: React.FC = () => {
  const { currentUser, hasPermission } = useStore();

  if (currentUser.role !== 'Super Admin' || !hasPermission('super_admin', 'view')) {
    return <AccessRestrictedView moduleName="super_admin" requiredAction="view" />;
  }

  return <SuperAdminDashboardContent />;
};
