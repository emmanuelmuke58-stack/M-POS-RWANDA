import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Company, Product, UserAccount } from '../types';
import {
  Building2,
  Users,
  Package,
  Layers,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Power,
  ExternalLink,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  Mail,
  Store,
  Crown,
  History,
  Settings,
  Sparkles,
  ArrowRight,
  X,
  RefreshCw,
  LogOut,
  UserCheck,
  Lock,
} from 'lucide-react';

export const OwnerPage: React.FC = () => {
  const {
    currentUser,
    companies,
    allProducts,
    users,
    auditLogs,
    addCompany,
    updateCompany,
    toggleCompanyStatus,
    deleteCompany,
    setCurrentCompanyId,
    setActiveModule,
    todayString,
    formatDate,
    formatTime,
    login,
    logout,
    notify,
  } = useStore();

  const [authStatus, setAuthStatus] = useState<'checking' | 'authorized' | 'unauthorized' | 'unauthenticated'>('checking');
  const [activeTab, setActiveTab] = useState<'businesses' | 'inventory' | 'users' | 'audit' | 'settings'>('businesses');
  const [serverStats, setServerStats] = useState<{
    totalBusinesses: number;
    activeBusinesses: number;
    suspendedBusinesses: number;
    totalUsers: number;
    totalProducts: number;
    totalInventoryValue: number;
    totalRetailValue: number;
    monthlyRunRate: number;
  } | null>(null);

  // Filters & Search
  const [businessSearch, setBusinessSearch] = useState('');
  const [businessStatusFilter, setBusinessStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Suspended'>('All');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('All');

  // Modals
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<Company | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [statusConfirmCompany, setStatusConfirmCompany] = useState<Company | null>(null);
  const [pendingStatus, setPendingStatus] = useState<'Active' | 'Suspended' | 'Inactive'>('Active');
  const [statusReason, setStatusReason] = useState('');

  // Inventory tab filters
  const [inventoryBusinessFilter, setInventoryBusinessFilter] = useState('all');
  const [inventorySearch, setInventorySearch] = useState('');

  // Login form for unauthenticated direct visitors
  const [loginIdentifier, setLoginIdentifier] = useState('admin@freshandmore.rw');
  const [loginPassword, setLoginPassword] = useState('Pos123!');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Form states for business creation / editing
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState('Supermarket / Grocery Retail');
  const [formTin, setFormTin] = useState('');
  const [formPhone, setFormPhone] = useState('+250 788 000 000');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('Kigali, Rwanda');
  const [formCity, setFormCity] = useState('Kigali');
  const [formCountry, setFormCountry] = useState('Rwanda');
  const [formOwner, setFormOwner] = useState('');
  const [formPlan, setFormPlan] = useState<'Enterprise Growth' | 'Professional Retail' | 'Standard Business'>('Standard Business');
  const [formMonthlyFee, setFormMonthlyFee] = useState('60000');

  // Verify Super Admin access on mount via server-side verification
  useEffect(() => {
    const verifyAccess = async () => {
      const token = localStorage.getItem('fresh_pos_token');
      if (!token) {
        if (currentUser.role === 'Super Admin') {
          setAuthStatus('authorized');
        } else {
          setAuthStatus('unauthenticated');
        }
        return;
      }

      try {
        const res = await fetch('/api/owner/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success && data.authorized) {
          setAuthStatus('authorized');
          // Fetch stats
          fetchServerStats(token);
        } else if (res.status === 403) {
          setAuthStatus('unauthorized');
        } else {
          if (currentUser.role === 'Super Admin') {
            setAuthStatus('authorized');
          } else {
            setAuthStatus('unauthenticated');
          }
        }
      } catch {
        // Fallback to local session check
        if (currentUser.role === 'Super Admin') {
          setAuthStatus('authorized');
        } else {
          setAuthStatus('unauthorized');
        }
      }
    };

    void verifyAccess();
  }, [currentUser]);

  const fetchServerStats = async (token?: string) => {
    const activeToken = token || localStorage.getItem('fresh_pos_token');
    if (!activeToken) return;
    try {
      const res = await fetch('/api/owner/stats', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.stats) {
        setServerStats(data.stats);
      }
    } catch {
      // ignore
    }
  };

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    const res = await login(loginIdentifier, loginPassword, true);
    setLoginLoading(false);
    if (!res.success) {
      setLoginError(res.error || 'Authentication failed. Please check credentials.');
    }
  };

  const openCreateModal = () => {
    setFormName('');
    setFormCode(`BIZ-${Math.floor(100 + Math.random() * 900)}`);
    setFormType('Supermarket / Grocery Retail');
    setFormTin(`10${Math.floor(1000000 + Math.random() * 9000000)}`);
    setFormPhone('+250 788 000 000');
    setFormEmail('');
    setFormAddress('Kigali, Rwanda');
    setFormCity('Kigali');
    setFormCountry('Rwanda');
    setFormOwner('Store Proprietor');
    setFormPlan('Standard Business');
    setFormMonthlyFee('60000');
    setEditingCompany(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (c: Company) => {
    setFormName(c.name);
    setFormCode(c.code);
    setFormType(c.businessType);
    setFormTin(c.tin);
    setFormPhone(c.phone);
    setFormEmail(c.email);
    setFormAddress(c.address);
    setFormCity(c.city);
    setFormCountry(c.country);
    setFormOwner(c.ownerName || '');
    setFormPlan(c.subscription?.planName as any || 'Standard Business');
    setFormMonthlyFee(String(c.subscription?.monthlyFee || 60000));
    setEditingCompany(c);
    setIsCreateModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCompany) {
      await updateCompany(editingCompany.id, {
        name: formName,
        code: formCode,
        businessType: formType,
        tin: formTin,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        city: formCity,
        country: formCountry,
        ownerName: formOwner,
        subscription: {
          ...editingCompany.subscription!,
          planName: formPlan,
          monthlyFee: Number(formMonthlyFee) || 60000,
        },
      });
      notify('success', 'Business Updated', `${formName} configuration saved.`);
    } else {
      await addCompany({
        name: formName,
        code: formCode,
        businessType: formType,
        tin: formTin,
        phone: formPhone,
        email: formEmail || `info@${formCode.toLowerCase()}.rw`,
        address: formAddress,
        city: formCity,
        country: formCountry,
        currency: 'RWF',
        status: 'Active',
        ownerName: formOwner,
        branches: [{ id: `br-${Date.now()}`, name: 'Headquarters', location: formAddress, manager: formOwner }],
        subscription: {
          planName: formPlan,
          planStatus: 'Paid & Active',
          billingCycle: 'Monthly',
          monthlyFee: Number(formMonthlyFee) || 60000,
          startDate: todayString,
          renewalDate: '2026-12-31',
          currency: 'RWF',
          autoRenew: true,
        },
      });
      notify('success', 'Business Registered', `${formName} registered in system.`);
    }
    setIsCreateModalOpen(false);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusConfirmCompany) return;
    await toggleCompanyStatus(statusConfirmCompany.id, statusReason || `Status set to ${pendingStatus}`);
    setStatusConfirmCompany(null);
  };

  // Filtered businesses
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(businessSearch.toLowerCase()) ||
        c.code.toLowerCase().includes(businessSearch.toLowerCase()) ||
        c.tin.includes(businessSearch) ||
        (c.ownerName && c.ownerName.toLowerCase().includes(businessSearch.toLowerCase()));
      const matchStatus = businessStatusFilter === 'All' || c.status === businessStatusFilter;
      const matchType = businessTypeFilter === 'All' || c.businessType === businessTypeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [companies, businessSearch, businessStatusFilter, businessTypeFilter]);

  // Multi-business inventory items (strictly separated by businessId)
  const filteredInventoryItems = useMemo(() => {
    return allProducts.filter((p) => {
      const matchBusiness = inventoryBusinessFilter === 'all' || p.companyId === inventoryBusinessFilter;
      const matchSearch =
        p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        p.barcode.includes(inventorySearch);
      return matchBusiness && matchSearch;
    });
  }, [allProducts, inventoryBusinessFilter, inventorySearch]);

  // Aggregate metrics
  const totalValuation = useMemo(() => {
    return allProducts.reduce((sum, p) => sum + p.costPrice * p.stock, 0);
  }, [allProducts]);

  const totalMonthlyRunRate = useMemo(() => {
    return companies.reduce((sum, c) => sum + (c.subscription?.monthlyFee || 0), 0);
  }, [companies]);

  // 1. Loading check
  if (authStatus === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-xl animate-pulse">
            <Crown className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-slate-300">Authorizing System Owner Clearance...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state: direct login screen
  if (authStatus === 'unauthenticated' || (!currentUser && authStatus !== 'authorized')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#070d1d] text-slate-100 p-4 font-sans select-none">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20">
              <Crown className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Owner Portal</h1>
            <p className="text-xs text-slate-400">
              Fresh & More System Owner & Super Admin Authentication
            </p>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-amber-200">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Super Admin Clearance Required</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Sign in with system administrator credentials to access multi-business management controls.
              </p>
            </div>
          </div>

          {loginError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleOwnerLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Phone or Email</label>
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="admin@freshandmore.rw"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate as System Owner</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center">
            <a
              href="/"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Return to Main Website / POS
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 3. Unauthorized state: user is logged in, but not as Super Admin
  if (authStatus === 'unauthorized' || currentUser.role !== 'Super Admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#070d1d] text-slate-100 p-6 font-sans">
        <div className="w-full max-w-lg bg-slate-900 border border-red-900/40 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 px-3 py-1 rounded-full border border-red-500/30">
              403 Forbidden • Access Denied
            </span>
            <h1 className="text-2xl font-black text-white">System Owner Clearance Required</h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              The <strong className="text-amber-400">Owner Page (/owner)</strong> is restricted strictly to the{' '}
              <strong className="text-white">System Super Admin / Master Owner</strong>.
            </p>
          </div>

          <div className="p-4 bg-slate-800/60 rounded-2xl text-left border border-slate-700/60 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Signed In Account:</span>
              <strong className="text-white">{currentUser.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Assigned Role:</span>
              <strong className="text-red-400 font-bold">{currentUser.role}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assigned Business:</span>
              <span className="text-slate-300">{currentUser.companyId || 'Store Workspace'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer text-center"
            >
              Return to Authorized Workspace
            </a>
            <button
              onClick={logout}
              className="px-5 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs transition-colors cursor-pointer text-center"
            >
              Sign Out & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized Super Admin / System Owner View
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Top Header Bar */}
      <header className="h-16 bg-[#0a1128] border-b border-indigo-950/80 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-40 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm sm:text-base tracking-tight text-white">
                Fresh & More • System Owner Console
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-2 py-0.5 rounded-full font-bold">
                Super Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden md:block">
              Authoritative Multi-Business Governance & System Separation Architecture
            </p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{formatDate()} • {formatTime()}</span>
          </div>

          <a
            href="/#webapp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
            title="Open POS Terminal in another tab"
          >
            <Store className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Open POS Terminal</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Business</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Businesses</span>
              <Building2 className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-black text-white">{companies.length}</p>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{companies.filter((c) => c.status === 'Active').length} Active Accounts</span>
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>System Users</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white">{users.length}</p>
            <p className="text-[11px] text-slate-400">Across {companies.length} business entities</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Multi-Store Items</span>
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white">{allProducts.length}</p>
            <p className="text-[11px] text-amber-300/90 font-medium">Strictly Isolated by Business</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Monthly Run Rate (MRR)</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white tabular-nums">
              {totalMonthlyRunRate.toLocaleString()} <span className="text-xs font-normal text-slate-400">RWF</span>
            </p>
            <p className="text-[11px] text-slate-400">From subscribed businesses</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('businesses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'businesses'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Registered Businesses ({companies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Cross-Business Items Monitor</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>System Users & Governance</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>System Audit Logs</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: BUSINESSES MANAGEMENT                                 */}
        {/* ============================================================ */}
        {activeTab === 'businesses' && (
          <div className="space-y-4">
            {/* Search & Filter Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search businesses by name, code, owner, or TIN..."
                  value={businessSearch}
                  onChange={(e) => setBusinessSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <select
                  value={businessStatusFilter}
                  onChange={(e) => setBusinessStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active Only</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>

              <div>
                <select
                  value={businessTypeFilter}
                  onChange={(e) => setBusinessTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <option value="All">All Business Types</option>
                  <option value="Supermarket / Grocery Retail">Supermarket / Grocery</option>
                  <option value="Organic Produce & Daily Mart">Organic Produce</option>
                  <option value="Mini-Market">Mini-Market</option>
                </select>
              </div>
            </div>

            {/* Businesses Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10.5px]">
                      <th className="py-3 px-4">Business Entity</th>
                      <th className="py-3 px-3">Owner / Contact</th>
                      <th className="py-3 px-3">TIN & Location</th>
                      <th className="py-3 px-3">Subscription</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredCompanies.map((c) => {
                      const itemCount = allProducts.filter((p) => p.companyId === c.id).length;
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-300 font-black shrink-0">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm">{c.name}</p>
                                <p className="text-[11px] text-slate-400">{c.code} • {c.businessType}</p>
                                <span className="inline-block mt-0.5 text-[10px] text-amber-300/80 font-medium">
                                  {itemCount} isolated items in catalog
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <p className="font-bold text-slate-200">{c.ownerName || 'Store Proprietor'}</p>
                            <p className="text-[11px] text-slate-400">{c.phone}</p>
                            <p className="text-[11px] text-slate-500 truncate max-w-[150px]">{c.email}</p>
                          </td>
                          <td className="py-3.5 px-3">
                            <p className="font-mono text-slate-300 text-[11px]">TIN: {c.tin}</p>
                            <p className="text-[11px] text-slate-400">{c.address}, {c.city}</p>
                            <p className="text-[10px] text-slate-500">Reg: {c.createdAt}</p>
                          </td>
                          <td className="py-3.5 px-3">
                            <p className="font-bold text-slate-200">{c.subscription?.planName || 'Standard'}</p>
                            <p className="text-[11px] text-emerald-400 font-bold">
                              {(c.subscription?.monthlyFee || 0).toLocaleString()} RWF/mo
                            </p>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {c.subscription?.planStatus || 'Paid & Active'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10.5px] font-bold ${
                                c.status === 'Active'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : c.status === 'Suspended'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open workspace */}
                              <button
                                onClick={() => {
                                  setCurrentCompanyId(c.id);
                                  setActiveModule('pos');
                                  window.open('/#webapp', '_blank');
                                }}
                                className="p-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/40 text-emerald-300 transition-colors"
                                title="Open this business workspace in POS"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>

                              {/* View Details */}
                              <button
                                onClick={() => setSelectedCompanyDetails(c)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                title="View Business Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Business */}
                              <button
                                onClick={() => openEditModal(c)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
                                title="Edit Business Account"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Activate / Suspend */}
                              <button
                                onClick={() => {
                                  setStatusConfirmCompany(c);
                                  setPendingStatus(c.status === 'Active' ? 'Suspended' : 'Active');
                                  setStatusReason('');
                                }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                                  c.status === 'Active'
                                    ? 'bg-red-950/60 text-red-300 hover:bg-red-900/80 border border-red-800/40'
                                    : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/80 border border-emerald-800/40'
                                }`}
                              >
                                {c.status === 'Active' ? 'Suspend' : 'Activate'}
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
        {/* TAB 2: CROSS-BUSINESS ITEMS MONITOR                         */}
        {/* ============================================================ */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-300 text-sm">
                  Strict Multi-Business Data Isolation Active
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Every business manages its own items and inventory independently. When Business A creates an item,
                  it belongs exclusively to Business A. Cashiers and staff from Business B cannot see, sell, edit,
                  or delete items belonging to Business A. The Super Admin Owner console monitors inventory across
                  all entities without cross-contamination.
                </p>
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter items by product name, SKU, or barcode..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <select
                  value={inventoryBusinessFilter}
                  onChange={(e) => setInventoryBusinessFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <option value="all">All Businesses Combined</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10.5px]">
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-3">Owning Business</th>
                      <th className="py-3 px-3">SKU / Barcode</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3 text-right">Cost</th>
                      <th className="py-3 px-3 text-right">Selling Price</th>
                      <th className="py-3 px-3 text-center">Stock</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredInventoryItems.map((p) => {
                      const ownerBiz = companies.find((c) => c.id === p.companyId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {p.imageSvg ? (
                                <img
                                  src={p.imageSvg}
                                  alt={p.name}
                                  className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 p-0.5 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-[10px] shrink-0">
                                  {p.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-white text-xs">{p.name}</p>
                                <p className="text-[10px] text-slate-400">{p.brand}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800/40">
                              {ownerBiz?.name || p.companyId || 'Fresh & More'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">
                            <div>{p.sku}</div>
                            <div className="text-slate-500 text-[10px]">{p.barcode}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">{p.category}</td>
                          <td className="py-3 px-3 text-right tabular-nums text-slate-400">
                            {p.costPrice.toLocaleString()} RWF
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums font-bold text-white">
                            {p.sellingPrice.toLocaleString()} RWF
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold tabular-nums ${
                                p.stock <= p.minStock
                                  ? 'bg-red-950/80 text-red-300 border border-red-800/40'
                                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                              }`}
                            >
                              {p.stock} {p.unit}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                                p.status === 'Active'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-700 text-slate-400'
                              }`}
                            >
                              {p.status}
                            </span>
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
        {/* TAB 3: SYSTEM USERS & GOVERNANCE                             */}
        {/* ============================================================ */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-white">System Users & Tenant Assignments</h2>
                <p className="text-xs text-slate-400">Manage employee accounts and their authorized business workspaces</p>
              </div>
              <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-xl">
                {users.length} Total Users
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">Assigned Business</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => {
                    const assignedBiz = companies.find((c) => c.id === u.companyId);
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{u.name}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'Super Admin'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black'
                                : u.role === 'Business Owner'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          <div>{u.email}</div>
                          <div className="text-[10px] text-slate-500">{u.phone}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-300">
                            {u.role === 'Super Admin'
                              ? 'Global Access (All Businesses)'
                              : assignedBiz?.name || u.companyId || 'Fresh & More'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                              u.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                          {u.lastLogin || 'Recent'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: SYSTEM AUDIT LOGS                                     */}
        {/* ============================================================ */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-white">System Security & Authoritative Audit Trail</h2>
                <p className="text-xs text-slate-400">Cryptographically logged events and administrative access records</p>
              </div>
              <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-xl">
                {auditLogs.length} Logged Entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10.5px]">
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-3">Actor / Role</th>
                    <th className="py-3 px-3">Action</th>
                    <th className="py-3 px-3">Module</th>
                    <th className="py-3 px-3">Details / Target</th>
                    <th className="py-3 px-3">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.slice(0, 25).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {log.date}
                      </td>
                      <td className="py-2.5 px-3">
                        <strong className="text-white block">{log.user}</strong>
                        <span className="text-[10px] text-slate-400">{log.role}</span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{log.action}</td>
                      <td className="py-2.5 px-3 text-slate-400">{log.module}</td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">{log.record}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-bold ${
                            log.severity === 'Critical'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : log.severity === 'Warning'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {log.severity || 'Info'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* MODAL: VIEW BUSINESS DETAILS                                  */}
      {/* ============================================================ */}
      {selectedCompanyDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-900/50 border border-purple-500/30 flex items-center justify-center text-purple-300 font-black">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{selectedCompanyDetails.name}</h3>
                  <p className="text-xs text-slate-400">{selectedCompanyDetails.code} • {selectedCompanyDetails.businessType}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCompanyDetails(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block text-[10.5px]">Owner</span>
                <strong className="text-white">{selectedCompanyDetails.ownerName || 'Proprietor'}</strong>
              </div>
              <div className="p-3 bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block text-[10.5px]">TIN Number</span>
                <strong className="text-white font-mono">{selectedCompanyDetails.tin}</strong>
              </div>
              <div className="p-3 bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block text-[10.5px]">Phone</span>
                <strong className="text-white">{selectedCompanyDetails.phone}</strong>
              </div>
              <div className="p-3 bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block text-[10.5px]">Email</span>
                <strong className="text-white truncate block">{selectedCompanyDetails.email}</strong>
              </div>
              <div className="p-3 bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block text-[10.5px]">Address</span>
                <strong className="text-white">{selectedCompanyDetails.address}, {selectedCompanyDetails.city}</strong>
              </div>
              <div className="p-3 bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block text-[10.5px]">Subscription Tier</span>
                <strong className="text-emerald-400">{selectedCompanyDetails.subscription?.planName || 'Standard'}</strong>
              </div>
            </div>

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
              <p className="font-bold text-amber-300">Catalog Isolation</p>
              <p className="text-slate-300">
                This business holds {allProducts.filter((p) => p.companyId === selectedCompanyDetails.id).length} catalog items.
                None of these items are accessible or sellable by any other registered businesses.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedCompanyDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setCurrentCompanyId(selectedCompanyDetails.id);
                  setActiveModule('pos');
                  window.open('/#webapp', '_blank');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                <span>Launch POS Terminal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREATE / EDIT BUSINESS                                */}
      {/* ============================================================ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">
                {editingCompany ? 'Edit Business Details' : 'Register New Business'}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Kigali Fresh Market"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unique Code *</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. KFM-001"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Business Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="Supermarket / Grocery Retail">Supermarket / Grocery Retail</option>
                    <option value="Organic Produce & Daily Mart">Organic Produce & Daily Mart</option>
                    <option value="Mini-Market">Mini-Market</option>
                    <option value="Convenience Store">Convenience Store</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">TIN Number *</label>
                  <input
                    type="text"
                    required
                    value={formTin}
                    onChange={(e) => setFormTin(e.target.value)}
                    placeholder="100000000"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Owner / Proprietor</label>
                  <input
                    type="text"
                    value={formOwner}
                    onChange={(e) => setFormOwner(e.target.value)}
                    placeholder="Owner Full Name"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+250 788 000 000"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Physical Address</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="KG 11 Ave, Kimironko, Kigali"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subscription Plan</label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="Enterprise Growth">Enterprise Growth (120,000 RWF)</option>
                    <option value="Professional Retail">Professional Retail (90,000 RWF)</option>
                    <option value="Standard Business">Standard Business (60,000 RWF)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Monthly License Fee (RWF)</label>
                  <input
                    type="number"
                    value={formMonthlyFee}
                    onChange={(e) => setFormMonthlyFee(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md"
                >
                  {editingCompany ? 'Save Changes' : 'Register Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CONFIRM STATUS CHANGE                                  */}
      {/* ============================================================ */}
      {statusConfirmCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-white">
                Confirm Business {pendingStatus}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to change the status of <strong className="text-white">{statusConfirmCompany.name}</strong> to{' '}
              <strong className={pendingStatus === 'Suspended' ? 'text-red-400' : 'text-emerald-400'}>{pendingStatus}</strong>?
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Reason for Audit Log *</label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g. Account audit reconciliation or owner administrative request"
                rows={2}
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setStatusConfirmCompany(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatusChange}
                className={`px-4 py-2 font-bold text-xs rounded-xl text-white ${
                  pendingStatus === 'Suspended' ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                Confirm {pendingStatus}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
