import React, { useState, useMemo } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { ModuleKey } from './types';
import { DashboardView } from './components/DashboardView';
import { POSView } from './components/POSView';
import { AccessRestrictedView } from './components/AccessRestrictedView';
import {
  ProductsView,
  InventoryView,
  CategoriesView,
} from './components/CatalogInventoryViews';
import {
  PurchasingView,
  ReceivingView,
  SuppliersView,
  CustomersView,
  CreditSalesView,
} from './components/PurchasingPartnersViews';
import {
  ExpensesView,
  CashManagementView,
  PaymentsView,
  AccountingView,
} from './components/FinanceAccountingViews';
import {
  ReportsView,
  UsersRolesView,
  AuditLogsView,
  SettingsView,
  StaffManagementView,
  StaffListView,
} from './components/AdminGovernanceViews';
import { CompaniesManagementView } from './components/CompaniesManagementView';
import { SuperAdminDashboardView } from './components/SuperAdminDashboardView';
import { OwnerPage } from './components/OwnerPage';
import { TimeSyncModal } from './components/TimeSyncModal';
import { POSLoginPage } from './components/POSLoginPage';
import { PublicWebsiteView } from './components/PublicWebsiteView';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  FolderTree,
  ShoppingBag,
  Truck,
  Users,
  UserCheck,
  CreditCard,
  Receipt,
  Wallet,
  BadgeDollarSign,
  Banknote,
  Scale,
  FileBarChart,
  UserCog,
  History,
  Settings as SettingsIcon,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Trash2,
  LogOut,
  HelpCircle,
  Plus,
  Store,
  Calendar,
  Clock,
  Sparkles,
  Database,
  ArrowRight,
  ArrowLeft,
  Crown,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
  Barcode,
  MoreHorizontal,
  Building2,
  ChevronDown,
  Check,
  ShieldCheck,
  ClipboardList,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';

export type NavLeafItem = {
  kind: 'item';
  key: ModuleKey;
  label: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
};

export type NavSubmenuItem = {
  kind: 'submenu';
  id: string;
  label: string;
  icon: React.ElementType;
  children: NavLeafItem[];
};

export type NavEntry = NavLeafItem | NavSubmenuItem;

export interface NavSection {
  id: string;
  title?: string;
  items: NavEntry[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'dashboard-sec',
    items: [
      { kind: 'item', key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'sales-customers',
    title: 'SALES & CUSTOMERS',
    items: [
      { kind: 'item', key: 'pos', label: 'Point of Sale', icon: ShoppingCart },
      { kind: 'item', key: 'customers', label: 'Customers', icon: Users },
      { kind: 'item', key: 'credit_sales', label: 'Credit Sales', icon: CreditCard },
    ],
  },
  {
    id: 'products-stock',
    title: 'PRODUCTS & STOCK',
    items: [
      { kind: 'item', key: 'products', label: 'Products', icon: Package },
      { kind: 'item', key: 'inventory', label: 'Inventory', icon: Layers },
      { kind: 'item', key: 'categories', label: 'Categories', icon: SlidersHorizontal },
    ],
  },
  {
    id: 'purchasing-suppliers',
    title: 'PURCHASING & SUPPLIERS',
    items: [
      { kind: 'item', key: 'purchasing', label: 'Purchasing', icon: ShoppingBag },
      { kind: 'item', key: 'receiving', label: 'Receiving', icon: Truck },
      { kind: 'item', key: 'suppliers', label: 'Suppliers', icon: Users },
    ],
  },
  {
    id: 'finance',
    title: 'FINANCE',
    items: [
      { kind: 'item', key: 'cash_management', label: 'Cash Management', icon: Wallet },
      { kind: 'item', key: 'payments', label: 'Payments', icon: Banknote },
      { kind: 'item', key: 'expenses', label: 'Expenses', icon: Receipt },
      { kind: 'item', key: 'accounting', label: 'Accounting', icon: Scale },
    ],
  },
  {
    id: 'staff-administration',
    title: 'STAFF & ADMINISTRATION',
    items: [
      {
        kind: 'submenu',
        id: 'staffs',
        label: 'Staffs',
        icon: Users,
        children: [
          { kind: 'item', key: 'staff_management', label: 'Staff Management', icon: UserCheck },
          { kind: 'item', key: 'staff_list', label: 'Staff List', icon: ClipboardList },
        ],
      },
      { kind: 'item', key: 'reports', label: 'Reports', icon: TrendingUp },
      { kind: 'item', key: 'audit_logs', label: 'Audit Logs', icon: History },
      { kind: 'item', key: 'settings', label: 'Settings', icon: SettingsIcon },
      { kind: 'item', key: 'super_admin', label: 'Super Admin', icon: ShieldCheck, badge: 'Master', badgeColor: 'bg-purple-600 text-white' },
    ],
  },
];

const NAV_ITEMS: { key: ModuleKey; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'pos', label: 'Point of Sale', icon: ShoppingCart },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'credit_sales', label: 'Credit Sales', icon: CreditCard },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'inventory', label: 'Inventory', icon: Layers },
  { key: 'categories', label: 'Categories', icon: SlidersHorizontal },
  { key: 'purchasing', label: 'Purchasing', icon: ShoppingBag },
  { key: 'receiving', label: 'Receiving', icon: Truck },
  { key: 'suppliers', label: 'Suppliers', icon: Users },
  { key: 'cash_management', label: 'Cash Management', icon: Wallet },
  { key: 'payments', label: 'Payments', icon: Banknote },
  { key: 'expenses', label: 'Expenses', icon: Receipt },
  { key: 'accounting', label: 'Accounting', icon: Scale },
  { key: 'staff_management', label: 'Staff Management', icon: UserCheck },
  { key: 'staff_list', label: 'Staff List', icon: ClipboardList },
  { key: 'users_roles', label: 'Staff Management', icon: UserCheck },
  { key: 'reports', label: 'Reports', icon: TrendingUp },
  { key: 'audit_logs', label: 'Audit Logs', icon: History },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
  { key: 'super_admin', label: 'Super Admin', icon: ShieldCheck },
  { key: 'companies', label: 'Business Control', icon: Building2 },
];

