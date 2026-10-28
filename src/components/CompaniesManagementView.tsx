import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Company, CompanyBranch, ModuleKey, UserRole } from '../types';
import { AccessRestrictedView } from './AccessRestrictedView';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Users,
  MapPin,
  Phone,
  Mail,
  FileText,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Package,
  Layers,
  Edit2,
  UserCheck,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
  Power,
  RotateCcw,
  Store,
  BarChart3,
  Download,
  History,
  ShoppingCart,
  FileBarChart,
  Sliders,
  ChevronRight,
  Sparkles,
  Trash2,
} from 'lucide-react';

const CompaniesManagementContent: React.FC = () => {
  const {
    currentUser,
    companies,
    currentCompanyId,
    setCurrentCompanyId,
    allSales,
    allProducts,
    users,
    auditLogs,
    hasPermission,
    addCompany,
    updateCompany,
    toggleCompanyStatus,
    assignUsersToCompany,
    deleteCompany,
    setActiveModule,
    notify,
  } = useStore();

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState<'directory' | 'analytics' | 'staff_matrix' | 'branches' | 'audit'>('directory');

  // Search & filter for directory
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal states
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [assigningCompany, setAssigningCompany] = useState<Company | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [managingBranchesCompany, setManagingBranchesCompany] = useState<Company | null>(null);

  // Deletion modal state
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [deleteCompanyReason, setDeleteCompanyReason] = useState('Business decommissioned by System Super Admin');
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);

  // Registration Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState('Supermarket & Grocery Retail');
  const [formTin, setFormTin] = useState('');
  const [formPhone, setFormPhone] = useState('+250 788 ');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('Kigali');
  const [formDescription, setFormDescription] = useState('');

  // Branch creation form state
  const [branchFormName, setBranchFormName] = useState('');
  const [branchFormLocation, setBranchFormLocation] = useState('');
  const [branchFormManager, setBranchFormManager] = useState('');
  const [branchFormIsWarehouse, setBranchFormIsWarehouse] = useState(false);

  // Audit filter state
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSeverity, setAuditSeverity] = useState<'All' | 'Info' | 'Warning' | 'Critical'>('All');

  // Branch tab filter
  const [branchCompanyFilter, setBranchCompanyFilter] = useState('All');

  // Compute performance metrics for each company
  const companyMetrics = useMemo(() => {
    const map: Record<
      string,
      {
        revenue: number;
        salesCount: number;
        productCount: number;
        staffCount: number;
        branchCount: number;
        avgOrderValue: number;
      }
    > = {};

    companies.forEach((c) => {
      const cSales = allSales.filter((s) => (s.companyId || 'comp-1') === c.id);
      const cProducts = allProducts.filter((p) => (p.companyId || 'comp-1') === c.id);
      const revenue = cSales.reduce((acc, s) => acc + s.total, 0);
      const staff = c.assignedUserIds ? c.assignedUserIds.length : users.filter((u) => u.companyId === c.id).length;
      const branches = c.branches ? c.branches.length : 1;
      const avgOrder = cSales.length > 0 ? Math.round(revenue / cSales.length) : 0;

      map[c.id] = {
        revenue,
        salesCount: cSales.length,
        productCount: cProducts.length,
        staffCount: staff,
        branchCount: branches,
        avgOrderValue: avgOrder,
      };
    });
    return map;
  }, [companies, allSales, allProducts, users]);

  // Overall Consolidated KPI summaries
  const consolidatedMetrics = useMemo(() => {
    const totalRev = allSales.reduce((acc, s) => acc + s.total, 0);
    const totalItems = allProducts.length;
    const activeCompanies = companies.filter((c) => c.status === 'Active').length;
    const totalBranches = companies.reduce((acc, c) => acc + (c.branches ? c.branches.length : 1), 0);
    const totalStaff = users.length;

    return {
      totalRev,
      totalItems,
      activeCompanies,
      totalCompanies: companies.length,
      totalBranches,
      totalStaff,
      totalSalesCount: allSales.length,
    };
  }, [allSales, allProducts, companies, users]);

  // Filtered company list
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.businessType.toLowerCase().includes(search.toLowerCase()) ||
        c.tin.includes(search) ||
        c.city.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [companies, search, statusFilter]);

  // All branches across all companies
  const allBranchesList = useMemo(() => {
    const list: { company: Company; branch: CompanyBranch }[] = [];
    companies.forEach((c) => {
      if (c.branches && c.branches.length > 0) {
        c.branches.forEach((b) => {
          list.push({ company: c, branch: b });
        });
      }
    });
    return list;
  }, [companies]);

  const filteredBranches = useMemo(() => {
    if (branchCompanyFilter === 'All') return allBranchesList;
    return allBranchesList.filter((item) => item.company.id === branchCompanyFilter);
  }, [allBranchesList, branchCompanyFilter]);

  // Multi-business audit logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const isMultiBiz =
        log.module === 'Multi-Business' ||
        log.module === 'companies' ||
        log.action.toLowerCase().includes('company') ||
        log.action.toLowerCase().includes('business');
      const matchSeverity = auditSeverity === 'All' || log.severity === auditSeverity;
      const matchSearch =
        !auditSearch ||
        log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.record.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.user.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.reason.toLowerCase().includes(auditSearch.toLowerCase());
      return isMultiBiz && matchSeverity && matchSearch;
    });
  }, [auditLogs, auditSearch, auditSeverity]);

  const isSuperAdmin = currentUser.role === 'Super Admin';

  // Handlers
  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      notify('error', 'Validation Error', 'Company name and business code are required.');
      return;
    }

    const success = await addCompany(
      {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        businessType: formType,
        tin: formTin.trim() || `10${Math.floor(1000000 + Math.random() * 9000000)}`,
        phone: formPhone.trim(),
        email: formEmail.trim() || `info@${formCode.toLowerCase()}.rw`,
        address: formAddress.trim() || 'Kigali, Rwanda',
        city: formCity.trim() || 'Kigali',
        country: 'Rwanda',
        currency: 'RWF',
        status: 'Active',
        description: formDescription.trim(),
        branches: [
          {
            id: `br-${Date.now().toString().slice(-3)}`,
            name: `${formName.trim()} Main Headquarters`,
            location: formAddress.trim() || formCity,
            manager: currentUser.name,
          },
        ],
        assignedUserIds: [currentUser.id],
      },
      `System Administrator registered new business entity: ${formName}`
    );

    if (success) {
      setIsRegisterOpen(false);
      setFormName('');
      setFormCode('');
      setFormTin('');
      setFormEmail('');
      setFormAddress('');
      setFormDescription('');
    }
  };

  const handleOpenEdit = (comp: Company) => {
    setEditingCompany(comp);
    setFormName(comp.name);
    setFormCode(comp.code);
    setFormType(comp.businessType);
    setFormTin(comp.tin);
    setFormPhone(comp.phone);
    setFormEmail(comp.email);
    setFormAddress(comp.address);
    setFormCity(comp.city);
    setFormDescription(comp.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    await updateCompany(
      editingCompany.id,
      {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        businessType: formType,
        tin: formTin.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        address: formAddress.trim(),
        city: formCity.trim(),
        description: formDescription.trim(),
      },
      'System Administrator updated company master profile'
    );
    setEditingCompany(null);
  };

  const handleOpenAssign = (comp: Company) => {
    setAssigningCompany(comp);
    setSelectedUserIds(comp.assignedUserIds ? [...comp.assignedUserIds] : []);
  };

  const handleSaveAssignments = async () => {
    if (!assigningCompany) return;
    await assignUsersToCompany(assigningCompany.id, selectedUserIds, 'System Administrator adjusted staff access assignments');
    setAssigningCompany(null);
  };

  const toggleUserAssignment = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleStaffAccess = async (userId: string, companyId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const currentList = user.assignedCompanyIds || (user.companyId ? [user.companyId] : ['comp-1']);
    const hasAccess = currentList.includes(companyId);
    const updatedList = hasAccess ? currentList.filter((id) => id !== companyId) : [...currentList, companyId];

    if (updatedList.length === 0) {
      notify('warning', 'Access Restriction', 'Staff member must have access to at least one active business.');
      return;
    }

    const comp = companies.find((c) => c.id === companyId);
    if (comp) {
      const compStaff = comp.assignedUserIds ? [...comp.assignedUserIds] : [];
      const newCompStaff = hasAccess ? compStaff.filter((id) => id !== userId) : [...compStaff, userId];
      await assignUsersToCompany(companyId, newCompStaff, `Admin toggled access for ${user.name} on ${comp.name}`);
    }
  };

  const handleOpenBranches = (comp: Company) => {
    setManagingBranchesCompany(comp);
    setBranchFormName('');
    setBranchFormLocation('');
    setBranchFormManager(currentUser.name);
    setBranchFormIsWarehouse(false);
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingBranchesCompany || !branchFormName.trim()) return;

    const newBranch: CompanyBranch = {
      id: `br-${Date.now().toString().slice(-4)}`,
      name: branchFormName.trim(),
      location: branchFormLocation.trim() || 'Kigali, Rwanda',
      manager: branchFormManager.trim() || currentUser.name,
      isWarehouse: branchFormIsWarehouse,
    };

    const existingBranches = managingBranchesCompany.branches || [];
    const updatedBranches = [...existingBranches, newBranch];

    await updateCompany(
      managingBranchesCompany.id,
      { branches: updatedBranches },
      `Added branch ${newBranch.name} to ${managingBranchesCompany.name}`
    );

    setManagingBranchesCompany((prev) => (prev ? { ...prev, branches: updatedBranches } : null));
    setBranchFormName('');
    setBranchFormLocation('');
    notify('success', 'Branch Created', `Added ${newBranch.name} to ${managingBranchesCompany.name}`);
  };

  const handleRemoveBranch = async (branchId: string) => {
    if (!managingBranchesCompany) return;
    const existing = managingBranchesCompany.branches || [];
    if (existing.length <= 1) {
      notify('error', 'Cannot Delete', 'Company must maintain at least one primary branch or warehouse.');
      return;
    }

    const updated = existing.filter((b) => b.id !== branchId);
    await updateCompany(
      managingBranchesCompany.id,
      { branches: updated },
      `Removed branch from ${managingBranchesCompany.name}`
    );

    setManagingBranchesCompany((prev) => (prev ? { ...prev, branches: updated } : null));
    notify('info', 'Branch Removed', 'Branch deleted successfully.');
  };

  const handleConfirmDeleteCompany = async () => {
    if (!deletingCompany) return;
    setIsDeletingCompany(true);
    const success = await deleteCompany(
      deletingCompany.id,
      deleteCompanyReason.trim() || 'Business decommissioned by System Super Admin'
    );
    setIsDeletingCompany(false);
    if (success) {
      setDeletingCompany(null);
      setDeleteCompanyReason('Business decommissioned by System Super Admin');
    }
  };

  const handleLaunchModule = (companyId: string, module: ModuleKey) => {
    setCurrentCompanyId(companyId);
    setActiveModule(module);
    const target = companies.find((c) => c.id === companyId);
    notify('info', 'Context Switched', `Active business set to ${target?.name || companyId}. Navigated to ${module.toUpperCase()}.`);
  };

  const exportGroupReportCSV = () => {
    const rows = [
      ['Company Name', 'Code', 'Business Type', 'TIN', 'Status', 'Sales Count', 'Total Revenue (RWF)', 'Avg Basket (RWF)', 'Catalog SKUs', 'Branches Count', 'Staff Count'],
      ...companies.map((c) => {
        const m = companyMetrics[c.id] || { revenue: 0, salesCount: 0, productCount: 0, staffCount: 0, branchCount: 1, avgOrderValue: 0 };
        return [
          c.name,
          c.code,
          c.businessType,
          c.tin,
          c.status,
          m.salesCount,
          m.revenue,
          m.avgOrderValue,
          m.productCount,
          m.branchCount,
          m.staffCount,
        ];
      }),
    ];
    const csv = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = 'consolidated_multibusiness_report.csv';
    link.click();
    notify('success', 'Report Exported', 'Consolidated multi-business analytics exported.');
  };

  const exportAuditCSV = () => {
    const rows = [
      ['Date', 'User', 'Role', 'Action', 'Target Record', 'Reason', 'Severity'],
      ...filteredAuditLogs.map((l) => [l.date, l.user, l.role, l.action, l.record, l.reason, l.severity]),
    ];
    const csv = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = 'multibusiness_audit_trail.csv';
    link.click();
    notify('success', 'Audit Exported', 'Multi-business audit logs exported.');
  };

  return (
    <div className="space-y-5">
      {/* 1. MASTER SYSTEM ADMINISTRATOR CONTROL BANNER */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#0c4a26] text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Super Admin Business Control Hub</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  Super Admin Exclusive
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Governed and controlled exclusively under System Super Admin authority. Centralized multi-company management, branches, staff assignments, and corporate configuration.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setActiveModule('super_admin')}
            className="px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200"
            title="Open Super Admin Dashboard"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
            <span>Super Admin Dashboard</span>
          </button>

          <button
            onClick={() => setCurrentCompanyId(currentCompanyId === 'all' ? 'comp-1' : 'all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              currentCompanyId === 'all'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }`}
            title="Toggle between consolidated group view and single company context"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{currentCompanyId === 'all' ? 'Consolidated Mode Active' : 'Consolidated Group View'}</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0c4a26] hover:bg-[#093a1d] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Business</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. ACTIVE FOCUS & CONTEXT SWITCHER ALERT */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/40 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0c4a26] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0c4a26]">Active System Focus:</span>
              <span className="font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                {currentCompanyId === 'all'
                  ? '🏢 Consolidated Group Mode (All 4 Businesses)'
                  : companies.find((c) => c.id === currentCompanyId)?.name || 'Fresh & More Ltd'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Current operational modules (POS, Inventory, Receiving, Expenses, and Accounting) are isolated to this commercial entity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-slate-500">Quick Switch:</span>
          <select
            value={currentCompanyId}
            onChange={(e) => setCurrentCompanyId(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-[#0c4a26]"
          >
            <option value="all">🏢 All Businesses (Consolidated)</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. CONSOLIDATED KPI METRICS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Companies</p>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#0c4a26] flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
            {consolidatedMetrics.totalCompanies} Businesses
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            {consolidatedMetrics.activeCompanies} active commercial entities
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Group Total Turnover</p>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">
            {consolidatedMetrics.totalRev.toLocaleString()} RWF
          </p>
          <p className="text-[11px] text-blue-700 font-medium mt-1">
            {consolidatedMetrics.totalSalesCount} total sales transactions
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Product SKUs</p>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
            {consolidatedMetrics.totalItems} Items
          </p>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            Across {consolidatedMetrics.totalBranches} retail stores & warehouses
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Active Staff</p>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
            {consolidatedMetrics.totalStaff} Users
          </p>
          <p className="text-[11px] text-purple-700 font-medium mt-1">
            Governed by Role-Based Access Control
          </p>
        </div>
      </div>

      {/* 4. MASTER CONTROL CENTER TABS NAVIGATION */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-[#0c4a26] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Businesses & Operations ({companies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-[#0c4a26] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Consolidated Analytics & Compare</span>
        </button>

        <button
          onClick={() => setActiveTab('staff_matrix')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'staff_matrix'
              ? 'bg-[#0c4a26] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Cross-Company Staff Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'branches'
              ? 'bg-[#0c4a26] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Branches & Warehouses ({consolidatedMetrics.totalBranches})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-[#0c4a26] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Multi-Business Audit Trail</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: BUSINESSES & OPERATIONAL CONTROL DIRECTORY            */}
      {/* ============================================================ */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search company name, code, business type, or TIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0c4a26]"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Status filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['All', 'Active', 'Inactive'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Table
                </button>
              </div>
            </div>
          </div>

          {/* Directory Cards */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCompanies.map((c) => {
                const metrics = companyMetrics[c.id] || {
                  revenue: 0,
                  salesCount: 0,
                  productCount: 0,
                  staffCount: 0,
                  branchCount: 1,
                  avgOrderValue: 0,
                };
                const isCurrentlyActive = currentCompanyId === c.id;

                return (
                  <div
                    key={c.id}
                    className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                      isCurrentlyActive
                        ? 'border-[#0c4a26] ring-2 ring-emerald-600/20 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-700 to-green-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                            {c.code.slice(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h2 className="text-sm font-bold text-slate-900 leading-tight">{c.name}</h2>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">{c.businessType}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {c.status}
                          </span>
                          {isCurrentlyActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0c4a26] text-white">
                              Active Focus
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {c.description && <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>}

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/80 rounded-xl text-xs text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">TIN / REG</span>
                          <span className="font-mono font-semibold text-slate-800">{c.tin}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Headquarters</span>
                          <span className="truncate block font-medium text-slate-800">{c.address}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Contact Phone</span>
                          <span className="font-medium text-slate-800">{c.phone}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Currency</span>
                          <span className="font-bold text-slate-900">{c.currency}</span>
                        </div>
                      </div>

                      {/* Branch Badges */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          Branches & Facilities ({c.branches?.length || 1}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {c.branches?.map((b) => (
                            <span
                              key={b.id}
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                b.isWarehouse ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <Store className="w-3 h-3 text-slate-500" />
                              <span>{b.name}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Operational Metrics Cards */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                        <div className="p-2 bg-emerald-50/50 rounded-lg">
                          <span className="text-[10px] text-slate-500 block font-medium">Recorded Sales</span>
                          <span className="font-bold text-xs text-[#0c4a26] tabular-nums">
                            {metrics.revenue.toLocaleString()} RWF
                          </span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg">
                          <span className="text-[10px] text-slate-500 block font-medium">Catalog SKUs</span>
                          <span className="font-bold text-xs text-slate-800">{metrics.productCount} Items</span>
                        </div>
                        <div className="p-2 bg-blue-50/50 rounded-lg">
                          <span className="text-[10px] text-slate-500 block font-medium">Assigned Staff</span>
                          <span className="font-bold text-xs text-blue-800">{metrics.staffCount} users</span>
                        </div>
                      </div>

                      {/* System Admin Quick Action Launchers */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          Quick Module Access in {c.code}:
                        </span>
                        <div className="grid grid-cols-3 gap-1.5 text-xs">
                          <button
                            onClick={() => handleLaunchModule(c.id, 'pos')}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0c4a26] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title={`Open POS in ${c.name}`}
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Launch POS</span>
                          </button>
                          <button
                            onClick={() => handleLaunchModule(c.id, 'products')}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title={`Open Catalog in ${c.name}`}
                          >
                            <Package className="w-3.5 h-3.5" />
                            <span>Inventory</span>
                          </button>
                          <button
                            onClick={() => handleLaunchModule(c.id, 'reports')}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title={`Open Reports in ${c.name}`}
                          >
                            <FileBarChart className="w-3.5 h-3.5" />
                            <span>Reports</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-4">
                      <button
                        onClick={() => setCurrentCompanyId(c.id)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isCurrentlyActive
                            ? 'bg-emerald-100 text-[#0c4a26] border border-emerald-300'
                            : 'bg-[#0c4a26] text-white hover:bg-[#093a1d] shadow-2xs'
                        }`}
                      >
                        <span>{isCurrentlyActive ? 'Currently Active Focus' : 'Switch Context to this Company'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {isSuperAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenAssign(c)}
                            className="p-2 rounded-xl text-slate-600 hover:text-[#0c4a26] hover:bg-slate-100 cursor-pointer"
                            title="Assign Staff Members"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenBranches(c)}
                            className="p-2 rounded-xl text-slate-600 hover:text-amber-700 hover:bg-amber-50 cursor-pointer"
                            title="Manage Physical Branches & Warehouses"
                          >
                            <Store className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                            title="Edit Company Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleCompanyStatus(c.id, 'System Administrator toggled status')}
                            className={`p-2 rounded-xl cursor-pointer ${
                              c.status === 'Active'
                                ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                            }`}
                            title={c.status === 'Active' ? 'Deactivate Company' : 'Activate Company'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (companies.length <= 1) {
                                notify('error', 'Action Prohibited', 'Cannot delete the only registered company. The system requires at least one company.');
                                return;
                              }
                              setDeletingCompany(c);
                              setDeleteCompanyReason('Business decommissioned by System Super Admin');
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Permanently Delete Business Entity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Directory Table */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                      <th className="p-3.5">Company & Code</th>
                      <th className="p-3.5">Business Type</th>
                      <th className="p-3.5">TIN</th>
                      <th className="p-3.5">Headquarters</th>
                      <th className="p-3.5 text-right">Revenue (RWF)</th>
                      <th className="p-3.5 text-center">SKUs</th>
                      <th className="p-3.5 text-center">Branches</th>
                      <th className="p-3.5 text-center">Staff</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCompanies.map((c) => {
                      const metrics = companyMetrics[c.id] || {
                        revenue: 0,
                        salesCount: 0,
                        productCount: 0,
                        staffCount: 0,
                        branchCount: 1,
                        avgOrderValue: 0,
                      };
                      const isCurrentlyActive = currentCompanyId === c.id;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#0c4a26] text-white font-bold flex items-center justify-center text-xs">
                                {c.code.slice(0, 3)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{c.name}</p>
                                <span className="font-mono text-[10px] text-slate-400">{c.code}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-600 font-medium">{c.businessType}</td>
                          <td className="p-3.5 font-mono text-slate-600">{c.tin}</td>
                          <td className="p-3.5 text-slate-600">{c.city}</td>
                          <td className="p-3.5 text-right font-bold text-slate-900 tabular-nums">
                            {metrics.revenue.toLocaleString()} RWF
                          </td>
                          <td className="p-3.5 text-center font-bold text-slate-700">{metrics.productCount}</td>
                          <td className="p-3.5 text-center font-bold text-slate-700">{metrics.branchCount}</td>
                          <td className="p-3.5 text-center font-bold text-slate-700">{metrics.staffCount}</td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                c.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setCurrentCompanyId(c.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  isCurrentlyActive
                                    ? 'bg-emerald-100 text-[#0c4a26]'
                                    : 'bg-[#0c4a26] text-white hover:bg-[#093a1d]'
                                }`}
                              >
                                {isCurrentlyActive ? 'Active' : 'Switch'}
                              </button>
                              {isSuperAdmin && (
                                <>
                                  <button
                                    onClick={() => handleOpenAssign(c)}
                                    className="p-1 text-slate-500 hover:text-slate-900"
                                    title="Assign Staff"
                                  >
                                    <Users className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenBranches(c)}
                                    className="p-1 text-slate-500 hover:text-amber-700"
                                    title="Manage Branches"
                                  >
                                    <Store className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEdit(c)}
                                    className="p-1 text-slate-500 hover:text-slate-900"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (companies.length <= 1) {
                                        notify('error', 'Action Prohibited', 'Cannot delete the only registered company. The system requires at least one company.');
                                        return;
                                      }
                                      setDeletingCompany(c);
                                      setDeleteCompanyReason('Business decommissioned by System Super Admin');
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                    title="Permanently Delete Business Entity"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: CONSOLIDATED GROUP ANALYTICS & COMPARISON             */}
      {/* ============================================================ */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Multi-Business Cross-Company Performance Benchmark</h2>
              <p className="text-xs text-slate-500">
                Compare commercial turnover, sales volume, basket metrics, and SKU breadth across all corporate entities.
              </p>
            </div>
            <button
              onClick={exportGroupReportCSV}
              className="px-3.5 py-2 bg-[#0c4a26] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-[#093a1d] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Group CSV Report</span>
            </button>
          </div>

          {/* Revenue Contribution Visual Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">Group Revenue Contribution Breakdown</span>
              <span className="text-slate-500 font-mono font-bold">
                Total: {consolidatedMetrics.totalRev.toLocaleString()} RWF
              </span>
            </div>

            {/* Visual stacked bar */}
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              {companies.map((c, idx) => {
                const rev = companyMetrics[c.id]?.revenue || 0;
                const pct = consolidatedMetrics.totalRev > 0 ? (rev / consolidatedMetrics.totalRev) * 100 : 0;
                const colors = ['bg-[#0c4a26]', 'bg-blue-600', 'bg-amber-500', 'bg-purple-600', 'bg-teal-600'];
                return (
                  <div
                    key={c.id}
                    style={{ width: `${pct}%` }}
                    className={`${colors[idx % colors.length]} h-full transition-all`}
                    title={`${c.name}: ${pct.toFixed(1)}% (${rev.toLocaleString()} RWF)`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
              {companies.map((c, idx) => {
                const rev = companyMetrics[c.id]?.revenue || 0;
                const pct = consolidatedMetrics.totalRev > 0 ? ((rev / consolidatedMetrics.totalRev) * 100).toFixed(1) : '0';
                const dotColors = ['bg-[#0c4a26]', 'bg-blue-600', 'bg-amber-500', 'bg-purple-600', 'bg-teal-600'];
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${dotColors[idx % dotColors.length]} shrink-0`} />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate text-[11px]">{c.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {pct}% ({rev.toLocaleString()} RWF)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Benchmark Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <th className="p-3.5">Company</th>
                    <th className="p-3.5">Business Code</th>
                    <th className="p-3.5 text-right">Revenue (RWF)</th>
                    <th className="p-3.5 text-right">Revenue Share</th>
                    <th className="p-3.5 text-right">Transactions</th>
                    <th className="p-3.5 text-right">Avg Basket (RWF)</th>
                    <th className="p-3.5 text-center">Catalog SKUs</th>
                    <th className="p-3.5 text-center">Branches</th>
                    <th className="p-3.5 text-center">Staff Count</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companies.map((c) => {
                    const m = companyMetrics[c.id] || {
                      revenue: 0,
                      salesCount: 0,
                      productCount: 0,
                      staffCount: 0,
                      branchCount: 1,
                      avgOrderValue: 0,
                    };
                    const share =
                      consolidatedMetrics.totalRev > 0 ? ((m.revenue / consolidatedMetrics.totalRev) * 100).toFixed(1) : '0';

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="p-3.5 font-bold text-slate-900">{c.name}</td>
                        <td className="p-3.5 font-mono text-slate-500">{c.code}</td>
                        <td className="p-3.5 text-right font-extrabold text-[#0c4a26] tabular-nums">
                          {m.revenue.toLocaleString()} RWF
                        </td>
                        <td className="p-3.5 text-right font-semibold text-slate-700">{share}%</td>
                        <td className="p-3.5 text-right font-medium text-slate-700">{m.salesCount}</td>
                        <td className="p-3.5 text-right font-mono text-slate-800 tabular-nums">
                          {m.avgOrderValue.toLocaleString()} RWF
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-800">{m.productCount}</td>
                        <td className="p-3.5 text-center font-bold text-slate-800">{m.branchCount}</td>
                        <td className="p-3.5 text-center font-bold text-slate-800">{m.staffCount}</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {c.status}
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
      {/* TAB 3: CROSS-COMPANY STAFF ACCESS MATRIX                     */}
      {/* ============================================================ */}
      {activeTab === 'staff_matrix' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900">Staff Authorization & Cross-Company Access Matrix</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control which employees and managers have operational access to each business entity. Super Administrators automatically hold system-wide master clearance.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <th className="p-3.5">Staff User</th>
                    <th className="p-3.5">System Role</th>
                    <th className="p-3.5">Primary Branch</th>
                    {companies.map((c) => (
                      <th key={c.id} className="p-3.5 text-center">
                        <div>
                          <p className="font-bold text-slate-800">{c.code}</p>
                          <span className="text-[10px] text-slate-400 font-normal">{c.name.split(' ')[0]}</span>
                        </div>
                      </th>
                    ))}
                    <th className="p-3.5 text-right">Authorized Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const assignedList = u.assignedCompanyIds || (u.companyId ? [u.companyId] : ['comp-1']);
                    const isGlobalAdmin = u.role === 'Super Admin';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{u.name}</p>
                              <span className="text-[10px] text-slate-400">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'Super Admin'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'Business Owner'
                                ? 'bg-blue-100 text-blue-800'
                                : u.role === 'Manager'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">{u.branch}</td>

                        {companies.map((c) => {
                          const hasAccess = isGlobalAdmin || assignedList.includes(c.id);

                          return (
                            <td key={c.id} className="p-3.5 text-center">
                              <button
                                disabled={!isSuperAdmin || isGlobalAdmin}
                                onClick={() => handleToggleStaffAccess(u.id, c.id)}
                                className={`w-6 h-6 rounded-md inline-flex items-center justify-center transition-all ${
                                  hasAccess
                                    ? 'bg-[#0c4a26] text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                                } ${isGlobalAdmin ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                                title={
                                  isGlobalAdmin
                                    ? 'Super Admin has global authorization across all businesses'
                                    : hasAccess
                                    ? `Revoke access to ${c.name}`
                                    : `Grant access to ${c.name}`
                                }
                              >
                                {hasAccess && <Check className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                          );
                        })}

                        <td className="p-3.5 text-right font-bold text-slate-800">
                          {isGlobalAdmin ? 'All (Global)' : `${assignedList.length} Businesses`}
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
      {/* TAB 4: PHYSICAL BRANCHES & WAREHOUSES MANAGER                */}
      {/* ============================================================ */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Store Branches & Logistics Depots Directory</h2>
              <p className="text-xs text-slate-500">
                Manage retail storefronts, minimarkets, and central storage warehouses assigned across your commercial network.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Filter Company:</span>
              <select
                value={branchCompanyFilter}
                onChange={(e) => setBranchCompanyFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
              >
                <option value="All">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredBranches.map((item) => (
              <div
                key={`${item.company.id}-${item.branch.id}`}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {item.company.name}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 mt-1 flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-slate-500" />
                        <span>{item.branch.name}</span>
                      </h3>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.branch.isWarehouse
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {item.branch.isWarehouse ? 'Warehouse' : 'Retail Branch'}
                    </span>
                  </div>

                  <div className="mt-3 p-2.5 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.branch.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Manager: <strong className="text-slate-800">{item.branch.manager}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">ID: {item.branch.id}</span>
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleOpenBranches(item.company)}
                      className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
                    >
                      Manage Company Branches
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: MULTI-BUSINESS COMPLIANCE AUDIT TRAIL                 */}
      {/* ============================================================ */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit actions, target records, reasons..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0c4a26]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditSeverity}
                onChange={(e) => setAuditSeverity(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="All">All Severities</option>
                <option value="Info">Info</option>
                <option value="Warning">Warning</option>
                <option value="Critical">Critical</option>
              </select>

              <button
                onClick={exportAuditCSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Administrator</th>
                    <th className="p-3.5">Action Executed</th>
                    <th className="p-3.5">Target Business Entity</th>
                    <th className="p-3.5">Justification / Reason</th>
                    <th className="p-3.5 text-center">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No multi-business audit records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">{log.date}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 block">{log.user}</span>
                          <span className="text-[10px] text-slate-400">{log.role}</span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{log.action}</td>
                        <td className="p-3.5 text-slate-800">{log.record}</td>
                        <td className="p-3.5 text-slate-600 max-w-xs truncate">{log.reason}</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.severity === 'Critical'
                                ? 'bg-red-100 text-red-800'
                                : log.severity === 'Warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            {log.severity}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS                                                       */}
      {/* ============================================================ */}

      {/* MODAL 1: REGISTER NEW BUSINESS */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-[#0c4a26] rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Register New Business Entity</h3>
                  <p className="text-[11px] text-slate-400">Establish and provision a commercial enterprise</p>
                </div>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterCompany} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Company / Legal Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kigali Fresh Mini-Mart Ltd"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0c4a26]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Short Business Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KFM-KGL"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="Supermarket & Grocery Retail">Supermarket & Grocery Retail</option>
                    <option value="FMCG Wholesale & Bulk Distribution">FMCG Wholesale & Bulk Distribution</option>
                    <option value="Fresh Produce & Cold Chain Hub">Fresh Produce & Cold Chain Hub</option>
                    <option value="Bakery & Delicatessen Specialty">Bakery & Delicatessen Specialty</option>
                    <option value="Neighborhood Express Mart">Neighborhood Express Mart</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">TIN / Tax Identification</label>
                  <input
                    type="text"
                    placeholder="e.g. 109882310"
                    value={formTin}
                    onChange={(e) => setFormTin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Headquarters Address</label>
                  <input
                    type="text"
                    placeholder="e.g. KG 17 Ave, Remera, Kigali"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Business Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of operations, target market, or products..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none"
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

      {/* MODAL 2: EDIT COMPANY PROFILE */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-[#0c4a26] rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Configure Business Profile</h3>
                  <p className="text-[11px] text-slate-400">Edit {editingCompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCompany(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">TIN</label>
                  <input
                    type="text"
                    value={formTin}
                    onChange={(e) => setFormTin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Headquarters Address</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0c4a26] hover:bg-[#093a1d] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ASSIGN USERS TO COMPANY */}
      {assigningCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Assign Staff Access</h3>
                  <p className="text-[11px] text-slate-400">Select which staff members can access {assigningCompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setAssigningCompany(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {users.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);

                return (
                  <div
                    key={u.id}
                    onClick={() => toggleUserAssignment(u.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{u.name}</p>
                        <span className="text-[10px] text-slate-500">
                          {u.role} · {u.branch}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">{selectedUserIds.length} users authorized</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAssigningCompany(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAssignments}
                  className="px-4 py-1.5 bg-[#0c4a26] hover:bg-[#093a1d] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Assignments
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MANAGE COMPANY BRANCHES & WAREHOUSES */}
      {managingBranchesCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-800 rounded-xl">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Manage Branches & Facilities</h3>
                  <p className="text-[11px] text-slate-400">{managingBranchesCompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setManagingBranchesCompany(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing branches list */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Existing Locations:</span>
              {(managingBranchesCompany.branches || []).map((b) => (
                <div
                  key={b.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{b.name}</p>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          b.isWarehouse ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {b.isWarehouse ? 'Warehouse' : 'Store'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {b.location} · Manager: {b.manager}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveBranch(b.id)}
                    className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg cursor-pointer"
                    title="Delete branch"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Form to add branch */}
            <form onSubmit={handleAddBranch} className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-[#0c4a26] block">+ Add New Physical Location</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Branch Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Remera Express"
                    value={branchFormName}
                    onChange={(e) => setBranchFormName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Location / Address</label>
                  <input
                    type="text"
                    placeholder="e.g. KG 11 Ave"
                    value={branchFormLocation}
                    onChange={(e) => setBranchFormLocation(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Assigned Manager</label>
                  <input
                    type="text"
                    placeholder="Manager Name"
                    value={branchFormManager}
                    onChange={(e) => setBranchFormManager(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="isWarehouse"
                    checked={branchFormIsWarehouse}
                    onChange={(e) => setBranchFormIsWarehouse(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0c4a26]"
                  />
                  <label htmlFor="isWarehouse" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Central Storage Warehouse
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#0c4a26] text-white rounded-lg text-xs font-bold hover:bg-[#093a1d] cursor-pointer"
                >
                  Add Location
                </button>
              </div>
            </form>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setManagingBranchesCompany(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Business Confirmation Modal */}
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
                <span>Are you sure you want to delete this business?</span>
              </div>
              <p className="text-red-700 leading-relaxed text-[11px]">
                This will permanently delete the corporate entity <strong className="text-red-900">{deletingCompany.name}</strong> (Code: <strong className="text-red-900">{deletingCompany.code}</strong>, TIN: {deletingCompany.tin}). Associated configurations will be cleared and active operations will be reassigned. This action cannot be undone.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deletion Reason (Audit Log)
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
    </div>
  );
};

export const CompaniesManagementView: React.FC = () => {
  const { currentUser, hasPermission } = useStore();

  if (currentUser.role !== 'Super Admin' || !hasPermission('companies', 'view')) {
    return <AccessRestrictedView moduleName="companies" requiredAction="view" />;
  }

  return <CompaniesManagementContent />;
};