interface AuthenticatedAppProps {
  onSwitchToWebsite?: () => void;
}

const AuthenticatedApp: React.FC<AuthenticatedAppProps> = ({ onSwitchToWebsite }) => {
  const {
    activeModule,
    setActiveModule,
    currentUser,
    users,
    currentBranch,
    setCurrentBranch,
    toasts,
    dismissToast,
    isEmptyDbMode,
    switchToEmptyDatabase,
    resetToDemoDatabase,
    globalSearch,
    setGlobalSearch,
    hasPermission,
    companies,
    currentCompanyId,
    currentCompany,
    setCurrentCompanyId,
    currentTime,
    timeZone,
    timeFormat,
    syncStatus,
    formatDate,
    formatTime,
    logout,
  } = useStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [timeSyncModalOpen, setTimeSyncModalOpen] = useState(false);
  const [staffsSubmenuOpen, setStaffsSubmenuOpen] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState([
    { id: 'alt-1', title: 'Low Stock Warning', text: 'Inyange Milk is below minimum threshold (10 pcs).', isWarning: true },
    { id: 'alt-2', title: 'Goods Receipt Confirmed', text: 'GRN-4028 posted from Rwanda Dairy Ltd.', isWarning: false },
    { id: 'alt-3', title: 'Pending Approval', text: 'Petty cash expense voucher awaits manager sign-off.', isWarning: true },
  ]);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  const branches = ['Kigali Downtown', 'Nyarugenge Branch', 'Remera Minimarket', 'Kicukiro Store'];

  // Dynamically filter navigation sections based on active user permissions
  const authorizedNavSections = useMemo(() => {
    return NAV_SECTIONS.map((section) => {
      const filteredItems: NavEntry[] = [];
      for (const entry of section.items) {
        if (entry.kind === 'item') {
          if (hasPermission(entry.key, 'view')) {
            filteredItems.push(entry);
          }
        } else if (entry.kind === 'submenu') {
          const filteredChildren = entry.children.filter((ch) => hasPermission(ch.key, 'view'));
          if (filteredChildren.length > 0) {
            filteredItems.push({
              ...entry,
              children: filteredChildren,
            });
          }
        }
      }
      return {
        ...section,
        items: filteredItems,
      };
    }).filter((section) => section.items.length > 0);
  }, [hasPermission, currentUser.role, currentUser.customPermissions]);

  const renderModuleView = () => {
    // Independent Page-Level Permission Enforcement per Section 7
    if (!hasPermission(activeModule, 'view')) {
      return <AccessRestrictedView moduleName={activeModule} requiredAction="view" />;
    }

    switch (activeModule) {
      case 'dashboard':
        return <DashboardView />;
      case 'pos':
        return <POSView onSwitchToWebsite={onSwitchToWebsite} />;
      case 'products':
        return <ProductsView />;
      case 'inventory':
        return <InventoryView />;
      case 'categories':
        return <CategoriesView />;
      case 'purchasing':
        return <PurchasingView />;
      case 'receiving':
        return <ReceivingView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'customers':
        return <CustomersView />;
      case 'credit_sales':
        return <CreditSalesView />;
      case 'expenses':
        return <ExpensesView />;
      case 'cash_management':
        return <CashManagementView />;
      case 'payments':
        return <PaymentsView />;
      case 'accounting':
        return <AccountingView />;
      case 'reports':
        return <ReportsView />;
      case 'super_admin':
        return <SuperAdminDashboardView />;
      case 'companies':
        return <CompaniesManagementView />;
      case 'staff_management':
        return <StaffManagementView />;
      case 'staff_list':
        return <StaffListView />;
      case 'users_roles':
        return <StaffManagementView />;
      case 'audit_logs':
        return <AuditLogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  // ============================================================
  // STANDALONE MASTER ADMIN OWN PAGE (Controls All Businesses)
  // ============================================================
  if (activeModule === 'super_admin' && currentUser.role === 'Super Admin') {
    const paidSubscriptionsCount = companies.filter(
      (c) => c.subscription?.planStatus === 'Paid & Active'
    ).length;

    return (
      <div className="flex flex-col h-screen bg-slate-900 text-slate-100 antialiased overflow-hidden select-none">
        {/* DEDICATED MASTER ADMIN PLATFORM COMMAND BAR */}
        <header className="h-16 bg-[#0b1329] border-b border-indigo-950/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-md">
          {/* Left Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-400 flex items-center justify-center text-white font-black shadow-lg shadow-purple-900/40 border border-purple-400/40">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  Master Admin Platform
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-2 py-0.5 rounded-full border border-purple-300/30">
                  Global Controller
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Central Multi-Business Command Center • Complete Control Over All Businesses
              </p>
            </div>
          </div>

          {/* Center Platform Stats Chips */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-slate-200">
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span>{companies.length} Businesses Registered</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-slate-200">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>{users.length} System Users</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{paidSubscriptionsCount} Active Subscriptions</span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Dedicated Owner Page in New Browser Tab */}
            <a
              href="/owner"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-sm transition-all cursor-pointer"
              title="Open dedicated Owner Page in a new browser tab (/owner)"
            >
              <Crown className="w-3.5 h-3.5 text-slate-950" />
              <span>Owner Page</span>
              <ExternalLink className="w-3 h-3 text-slate-900" />
            </a>

            {/* Quick Workspace Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                title="Open a business workspace directly"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                <span>Open Business Workspace</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {companyDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-xs text-slate-800">
                  <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                    <span>SELECT BUSINESS TO OPEN</span>
                    <span className="text-[10px] text-purple-600 font-bold">{companies.length} Registered</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {companies.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCurrentCompanyId(c.id);
                          setActiveModule('dashboard');
                          setCompanyDropdownOpen(false);
                        }}
                        className="w-full px-3 py-2.5 text-left hover:bg-purple-50 flex items-center justify-between cursor-pointer transition-colors group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-bold text-slate-900 group-hover:text-purple-700">{c.name}</p>
                          <p className="text-[10px] text-slate-400">{c.code} • {c.businessType}</p>
                          <span className="inline-block mt-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                            {c.subscription?.planStatus || 'Paid & Active'}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-purple-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* DB Mode Indicator & Toggle */}
            <button
              onClick={() => {
                if (isEmptyDbMode) resetToDemoDatabase();
                else switchToEmptyDatabase();
              }}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Toggle Live Demo Database / Clean Setup Mode"
            >
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEmptyDbMode ? 'Empty DB' : 'Demo DB'}</span>
            </button>

            {/* Super Admin User Profile / Switcher */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 transition-colors cursor-pointer"
              >
                <div className="relative w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  SA
                  <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-[#0b1329] bg-emerald-400" />
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <p className="text-xs font-bold text-slate-200">{currentUser.name}</p>
                  <p className="text-[10px] text-purple-300 font-semibold">{currentUser.role}</p>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs text-slate-800 space-y-2">
                  <div className="p-2 bg-purple-50 rounded-xl">
                    <p className="font-bold text-slate-900">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900">
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* DEDICATED MASTER ADMIN BODY CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[#f1f5f9] text-slate-800">
          <SuperAdminDashboardView />
        </main>
      </div>
    );
  }

  // Dedicated Full-Screen Fresh & More M-POS Terminal View matching exact UI Mockup
  if (activeModule === 'pos') {
    return <POSView onSwitchToWebsite={onSwitchToWebsite} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#f4f7f6] text-slate-800 antialiased overflow-hidden select-none">
      {/* ============================================================ */}
      {/* MASTER ADMIN ACTIVE SESSION BANNER                           */}
      {/* ============================================================ */}
      {currentUser.role === 'Super Admin' && (
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white px-4 py-2 flex items-center justify-between text-xs border-b border-purple-500/30 shadow-md z-30 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-5 h-5 rounded-md bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold shrink-0">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <div className="flex items-center gap-2 truncate">
              <span className="font-extrabold text-amber-300 uppercase tracking-wide text-[11px]">Master Admin Session</span>
              <span className="text-slate-400 text-[11px]">•</span>
              <span className="text-slate-200 truncate">
                Controlling Workspace: <strong className="text-white underline decoration-amber-400 underline-offset-2">{currentCompany?.name || 'Business'}</strong> ({currentCompany?.code || currentCompanyId})
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {currentCompany?.subscription?.planStatus || 'Paid & Active'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveModule('super_admin')}
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Master Admin Page</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ============================================================ */}
        {/* 1. APPROVED DESKTOP LEFT SIDEBAR                             */}
        {/* Visible ONLY on lg screens (>= 1024px)                       */}
        {/* ============================================================ */}
        <aside
          className={`hidden lg:flex flex-col bg-[#0c4a26] text-white transition-all duration-200 z-30 shrink-0 ${
            sidebarCollapsed ? 'w-18' : 'w-64'
          }`}
        >
          {/* Brand header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-emerald-900/60 bg-[#093a1d]">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-300 flex items-center justify-center text-[#093a1d] font-black shadow-md shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div className="leading-tight truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm tracking-tight text-white truncate max-w-[140px]">
                      {currentCompany?.name || 'Fresh & More'}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/80 font-medium truncate">
                    {currentCompany?.businessType || 'Grocery Retail System'}
                  </p>
                </div>
              </div>
            )}

            {sidebarCollapsed && (
              <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-tr from-emerald-500 to-green-300 flex items-center justify-center text-[#093a1d] font-black shadow-md">
                <Store className="w-5 h-5" />
              </div>
            )}

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Super Admin Owner Page & Master Navigation Buttons */}
          {currentUser.role === 'Super Admin' && !sidebarCollapsed && (
            <div className="px-3 pt-3 space-y-1.5">
              <a
                href="/owner"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md border border-amber-300/40 transition-all cursor-pointer group"
                title="Open dedicated Owner Page in a new browser tab (/owner)"
              >
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-slate-950" />
                  <span>Owner Page</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-900 group-hover:translate-x-0.5 transition-transform" />
              </a>

              <button
                onClick={() => setActiveModule('super_admin')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs shadow-md border border-purple-400/30 transition-all cursor-pointer group"
                title="Return to Master Admin Page that controls all businesses"
              >
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span>Master Admin Page</span>
                </div>
                <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-purple-200 group-hover:text-white">Exit</span>
              </button>
            </div>
          )}

        {/* Navigation list matching screenshot */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 custom-scrollbar">
          {authorizedNavSections.map((section, sIndex) => {
            return (
              <div key={section.id} className={sIndex > 0 ? 'pt-1' : ''}>
                {/* Horizontal divider between sections */}
                {sIndex > 0 && (
                  <div className="border-t border-emerald-800/50 my-2 mx-1" />
                )}

                {/* Uppercase Section Header */}
                {section.title && !sidebarCollapsed && (
                  <div className="px-3 pt-1 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-emerald-300/60 select-none">
                    {section.title}
                  </div>
                )}

                <div className="space-y-0.5">
                  {section.items.map((entry) => {
                    if (entry.kind === 'item') {
                      const Icon = entry.icon;
                      const isActive = activeModule === entry.key;

                      return (
                        <button
                          key={entry.key}
                          onClick={() => setActiveModule(entry.key)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                            isActive
                              ? 'bg-emerald-800/70 text-white shadow-xs font-bold border border-emerald-700/60'
                              : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                          } ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : ''}`}
                          title={sidebarCollapsed ? entry.label : undefined}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive ? 'text-white' : 'text-emerald-200/80 group-hover:text-white'
                            }`}
                          />
                          {!sidebarCollapsed && (
                            <span className="truncate flex-1 text-left">{entry.label}</span>
                          )}
                          {!sidebarCollapsed && entry.badge && (
                            <span
                              className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                                entry.badgeColor || 'bg-emerald-500 text-white'
                              }`}
                            >
                              {entry.badge}
                            </span>
                          )}
                        </button>
                      );
                    }

                    if (entry.kind === 'submenu') {
                      const Icon = entry.icon;
                      const isAnyChildActive = entry.children.some((ch) => ch.key === activeModule);

                      if (sidebarCollapsed) {
                        return (
                          <button
                            key={entry.id}
                            onClick={() => {
                              setActiveModule(entry.children[0]?.key || 'staff_list');
                            }}
                            className={`w-full flex justify-center py-2.5 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                              isAnyChildActive
                                ? 'bg-emerald-800/70 text-white shadow-xs font-bold'
                                : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                            }`}
                            title={entry.label}
                          >
                            <Icon className="w-4 h-4 text-emerald-200/80 group-hover:text-white" />
                          </button>
                        );
                      }

                      return (
                        <div key={entry.id} className="space-y-0.5">
                          {/* Submenu Header Button */}
                          <button
                            onClick={() => setStaffsSubmenuOpen(!staffsSubmenuOpen)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                              isAnyChildActive
                                ? 'text-white font-bold'
                                : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Icon
                                className={`w-4 h-4 shrink-0 transition-colors ${
                                  isAnyChildActive ? 'text-emerald-300' : 'text-emerald-200/80 group-hover:text-white'
                                }`}
                              />
                              <span className="truncate text-left">{entry.label}</span>
                            </div>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-emerald-300/70 transition-transform duration-200 ${
                                staffsSubmenuOpen ? 'rotate-0' : '-rotate-90'
                              }`}
                            />
                          </button>

                          {/* Submenu Children Items */}
                          {staffsSubmenuOpen && (
                            <div className="space-y-0.5 pt-0.5 pb-1">
                              {entry.children.map((child) => {
                                const ChildIcon = child.icon;
                                const isChildActive = activeModule === child.key;

                                return (
                                  <button
                                    key={child.key}
                                    onClick={() => setActiveModule(child.key)}
                                    className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-lg text-[11.5px] transition-all group cursor-pointer ${
                                      isChildActive
                                        ? 'bg-emerald-800/70 text-white font-bold shadow-xs'
                                        : 'text-emerald-100/75 hover:bg-white/10 hover:text-white font-medium'
                                    }`}
                                  >
                                    <ChildIcon
                                      className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                        isChildActive ? 'text-white' : 'text-emerald-200/70 group-hover:text-white'
                                      }`}
                                    />
                                    <span className="truncate flex-1 text-left">{child.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom Current User & Mode */}
        <div className="p-3 border-t border-emerald-900/60 bg-[#093a1d]/80 text-xs">
          {!sidebarCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-400/40 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="font-bold text-white text-xs truncate">{currentUser.name}</p>
                  <span className="text-[10px] text-emerald-300 font-medium">{currentUser.role}</span>
                </div>
              </div>

              {/* Database environment indicator */}
              <div className="flex items-center justify-between pt-1 border-t border-emerald-900/60 text-[10px] text-emerald-200/80">
                <span className="truncate">{isEmptyDbMode ? 'Empty DB (0 RWF)' : 'Kigali Demo'}</span>
                <button
                  onClick={() => {
                    if (isEmptyDbMode) resetToDemoDatabase();
                    else switchToEmptyDatabase();
                  }}
                  className="underline hover:text-white"
                >
                  Switch
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-400/40 flex items-center justify-center font-bold text-white text-xs">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. MAIN APPLICATION CONTENT AREA                             */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* ============================================================ */}
        {/* TOP NAVIGATION BAR                                           */}
        {/* Responsive: 100% Approved Desktop on lg, Mobile Bar on <lg   */}
        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* DESKTOP HEADER (World-Class, Perfectly Aligned on Every Page) */}
        {/* ============================================================ */}
        <header className="hidden lg:flex h-16 bg-white border-b border-slate-200/90 px-5 xl:px-6 items-center justify-between shrink-0 z-20 shadow-2xs gap-4">
          {/* Left Context: Global Search + Segmented Business & Branch Selector */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Global Search Bar */}
            <div className="relative w-60 xl:w-72 2xl:w-80 shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products, sales, customers (Ctrl+K)..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-9 text-xs rounded-xl bg-slate-50/90 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-[#0c4a26] focus:ring-2 focus:ring-[#0c4a26]/15 transition-all text-slate-800 placeholder:text-slate-400"
              />
              <kbd className="hidden 2xl:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs pointer-events-none">
                ⌘K
              </kbd>
            </div>

            {/* Segmented Business & Branch Context Capsule */}
            <div className="flex items-center rounded-xl border border-slate-200/90 bg-slate-50/70 p-0.5 shadow-2xs divide-x divide-slate-200/90 shrink-0">
              {/* Business Selector */}
              <div className="relative">
                <button
                  onClick={() => {
                    setCompanyDropdownOpen(!companyDropdownOpen);
                    if (branchDropdownOpen) setBranchDropdownOpen(false);
                  }}
                  className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-bold text-[#0c4a26] hover:bg-white hover:shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                  title="Active Business / Commercial Entity"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#0c4a26] shrink-0" />
                  <span className="truncate max-w-[125px] xl:max-w-[160px]">
                    {currentCompanyId === 'all' ? 'All Businesses' : currentCompany?.name || 'Fresh & More'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-emerald-800 opacity-70 shrink-0" />
                </button>

                {companyDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                      <span>ACTIVE BUSINESS</span>
                      {currentUser.role === 'Super Admin' && (
                        <button
                          onClick={() => {
                            setActiveModule('companies');
                            setCompanyDropdownOpen(false);
                          }}
                          className="text-emerald-700 hover:underline cursor-pointer"
                        >
                          Manage
                        </button>
                      )}
                    </div>
                    {currentUser.role === 'Super Admin' && (
                      <button
                        onClick={() => {
                          setCurrentCompanyId('all');
                          setCompanyDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center justify-between cursor-pointer ${
                          currentCompanyId === 'all' ? 'text-[#0c4a26] bg-emerald-50/80 font-bold' : 'text-slate-700 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>All Businesses (Consolidated)</span>
                        </div>
                        {currentCompanyId === 'all' && <Check className="w-3.5 h-3.5 text-[#0c4a26]" />}
                      </button>
                    )}
                    {companies.map((c) => {
                      const isSelected = currentCompanyId === c.id;
                      const isAllowed =
                        currentUser.role === 'Super Admin' ||
                        currentUser.assignedCompanyIds?.includes(c.id) ||
                        currentUser.companyId === c.id;
                      if (!isAllowed) return null;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCurrentCompanyId(c.id);
                            setCompanyDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                            isSelected ? 'text-[#0c4a26] bg-emerald-50/60 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="truncate text-xs font-semibold">{c.name}</p>
                            <p className="text-[10px] text-slate-400">{c.code} • {c.businessType}</p>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#0c4a26] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Branch Selector */}
              <div className="relative">
                <button
                  onClick={() => {
                    setBranchDropdownOpen(!branchDropdownOpen);
                    if (companyDropdownOpen) setCompanyDropdownOpen(false);
                  }}
                  className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white hover:shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                  title="Active Branch"
                >
                  <Store className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="truncate max-w-[105px] xl:max-w-[130px]">{currentBranch}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>
                {branchDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Select Store Branch
                    </div>
                    {branches.map((b) => (
                      <button
                        key={b}
                        onClick={() => {
                          setCurrentBranch(b);
                          setBranchDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                          currentBranch === b ? 'text-[#0c4a26] bg-emerald-50/60 font-bold' : 'text-slate-700 font-medium'
                        }`}
                      >
                        <span>{b}</span>
                        {currentBranch === b && <Check className="w-3.5 h-3.5 text-[#0c4a26]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Context: Real-Time Clock + Quick Actions + Alerts + Profile */}
          <div className="flex items-center gap-2 xl:gap-3 shrink-0 ml-auto">
            {/* Real-Time Synchronized Clock Capsule - Crisp, Never Wrapping, Interactive */}
            <button
              onClick={() => setTimeSyncModalOpen(true)}
              className="group flex items-center gap-2 h-9 px-2.5 xl:px-3 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/90 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              title="Click to view Time Synchronization settings, timezone & calibrate clock"
            >
              <div className="flex items-center gap-1.5 font-mono tabular-nums font-bold text-slate-800 group-hover:text-[#0c4a26]">
                <Clock className="w-3.5 h-3.5 text-[#0c4a26] animate-pulse shrink-0" />
                <span className="text-xs tracking-tight">{formatTime(currentTime, timeFormat, true)}</span>
              </div>
              <span className="text-slate-300">·</span>
              <span className="font-medium text-slate-600 text-xs hidden xl:inline whitespace-nowrap">
                {formatDate(currentTime, { weekday: 'short', includeYear: false })}
              </span>
              <div className="flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full font-bold">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    syncStatus === 'synced'
                      ? 'bg-emerald-500'
                      : syncStatus === 'syncing'
                      ? 'bg-blue-500 animate-ping'
                      : 'bg-amber-500'
                  }`}
                />
                <span>{timeZone.split('/')[1]?.replace('_', ' ') || 'Kigali'}</span>
              </div>
            </button>

            {/* Master Admin Page CTA if Super Admin */}
            {currentUser.role === 'Super Admin' && (
              <button
                onClick={() => setActiveModule('super_admin')}
                className="flex items-center gap-1.5 h-9 px-2.5 xl:px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="Return to Master Admin Page that controls all businesses"
              >
                <Crown className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                <span className="hidden xl:inline">Master Admin</span>
              </button>
            )}

            {/* Public Website Navigation Button */}
            {onSwitchToWebsite && (
              <button
                onClick={onSwitchToWebsite}
                className="flex items-center gap-1.5 h-9 px-2.5 xl:px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#0c4a26] border border-emerald-200 text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="View Customer-Facing Grocery Website"
              >
                <Store className="w-3.5 h-3.5 text-[#0c4a26] shrink-0" />
                <span className="hidden xl:inline">Website</span>
              </button>
            )}

            {/* Clean Vertical Divider */}
            <div className="h-6 w-px bg-slate-200 shrink-0" />

            {/* Desktop Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {systemAlerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">Notifications & Alerts</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600 font-bold">
                        {systemAlerts.length}
                      </span>
                    </div>
                    {systemAlerts.length > 0 && (
                      <button
                        onClick={() => setSystemAlerts([])}
                        className="text-[11px] text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {systemAlerts.length === 0 ? (
                      <div className="py-6 text-center text-slate-400">
                        <p className="text-xs font-semibold">No active notifications</p>
                      </div>
                    ) : (
                      systemAlerts.map((alt) => (
                        <div
                          key={alt.id}
                          className={`p-2 rounded-lg flex items-start justify-between gap-2 ${
                            alt.isWarning ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-bold">{alt.title}</p>
                            <p className={`text-[11px] ${alt.isWarning ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {alt.text}
                            </p>
                          </div>
                          <button
                            onClick={() => setSystemAlerts((prev) => prev.filter((a) => a.id !== alt.id))}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded shrink-0 cursor-pointer"
                            title="Dismiss notification"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop User Avatar & Profile Card */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0c4a26] to-[#15803d] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-left leading-tight hidden xl:block">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[110px]">{currentUser.name}</p>
                  <p className="text-[10px] text-emerald-700 font-semibold">{currentUser.role}</p>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden xl:block shrink-0" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <p className="font-bold text-slate-900">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {currentUser.role}
                    </span>
                  </div>
                  {/* Explicit Logout & Lock POS Action */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-xl font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout & Lock POS</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* MOBILE TOP BAR (Screens 3, 4, 8, 9, 10, 11 in Reference Mockup) */}
        {/* Visible ONLY on mobile (< 1024px)                             */}
        {/* ============================================================ */}
        <header className="lg:hidden h-14 bg-[#0b4824] text-white px-3.5 flex items-center justify-between shrink-0 z-20 shadow-sm">
          {/* Left button: Hamburger on Home, Back arrow on other modules */}
          <div className="flex items-center gap-2.5">
            {activeModule === 'dashboard' ? (
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="p-1.5 rounded-lg text-white hover:bg-white/15 transition-colors"
                aria-label="Open side menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setActiveModule('dashboard')}
                className="p-1.5 rounded-lg text-white hover:bg-white/15 transition-colors flex items-center gap-1"
                aria-label="Back to dashboard"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Screen Title */}
            <div className="leading-tight">
              {activeModule === 'dashboard' ? (
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-white">Fresh & More</span>
                  <span className="text-[9px] font-bold bg-emerald-400 text-[#093a1d] px-1 py-0.2 rounded uppercase">
                    M-POS
                  </span>
                </div>
              ) : (
                <h1 className="font-bold text-sm tracking-tight text-white">
                  {NAV_ITEMS.find((n) => n.key === activeModule)?.label || 'Fresh & More'}
                </h1>
              )}
            </div>
          </div>

          {/* Right context actions matching mockup */}
          <div className="flex items-center gap-1.5">
            {/* Mobile Real-Time Clock & Sync Status Button */}
            <button
              onClick={() => setTimeSyncModalOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/25 hover:bg-black/40 text-white font-mono text-[11px] font-bold tracking-tight cursor-pointer"
              title="Time Synchronization & Timezone Settings"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-400 ring-2 ring-emerald-400/40'
                    : syncStatus === 'syncing'
                    ? 'bg-blue-300 animate-ping'
                    : 'bg-amber-400'
                }`}
              />
              <span>{formatTime(currentTime, timeFormat, false)}</span>
            </button>
            {activeModule === 'dashboard' && (
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl text-white hover:bg-white/15 relative"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {systemAlerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                    {systemAlerts.length}
                  </span>
                )}
              </button>
            )}

            {(activeModule as string) === 'pos' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const el = document.getElementById('pos-search-input');
                    if (el) el.focus();
                  }}
                  className="p-2 rounded-xl text-white hover:bg-white/15"
                  title="Barcode Scanner Mode"
                >
                  <Barcode className="w-5 h-5 text-emerald-200" />
                </button>
              </div>
            )}

            {(activeModule === 'products' || activeModule === 'inventory') && (
              <button
                onClick={() => {
                  const el = document.getElementById('catalog-search-input');
                  if (el) el.focus();
                }}
                className="p-2 rounded-xl text-white hover:bg-white/15"
                title="Filter products"
              >
                <FolderTree className="w-4 h-4 text-emerald-200" />
              </button>
            )}

            {activeModule === 'purchasing' && (
              <button
                onClick={() => {
                  const btn = document.getElementById('create-po-btn');
                  if (btn) btn.click();
                }}
                className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[11px]">PO</span>
              </button>
            )}

            {activeModule === 'customers' && (
              <button
                onClick={() => {
                  const btn = document.getElementById('add-customer-btn');
                  if (btn) btn.click();
                }}
                className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[11px]">Add</span>
              </button>
            )}

            {activeModule !== 'dashboard' && (activeModule as string) !== 'pos' && activeModule !== 'products' && activeModule !== 'inventory' && activeModule !== 'purchasing' && activeModule !== 'customers' && (
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="p-2 rounded-xl text-white hover:bg-white/15"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* ============================================================ */}
        {/* MAIN SCROLLABLE CONTENT VIEWPORT                             */}
        {/* ============================================================ */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 pb-20 lg:pb-6 custom-scrollbar">
          {renderModuleView()}
        </main>
      </div>
    </div>

      {/* ============================================================ */}
      {/* 3. MOBILE SLIDE-OUT DRAWER (MATCHING SCREEN 12 PROFILE MENU) */}
      {/* ============================================================ */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer content (Clean White Theme matching Screen 12) */}
          <div className="relative w-80 max-w-[85vw] bg-white text-slate-800 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Top User Profile Header (Screen 12) */}
            <div className="p-4 border-b border-slate-100 bg-[#0b4824] text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-bold text-white text-sm shadow-xs">
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-white text-sm truncate">{currentUser.name}</p>
                    </div>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-[#093a1d]">
                      {currentUser.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded-lg text-white/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Company & Branch indicator card */}
              <div className="mt-3 pt-2.5 border-t border-emerald-900/60 space-y-1.5 text-xs text-emerald-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Building2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span className="font-semibold truncate">
                      {currentCompanyId === 'all' ? 'All Businesses' : currentCompany?.name || 'Fresh & More'}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-300/80 shrink-0 uppercase font-bold">
                    {currentCompany?.code || 'CORP'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-emerald-200/90">
                  <div className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{currentBranch}</span>
                  </div>
                  <span className="text-[10px] text-emerald-300/80">Kigali</span>
                </div>
              </div>
            </div>

            {/* Quick Company Switcher Selector in Mobile Menu */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs space-y-2">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Active Business / Company:
                </p>
                <select
                  value={currentCompanyId}
                  onChange={(e) => setCurrentCompanyId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  {currentUser.role === 'Super Admin' && (
                    <option value="all">🏢 All Businesses (Consolidated)</option>
                  )}
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {currentUser.role === 'Super Admin' && (
                <a
                  href="/owner"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-slate-950" />
                    <span>Open Owner Page (New Tab)</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-900" />
                </a>
              )}
            </div>

            {/* Full authorized modules navigation in drawer */}
            <nav className="flex-1 overflow-y-auto p-2.5 space-y-1 custom-scrollbar text-xs">
              {authorizedNavSections.map((section, sIndex) => (
                <div key={section.id} className={sIndex > 0 ? 'pt-1.5' : ''}>
                  {sIndex > 0 && <div className="border-t border-slate-100 my-1.5 mx-1" />}
                  {section.title && (
                    <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                      {section.title}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {section.items.map((entry) => {
                      if (entry.kind === 'item') {
                        const Icon = entry.icon;
                        const isActive = activeModule === entry.key;
                        return (
                          <button
                            key={entry.key}
                            onClick={() => {
                              setActiveModule(entry.key);
                              setMobileDrawerOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-medium transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-emerald-50 text-[#0c4a26] font-bold border-l-4 border-[#0c4a26]'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-[#0c4a26]' : 'text-slate-400'}`} />
                            <span className="truncate flex-1 text-left">{entry.label}</span>
                            {entry.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                {entry.badge}
                              </span>
                            )}
                          </button>
                        );
                      }

                      if (entry.kind === 'submenu') {
                        const Icon = entry.icon;
                        const isAnyChildActive = entry.children.some((ch) => ch.key === activeModule);
                        return (
                          <div key={entry.id} className="space-y-0.5">
                            <button
                              onClick={() => setStaffsSubmenuOpen(!staffsSubmenuOpen)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                                isAnyChildActive ? 'text-[#0c4a26] font-bold' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Icon className={`w-4 h-4 ${isAnyChildActive ? 'text-[#0c4a26]' : 'text-slate-400'}`} />
                                <span className="truncate text-left">{entry.label}</span>
                              </div>
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                  staffsSubmenuOpen ? 'rotate-0' : '-rotate-90'
                                }`}
                              />
                            </button>
                            {staffsSubmenuOpen && (
                              <div className="space-y-0.5 pt-0.5 pb-1">
                                {entry.children.map((child) => {
                                  const ChildIcon = child.icon;
                                  const isChildActive = activeModule === child.key;
                                  return (
                                    <button
                                      key={child.key}
                                      onClick={() => {
                                        setActiveModule(child.key);
                                        setMobileDrawerOpen(false);
                                      }}
                                      className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                        isChildActive
                                          ? 'bg-emerald-50 text-[#0c4a26] font-bold border-l-4 border-[#0c4a26]'
                                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                                      }`}
                                    >
                                      <ChildIcon
                                        className={`w-3.5 h-3.5 ${isChildActive ? 'text-[#0c4a26]' : 'text-slate-400'}`}
                                      />
                                      <span className="truncate flex-1 text-left">{child.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* Drawer Bottom (Help, Switch DB & Logout) */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs space-y-2">
              {onSwitchToWebsite && (
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onSwitchToWebsite();
                  }}
                  className="w-full py-2 px-2.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[#0c4a26] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Store className="w-4 h-4 text-[#0c4a26]" />
                  <span>Return to Public Website</span>
                </button>
              )}
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span className="font-medium">Data Mode:</span>
                <button
                  onClick={() => {
                    if (isEmptyDbMode) resetToDemoDatabase();
                    else switchToEmptyDatabase();
                  }}
                  className="font-bold text-[#0c4a26] underline"
                >
                  {isEmptyDbMode ? 'Switch to Demo' : 'Switch to 0 RWF'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <button
                  onClick={() => {
                    setActiveModule('settings');
                    setMobileDrawerOpen(false);
                  }}
                  className="py-2 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold flex items-center justify-center gap-1.5"
                >
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  <span>Help</span>
                </button>
                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    logout();
                  }}
                  className="py-2 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MOBILE STICKY BOTTOM NAVIGATION BAR (Screens 3 & 4)        */}
      {/* 4 Items: Home | POS | Products | More                         */}
      {/* ============================================================ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 shadow-lg flex items-center justify-around px-3 z-40">
        {/* 1. Home / Dashboard */}
        <button
          onClick={() => setActiveModule('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            activeModule === 'dashboard' ? 'text-[#0c4a26] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* 2. Point of Sale */}
        <button
          onClick={() => setActiveModule('pos')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            (activeModule as string) === 'pos' ? 'text-[#0c4a26] font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">POS</span>
        </button>

        {/* 3. Products */}
        <button
          onClick={() => setActiveModule('products')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
            activeModule === 'products' || activeModule === 'inventory'
              ? 'text-[#0c4a26] font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Products</span>
        </button>

        {/* 4. More (Profile & Side Menu Drawer - Screen 12) */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-slate-500 hover:text-slate-800"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </div>

      {/* Automatic Time Synchronization Modal */}
      <TimeSyncModal
        open={timeSyncModalOpen}
        onClose={() => setTimeSyncModalOpen(false)}
      />

      {/* ============================================================ */}
      {/* TOAST NOTIFICATION CONTAINER                                 */}
      {/* ============================================================ */}
      <div className="fixed bottom-20 lg:bottom-5 right-5 z-50 space-y-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl shadow-lg border text-xs flex items-start gap-2.5 animate-in slide-in-from-right duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className="font-bold">{toast.title}</p>
              <p className="text-[11px] opacity-90">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="opacity-60 hover:opacity-100 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { isAuthenticated, isVerifyingSession, setActiveModule } = useStore();

  const isOwnerRoute = (): boolean => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      return (
        pathname === '/owner' ||
        pathname.startsWith('/owner/') ||
        hash === '#owner' ||
        hash.startsWith('#owner/') ||
        search.includes('view=owner') ||
        search.includes('route=owner')
      );
    }
    return false;
  };

  const getInitialViewMode = (): 'website' | 'webapp' | 'owner' => {
    if (isOwnerRoute()) {
      return 'owner';
    }
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#webapp' || hash === '#app' || hash === '#pos' || hash.startsWith('#webapp/')) {
        return 'webapp';
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'webapp' || params.get('view') === 'webapp') {
        return 'webapp';
      }
    }
    return 'website';
  };

  const [viewMode, setViewMode] = useState<'website' | 'webapp' | 'owner'>(getInitialViewMode);

  React.useEffect(() => {
    const handleUrlChange = () => {
      if (isOwnerRoute()) {
        setViewMode('owner');
        return;
      }
      const hash = window.location.hash.toLowerCase();
      if (hash === '#webapp' || hash === '#app' || hash === '#pos' || hash.startsWith('#webapp/')) {
        setViewMode('webapp');
      } else if (
        hash === '#website' ||
        hash === '' ||
        hash === '#' ||
        hash === '#home' ||
        hash === '#catalog' ||
        hash === '#branches' ||
        hash === '#why-us' ||
        hash === '#contact'
      ) {
        setViewMode('website');
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const handleLaunchWebApp = () => {
    setViewMode('webapp');
    if (window.location.hash !== '#webapp') {
      window.location.hash = '#webapp';
    }
  };

  const handleSwitchToWebsite = () => {
    setViewMode('website');
    if (window.location.hash !== '#website') {
      window.location.hash = '#website';
    }
  };

  // Dedicated Super Admin / System Owner Route
  if (viewMode === 'owner' || isOwnerRoute()) {
    return <OwnerPage />;
  }

  if (viewMode === 'website') {
    return <PublicWebsiteView onLaunchWebApp={handleLaunchWebApp} />;
  }

  // Session verification gate
  if (isVerifyingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white font-sans select-none p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg animate-pulse">
            <Store className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-200">Verifying secure session...</p>
          <p className="text-xs text-slate-400">Fresh & More POS Security Gateway</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <POSLoginPage
        onLoginSuccess={(redirectMod) => setActiveModule(redirectMod)}
        onBackToWebsite={handleSwitchToWebsite}
      />
    );
  }

  return <AuthenticatedApp onSwitchToWebsite={handleSwitchToWebsite} />;
};

export default function App() {
  return (
    <StoreProvider>
      <MainLayout />
    </StoreProvider>
  );
}
