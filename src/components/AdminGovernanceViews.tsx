import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { UserRole, ModuleKey, PermissionAction, Sale, UserAccount } from '../types';
import { ConfirmDialog, ReceiptModal, ConfirmActionModal } from './SharedModals';
import { AccessRestrictedView } from './AccessRestrictedView';
import { ROLE_METADATA_LIST, ALL_MODULES } from '../data/initialData';
import { timeSync } from '../services/timeSyncService';
import {
  FileText,
  Users,
  ShieldCheck,
  Settings,
  Download,
  Calendar,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Database,
  Lock,
  Plus,
  Edit2,
  X,
  UserCheck,
  UserX,
  KeyRound,
  Shield,
  Layers,
  ChevronDown,
  ChevronRight,
  Filter,
  Check,
  Slash,
  Eye,
  Info,
  Clock,
  Sparkles,
  Trash2,
  Phone,
  Mail,
  ClipboardList,
  UserPlus,
  ShoppingBag,
  TrendingUp,
  Package,
  BarChart2,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const {
    sales,
    products,
    categories,
    expenses,
    purchaseOrders,
    attendanceRecords,
    clockInStaff,
    clockOutStaff,
    deleteAttendanceRecord,
    hasPermission,
    canViewCostPrice,
    canViewGrossProfit,
    currentUser,
    deleteSale,
    todayString,
    yesterdayString,
    timeZone,
    timeFormat,
    currentTime,
    formatDate,
    formatTime,
    syncStatus,
  } = useStore();
  const [activeTab, setActiveTab] = useState<'sales' | 'items_sold' | 'inventory' | 'attendance'>('sales');
  const [salesDateFilter, setSalesDateFilter] = useState<'All' | 'Today' | 'Yesterday' | 'Last 7 Days' | 'This Month'>('All');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);

  // Items Sold specific filters
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('All');
  const [itemSortBy, setItemSortBy] = useState<'revenue' | 'qty' | 'profit' | 'name'>('revenue');

  if (!hasPermission('reports', 'view')) {
    return <AccessRestrictedView moduleName="reports" requiredAction="view" />;
  }

  const isStockManager = currentUser.role === 'Stock Manager';
  const effectiveTab = isStockManager ? 'inventory' : activeTab;

  const filteredSales = useMemo(() => {
    if (salesDateFilter === 'Today') {
      return sales.filter((s) => s.date === todayString);
    }
    if (salesDateFilter === 'Yesterday') {
      return sales.filter((s) => s.date === yesterdayString);
    }
    if (salesDateFilter === 'Last 7 Days') {
      const sevenDaysAgo = timeSync.getDateDaysAgo(6, timeZone);
      return sales.filter((s) => s.date >= sevenDaysAgo && s.date <= todayString);
    }
    if (salesDateFilter === 'This Month') {
      const monthPrefix = todayString.slice(0, 7);
      return sales.filter((s) => s.date.startsWith(monthPrefix));
    }
    return sales;
  }, [sales, salesDateFilter, todayString, yesterdayString, timeZone]);

  const itemsSoldData = useMemo(() => {
    const map = new Map<string, {
      productId: string;
      productName: string;
      sku: string;
      category: string;
      unit: string;
      totalQty: number;
      totalRevenue: number;
      totalCost: number;
      transactionCount: number;
    }>();

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const sale of filteredSales) {
      if (sale.status === 'Cancelled' || sale.status === 'Refunded') continue;
      const seenInSale = new Set<string>();

      for (const item of sale.items) {
        const prod = productMap.get(item.productId);
        const category = prod?.category || 'General';
        const unit = item.unit || prod?.unit || 'pcs';
        const sku = item.sku || prod?.sku || '—';
        const costPrice = item.costPrice ?? prod?.costPrice ?? 0;
        const itemRevenue = item.total ?? (item.qty * item.unitPrice);
        const itemCost = item.qty * costPrice;

        const existing = map.get(item.productId);
        if (existing) {
          existing.totalQty += item.qty;
          existing.totalRevenue += itemRevenue;
          existing.totalCost += itemCost;
          if (!seenInSale.has(item.productId)) {
            existing.transactionCount += 1;
            seenInSale.add(item.productId);
          }
        } else {
          map.set(item.productId, {
            productId: item.productId,
            productName: item.productName || prod?.name || 'Item',
            sku,
            category,
            unit,
            totalQty: item.qty,
            totalRevenue: itemRevenue,
            totalCost: itemCost,
            transactionCount: 1,
          });
          seenInSale.add(item.productId);
        }
      }
    }

    let list = Array.from(map.values());

    if (itemCategoryFilter !== 'All') {
      list = list.filter((i) => i.category.toLowerCase() === itemCategoryFilter.toLowerCase());
    }

    if (itemSearchQuery.trim()) {
      const q = itemSearchQuery.toLowerCase();
      list = list.filter((i) =>
        i.productName.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (itemSortBy === 'qty') return b.totalQty - a.totalQty;
      if (itemSortBy === 'profit') return (b.totalRevenue - b.totalCost) - (a.totalRevenue - a.totalCost);
      if (itemSortBy === 'name') return a.productName.localeCompare(b.productName);
      return b.totalRevenue - a.totalRevenue;
    });

    const totalQtySold = list.reduce((sum, i) => sum + i.totalQty, 0);
    const totalGrossRevenue = list.reduce((sum, i) => sum + i.totalRevenue, 0);
    const totalCostOfSold = list.reduce((sum, i) => sum + i.totalCost, 0);
    const totalGrossProfit = totalGrossRevenue - totalCostOfSold;
    const grossMarginPercent = totalGrossRevenue > 0 ? (totalGrossProfit / totalGrossRevenue) * 100 : 0;

    return {
      items: list,
      totalQtySold,
      totalGrossRevenue,
      totalCostOfSold,
      totalGrossProfit,
      grossMarginPercent,
    };
  }, [filteredSales, products, itemCategoryFilter, itemSearchQuery, itemSortBy]);

  const exportItemsSoldCSV = () => {
    if (!hasPermission('reports', 'export')) return;
    const rows = [
      ['Product Name', 'SKU', 'Category', 'Quantity Sold', 'Unit', 'Total Revenue (RWF)', 'Transactions'],
      ...itemsSoldData.items.map((i) => [
        `"${i.productName.replace(/"/g, '""')}"`,
        i.sku,
        i.category,
        i.totalQty,
        i.unit,
        i.totalRevenue,
        i.transactionCount,
      ]),
    ];
    const csv = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `fresh_and_more_items_sold_${todayString}.csv`;
    link.click();
  };

  const exportSalesCSV = () => {
    if (!hasPermission('reports', 'export')) return;
    const rows = [
      ['Ref', 'Date', 'Time', 'Customer', 'Payment Method', 'Total (RWF)', 'Status'],
      ...filteredSales.map((s) => [s.reference, s.date, s.time, s.customerName, s.paymentMethod, s.total, s.status]),
    ];
    const csv = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `fresh_and_more_sales_report_${todayString}.csv`;
    link.click();
  };

  const exportAttendanceCSV = () => {
    const rows = [
      ['Staff Member', 'Role', 'Branch', 'Date', 'Clock In', 'Clock Out', 'Status', 'Method', 'Notes'],
      ...attendanceRecords.map((a) => [
        a.userName,
        a.role,
        a.branch,
        a.date,
        a.clockInTime,
        a.clockOutTime || 'Active Shift',
        a.status,
        a.method,
        a.notes || '',
      ]),
    ];
    const csv = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `fresh_and_more_staff_attendance_${todayString}.csv`;
    link.click();
  };

  const myActiveShift = attendanceRecords.find(
    (a) => a.userId === currentUser.id && a.date === todayString && a.status === 'Clocked In'
  );

  return (
    <div className="space-y-4">
      {/* Real-Time Synchronized Generation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Business Reports & Analytics</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Clock className="w-3 h-3 text-emerald-700 animate-pulse" />
              <span>{formatTime(currentTime, timeFormat, true)}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized with <strong className="text-slate-700">{timeZone}</strong> ({formatDate(currentTime, { weekday: 'short', includeYear: true })}) · {syncStatus === 'synced' ? 'Authoritative Network Time' : 'Calibrated Local Fallback'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {effectiveTab === 'sales' && hasPermission('reports', 'export') && !isStockManager && (
            <button
              onClick={exportSalesCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Sales CSV</span>
            </button>
          )}
          {effectiveTab === 'items_sold' && hasPermission('reports', 'export') && !isStockManager && (
            <button
              onClick={exportItemsSoldCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0f532b] hover:bg-[#0c4a26] rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Items Sold CSV</span>
            </button>
          )}
          {effectiveTab === 'attendance' && (
            <button
              onClick={exportAttendanceCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Attendance CSV</span>
            </button>
          )}
        </div>
      </div>

      {!isStockManager && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('sales')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                effectiveTab === 'sales' ? 'bg-[#0f532b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Sales Transactions ({filteredSales.length})
            </button>
            <button
              onClick={() => setActiveTab('items_sold')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 ${
                effectiveTab === 'items_sold' ? 'bg-[#0f532b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Items Sold Report ({itemsSoldData.items.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                effectiveTab === 'inventory' ? 'bg-[#0f532b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Inventory Valuation
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 ${
                effectiveTab === 'attendance' ? 'bg-[#0f532b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Staff Attendance Shifts ({attendanceRecords.length})</span>
            </button>
          </div>

          {(effectiveTab === 'sales' || effectiveTab === 'items_sold') && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] font-medium text-slate-400 mr-1">Period:</span>
              {(['All', 'Today', 'Yesterday', 'Last 7 Days', 'This Month'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSalesDateFilter(period)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    salesDateFilter === period
                      ? 'bg-emerald-100 text-[#0c4a26] font-bold border border-emerald-300'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {effectiveTab === 'attendance' && !isStockManager && (
        <div className="space-y-4">
          {/* Quick Staff Punch-In / Punch-Out Card */}
          <div className="bg-gradient-to-r from-emerald-900 via-[#0c4a26] to-[#166534] text-white p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-emerald-300">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs text-emerald-200 font-medium">Synchronized Shift Time Clock</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xl font-extrabold tabular-nums">
                    {formatTime(currentTime, timeFormat, true)}
                  </span>
                  <span className="text-xs text-emerald-100/80">({timeZone})</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {myActiveShift ? (
                <button
                  onClick={() => clockOutStaff()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Clock Out (In at {myActiveShift.clockInTime})
                </button>
              ) : (
                <button
                  onClick={() => clockInStaff()}
                  className="px-4 py-2 bg-white hover:bg-emerald-50 text-[#0c4a26] font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Clock In Now ({currentUser.name})
                </button>
              )}
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b font-semibold text-slate-500">
                  <th className="p-3">Staff Member</th>
                  <th className="p-3">Role & Branch</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Clock In</th>
                  <th className="p-3">Clock Out</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Status</th>
                  {(currentUser.role === 'Super Admin' || currentUser.role === 'Manager') && (
                    <th className="p-3 text-right">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceRecords.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70">
                    <td className="p-3 font-bold text-slate-900">{a.userName}</td>
                    <td className="p-3 text-slate-600">
                      <p className="font-medium">{a.role}</p>
                      <p className="text-[10px] text-slate-400">{a.branch}</p>
                    </td>
                    <td className="p-3 font-mono text-slate-700">{a.date}</td>
                    <td className="p-3 font-mono font-bold text-emerald-700">{a.clockInTime}</td>
                    <td className="p-3 font-mono text-slate-600">{a.clockOutTime || '— Active Shift —'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                        {a.method}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          a.status === 'Clocked In'
                            ? 'bg-emerald-100 text-[#0c4a26] border border-emerald-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    {(currentUser.role === 'Super Admin' || currentUser.role === 'Manager') && (
                      <td className="p-3 text-right">
                        <button
                          onClick={() => deleteAttendanceRecord(a.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                          title="Delete Attendance Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {effectiveTab === 'sales' && !isStockManager && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b font-semibold text-slate-500">
                <th className="p-3">Ref</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Payment</th>
                <th className="p-3 text-right">Items</th>
                <th className="p-3 text-right">Total Amount</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-mono font-bold text-slate-800">{s.reference}</td>
                  <td className="p-3 text-slate-500">{s.date} {s.time}</td>
                  <td className="p-3 font-medium text-slate-700">{s.customerName}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {s.paymentMethod}
                    </span>
                  </td>
                  <td className="p-3 text-right text-slate-600">{s.items.length}</td>
                  <td className="p-3 text-right font-bold text-slate-900 tabular-nums">
                    {s.total.toLocaleString()} RWF
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedSaleForReceipt(s)}
                        className="px-2 py-1 text-slate-600 hover:text-emerald-700 font-semibold cursor-pointer"
                      >
                        Receipt
                      </button>
                      {(hasPermission('reports', 'delete') || hasPermission('pos', 'delete')) && (
                        <button
                          onClick={() => setDeletingSale(s)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                          title="Delete / Void Sale"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {effectiveTab === 'items_sold' && !isStockManager && (
        <div className="space-y-4">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Total Quantity Sold</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#0c4a26] flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 tabular-nums">
                {itemsSoldData.totalQtySold.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Units sold in period</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Gross Items Revenue</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-emerald-700 tabular-nums">
                {itemsSoldData.totalGrossRevenue.toLocaleString()} <span className="text-xs font-bold text-slate-500">RWF</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Total collected value</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Active Product Lines</span>
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 tabular-nums">
                {itemsSoldData.items.length}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Distinct items moved</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Est. Gross Profit</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
              </div>
              {canViewGrossProfit() ? (
                <>
                  <div className="text-xl font-black text-slate-900 tabular-nums">
                    {itemsSoldData.totalGrossProfit.toLocaleString()} <span className="text-xs font-bold text-slate-500">RWF</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {itemsSoldData.grossMarginPercent.toFixed(1)}% Margin
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-xs font-semibold text-slate-400 mt-1">Restricted by Role</div>
              )}
            </div>
          </div>

          {/* Search, Category Filter, and Sort Controls */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  placeholder="Search sold item by name, SKU, or category..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f532b] focus:bg-white"
                />
              </div>

              <select
                value={itemCategoryFilter}
                onChange={(e) => setItemCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f532b] cursor-pointer"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 text-[11px] font-medium">Sort by:</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setItemSortBy('revenue')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    itemSortBy === 'revenue' ? 'bg-white text-[#0c4a26] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Revenue
                </button>
                <button
                  type="button"
                  onClick={() => setItemSortBy('qty')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    itemSortBy === 'qty' ? 'bg-white text-[#0c4a26] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Quantity
                </button>
                {canViewGrossProfit() && (
                  <button
                    type="button"
                    onClick={() => setItemSortBy('profit')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      itemSortBy === 'profit' ? 'bg-white text-[#0c4a26] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Profit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setItemSortBy('name')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    itemSortBy === 'name' ? 'bg-white text-[#0c4a26] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Name
                </button>
              </div>
            </div>
          </div>

          {/* Top 3 Best Sellers Leaderboard */}
          {itemsSoldData.items.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {itemsSoldData.items.slice(0, 3).map((item, idx) => {
                const sharePercent = itemsSoldData.totalGrossRevenue > 0
                  ? ((item.totalRevenue / itemsSoldData.totalGrossRevenue) * 100).toFixed(1)
                  : '0';
                return (
                  <div
                    key={item.productId}
                    className="bg-gradient-to-br from-white to-emerald-50/30 p-3.5 rounded-xl border border-emerald-100 shadow-2xs relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white ${
                            idx === 0
                              ? 'bg-amber-500 shadow-xs'
                              : idx === 1
                              ? 'bg-slate-400'
                              : 'bg-amber-700/80'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.productName}</p>
                          <p className="text-[10px] text-slate-400">{item.category} · {item.sku}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-[#0c4a26]">
                        {sharePercent}% of total
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400">Sold: </span>
                        <span className="font-extrabold text-slate-800 tabular-nums">
                          {item.totalQty} {item.unit}
                        </span>
                      </div>
                      <div className="font-black text-[#0c4a26] tabular-nums">
                        {item.totalRevenue.toLocaleString()} RWF
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-[#0f532b] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(8, Number(sharePercent)))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Items Sold Detailed Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  Item Sold Breakdown ({itemsSoldData.items.length} unique products)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Aggregated from customer checkout receipts for period: <strong>{salesDateFilter}</strong>
                </p>
              </div>
            </div>

            {itemsSoldData.items.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-600">No items sold matching your criteria</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Try selecting a different date range or clearing your search filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b font-semibold text-slate-500">
                      <th className="p-3">Rank</th>
                      <th className="p-3">Product Name & SKU</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-right">Quantity Sold</th>
                      <th className="p-3 text-right">Avg Unit Price</th>
                      <th className="p-3 text-right">Total Revenue</th>
                      {canViewCostPrice() && (
                        <th className="p-3 text-right">Total Cost</th>
                      )}
                      {canViewGrossProfit() && (
                        <th className="p-3 text-right">Gross Profit</th>
                      )}
                      <th className="p-3 text-center">Tickets</th>
                      <th className="p-3 text-right">Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsSoldData.items.map((item, index) => {
                      const avgPrice = item.totalQty > 0 ? Math.round(item.totalRevenue / item.totalQty) : 0;
                      const profit = item.totalRevenue - item.totalCost;
                      const margin = item.totalRevenue > 0 ? ((profit / item.totalRevenue) * 100).toFixed(1) : '0';
                      const contribution = itemsSoldData.totalGrossRevenue > 0
                        ? ((item.totalRevenue / itemsSoldData.totalGrossRevenue) * 100).toFixed(1)
                        : '0';

                      return (
                        <tr key={item.productId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-400 text-center w-12">
                            {index + 1}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{item.productName}</div>
                            <div className="font-mono text-[10px] text-slate-400">{item.sku}</div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3 text-right font-extrabold text-slate-900 tabular-nums">
                            {item.totalQty.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{item.unit}</span>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600 tabular-nums">
                            {avgPrice.toLocaleString()} RWF
                          </td>
                          <td className="p-3 text-right font-black text-emerald-800 tabular-nums">
                            {item.totalRevenue.toLocaleString()} RWF
                          </td>
                          {canViewCostPrice() && (
                            <td className="p-3 text-right font-mono text-slate-500 tabular-nums">
                              {item.totalCost.toLocaleString()} RWF
                            </td>
                          )}
                          {canViewGrossProfit() && (
                            <td className="p-3 text-right tabular-nums">
                              <span className="font-bold text-slate-900">{profit.toLocaleString()} RWF</span>
                              <span className="block text-[10px] text-emerald-700 font-semibold">{margin}% margin</span>
                            </td>
                          )}
                          <td className="p-3 text-center text-slate-600 font-medium">
                            {item.transactionCount}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="font-bold text-slate-700 tabular-nums">{contribution}%</span>
                              <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(6, Number(contribution)))}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t font-bold text-slate-900">
                    <tr>
                      <td className="p-3 text-slate-500 text-center">—</td>
                      <td className="p-3" colSpan={2}>Total ({itemsSoldData.items.length} unique products)</td>
                      <td className="p-3 text-right font-black tabular-nums">{itemsSoldData.totalQtySold.toLocaleString()} units</td>
                      <td className="p-3 text-right text-slate-400">—</td>
                      <td className="p-3 text-right font-black text-emerald-800 tabular-nums">{itemsSoldData.totalGrossRevenue.toLocaleString()} RWF</td>
                      {canViewCostPrice() && (
                        <td className="p-3 text-right font-mono text-slate-600 tabular-nums">{itemsSoldData.totalCostOfSold.toLocaleString()} RWF</td>
                      )}
                      {canViewGrossProfit() && (
                        <td className="p-3 text-right font-black text-slate-900 tabular-nums">{itemsSoldData.totalGrossProfit.toLocaleString()} RWF</td>
                      )}
                      <td className="p-3 text-center text-slate-400">—</td>
                      <td className="p-3 text-right font-black">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {effectiveTab === 'inventory' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b font-semibold text-slate-500">
                <th className="p-3">Product</th>
                <th className="p-3">SKU</th>
                <th className="p-3 text-right">Cost Price</th>
                <th className="p-3 text-right">Retail Price</th>
                <th className="p-3 text-center">In Stock</th>
                <th className="p-3 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-bold text-slate-800">{p.name}</td>
                  <td className="p-3 font-mono text-slate-500">{p.sku}</td>
                  <td className="p-3 text-right tabular-nums">{p.costPrice.toLocaleString()} RWF</td>
                  <td className="p-3 text-right tabular-nums font-bold">{p.sellingPrice.toLocaleString()} RWF</td>
                  <td className="p-3 text-center">{p.stock} {p.unit}</td>
                  <td className="p-3 text-right font-bold text-slate-900 tabular-nums">
                    {(p.stock * p.costPrice).toLocaleString()} RWF
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSaleForReceipt && (
        <ReceiptModal sale={selectedSaleForReceipt} onClose={() => setSelectedSaleForReceipt(null)} />
      )}

      <ConfirmActionModal
        open={deletingSale !== null}
        title="Delete Sale Transaction"
        description={`Are you sure you want to permanently delete sale transaction "${deletingSale?.reference}" (${deletingSale?.total.toLocaleString()} RWF)?`}
        confirmText="Delete Sale"
        requireReason
        onConfirm={(reason) => {
          if (deletingSale) {
            deleteSale(deletingSale.id, reason);
            setDeletingSale(null);
          }
        }}
        onCancel={() => setDeletingSale(null)}
      />
    </div>
  );
};

interface UsersRolesContentProps {
  initialTab?: 'roles' | 'users';
}

const UsersRolesContent: React.FC<UsersRolesContentProps> = ({ initialTab = 'roles' }) => {
  const {
    currentUser,
    users,
    permissions,
    addUser,
    updateUser,
    changeUserRole,
    updateUserCustomPermissions,
    toggleUserStatus,
    resetUserAccess,
    updateRolePermissions,
    resetRolePermissionsToDefault,
    deleteUser,
    canDeleteStaff,
    notify,
  } = useStore();

  // Active top navigation tab: 'roles' | 'users'
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>(initialTab);

  // Selected role for Matrix management
  const [selectedRole, setSelectedRole] = useState<UserRole>('Cashier');

  // Search filter for modules in matrix
  const [moduleFilter, setModuleFilter] = useState('');

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<UserAccount | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<UserRole>('Cashier');
  const [roleChangeReason, setRoleChangeReason] = useState('Operational staff promotion');

  const [managingPermissionsUser, setManagingPermissionsUser] = useState<UserAccount | null>(null);
  const [userCustomOverrides, setUserCustomOverrides] = useState<
    Partial<Record<ModuleKey, Partial<Record<PermissionAction, boolean>>>>
  >({});

  const [confirmResetRole, setConfirmResetRole] = useState<UserRole | null>(null);

  // Deletion state
  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);
  const [deleteUserReason, setDeleteUserReason] = useState('Account decommissioned by Super Admin');
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('+250 788 ');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Cashier');
  const [newUserBranch, setNewUserBranch] = useState('Main Branch');
  const [newUserPin, setNewUserPin] = useState('1234');

  // Compute permission counts for each role
  const roleStats = useMemo(() => {
    const actions: PermissionAction[] = ['view', 'create', 'edit', 'approve', 'delete', 'export'];
    const totalPossible = ALL_MODULES.length * actions.length;

    const stats: Record<UserRole, { count: number; total: number; userCount: number }> = {
      'Super Admin': { count: 0, total: totalPossible, userCount: 0 },
      'Business Owner': { count: 0, total: totalPossible, userCount: 0 },
      'Manager': { count: 0, total: totalPossible, userCount: 0 },
      'Cashier': { count: 0, total: totalPossible, userCount: 0 },
      'Stock Manager': { count: 0, total: totalPossible, userCount: 0 },
    };

    (Object.keys(stats) as UserRole[]).forEach((role) => {
      const matrix = permissions[role];
      let enabledCount = 0;
      if (matrix) {
        ALL_MODULES.forEach((mod) => {
          if (matrix[mod]) {
            actions.forEach((act) => {
              if (matrix[mod][act]) enabledCount++;
            });
          }
        });
      }
      stats[role].count = enabledCount;
      stats[role].userCount = users.filter((u) => u.role === role).length;
    });

    return stats;
  }, [permissions, users]);

  // Filter modules
  const filteredModules = useMemo(() => {
    return ALL_MODULES.filter((m) =>
      m.toLowerCase().replace('_', ' ').includes(moduleFilter.toLowerCase())
    );
  }, [moduleFilter]);

  // Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      notify('error', 'Validation Error', 'Full name and email are required.');
      return;
    }
    const success = await addUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      phone: newUserPhone.trim(),
      role: newUserRole,
      branch: newUserBranch,
      status: 'Active',
      pin: newUserPin,
    }, 'Provisioned staff account via Super Admin console');

    if (success) {
      setIsAddUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('+250 788 ');
      setNewUserPin('1234');
    }
  };

  const handleExecuteRoleChange = async () => {
    if (!roleChangeUser) return;
    await changeUserRole(roleChangeUser.id, newSelectedRole, roleChangeReason);
    setRoleChangeUser(null);
  };

  const handleOpenUserPermissions = (user: UserAccount) => {
    setManagingPermissionsUser(user);
    setUserCustomOverrides(user.customPermissions ? JSON.parse(JSON.stringify(user.customPermissions)) : {});
  };

  const handleSaveUserPermissions = async () => {
    if (!managingPermissionsUser) return;
    await updateUserCustomPermissions(
      managingPermissionsUser.id,
      Object.keys(userCustomOverrides).length > 0 ? userCustomOverrides : undefined,
      'Super Admin customized user permissions matrix'
    );
    setManagingPermissionsUser(null);
  };

  const toggleUserCustomAction = (mod: ModuleKey, act: PermissionAction) => {
    const inherited = Boolean(permissions[managingPermissionsUser!.role]?.[mod]?.[act]);
    const currentVal = userCustomOverrides[mod]?.[act];

    setUserCustomOverrides((prev) => {
      const next = { ...prev };
      const modObj = { ...(next[mod] || {}) };

      if (currentVal === undefined) {
        // Toggle opposite of inherited
        modObj[act] = !inherited;
      } else if (currentVal !== inherited) {
        // Revert back to inherited default by deleting override
        delete modObj[act];
      } else {
        modObj[act] = !currentVal;
      }

      if (Object.keys(modObj).length === 0) {
        delete next[mod];
      } else {
        next[mod] = modObj;
      }
      return next;
    });
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeletingUser(true);
    const success = await deleteUser(deletingUser.id, deleteUserReason.trim() || 'Account decommissioned by Super Admin');
    setIsDeletingUser(false);
    if (success) {
      setDeletingUser(null);
      setDeleteUserReason('Account decommissioned by Super Admin');
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header with Title & Subtitle per Requirement */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0c4a26]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {activeTab === 'roles' ? 'Staff Management' : 'Staff List'}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0c4a26] border border-emerald-200">
              Staff & Administration
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {activeTab === 'roles'
              ? 'Create staff accounts, assign roles and permissions, activate or deactivate accounts, and manage clearance.'
              : 'View all staff, search and filter by role or status, edit staff details, and inspect individual staff profiles.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-white text-[#0c4a26] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Role Management & Matrix
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white text-[#0c4a26] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            User Accounts ({users.length})
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: ROLE MANAGEMENT & PERMISSION MATRIX                   */}
      {/* ============================================================ */}
      {activeTab === 'roles' && (
        <div className="space-y-5">
          {/* 5 Primary Role Cards per Section 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {ROLE_METADATA_LIST.map((meta) => {
              const stats = roleStats[meta.role];
              const isSelected = selectedRole === meta.role;

              return (
                <div
                  key={meta.role}
                  className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#0c4a26] ring-2 ring-emerald-600/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <h2 className="text-xs font-bold text-slate-900 truncate">{meta.title}</h2>
                        <p className="text-[10px] text-slate-400 font-medium leading-tight">
                          {meta.subtitle}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          meta.status === 'Protected'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {meta.status}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-600">
                      <div className="flex items-center justify-between text-[11px]">
                        <span>Assigned Staff:</span>
                        <span className="font-bold text-slate-900">{stats.userCount} users</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span>Permissions:</span>
                        <span className="font-mono font-bold text-[#0c4a26]">
                          {stats.count}/{stats.total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>Updated:</span>
                        <span>{meta.lastUpdated}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5 mt-3">
                    <button
                      onClick={() => setSelectedRole(meta.role)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold text-center transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#0c4a26] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? 'Editing Matrix' : 'Select Role'}
                    </button>
                    {meta.role !== 'Super Admin' && (
                      <button
                        onClick={() => setConfirmResetRole(meta.role)}
                        title="Reset permissions to standard defaults"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Permission Matrix Section per Section 4 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Matrix Header Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">
                      Permission Matrix: <span className="text-[#0c4a26]">{selectedRole}</span>
                    </h2>
                    {selectedRole === 'Super Admin' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        Full Master Access (Always Enabled)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Granular toggle controls for viewing, creating, modifying, approving, deleting, and exporting module data.
                  </p>
                </div>
              </div>

              {/* Module search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter modules..."
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#0c4a26]"
                />
              </div>
            </div>

            {/* Desktop Table: Module | View | Create | Edit | Approve | Delete | Export */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-600">
                    <th className="p-3 w-56">Module</th>
                    <th className="p-3 text-center w-24">View</th>
                    <th className="p-3 text-center w-24">Create</th>
                    <th className="p-3 text-center w-24">Edit</th>
                    <th className="p-3 text-center w-24">Approve</th>
                    <th className="p-3 text-center w-24">Delete</th>
                    <th className="p-3 text-center w-24">Export</th>
                    <th className="p-3 text-right">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredModules.map((mod) => {
                    const matrix = permissions[selectedRole]?.[mod] || {
                      view: false,
                      create: false,
                      edit: false,
                      approve: false,
                      delete: false,
                      export: false,
                    };
                    const formattedName = mod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                    const actions: PermissionAction[] = ['view', 'create', 'edit', 'approve', 'delete', 'export'];
                    const enabledCount = actions.filter((a) => matrix[a]).length;

                    return (
                      <tr key={mod} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-bold text-slate-800">
                          <span className="font-mono text-slate-400 text-[10px] block uppercase">Module</span>
                          {formattedName}
                        </td>

                        {actions.map((act) => {
                          const isChecked = Boolean(matrix[act]);
                          const isSuperAdmin = selectedRole === 'Super Admin';

                          return (
                            <td key={act} className="p-3 text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  disabled={isSuperAdmin}
                                  checked={isChecked}
                                  onChange={(e) => {
                                    updateRolePermissions(selectedRole, mod, act, e.target.checked);
                                  }}
                                  className="w-4 h-4 rounded text-[#0c4a26] accent-[#0c4a26] focus:ring-[#0c4a26] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                                />
                              </label>
                            </td>
                          );
                        })}

                        <td className="p-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              enabledCount === 6
                                ? 'bg-emerald-100 text-emerald-800'
                                : enabledCount > 0
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {enabledCount}/6 Allowed
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Responsive cards per Section 13 */}
            <div className="md:hidden divide-y divide-slate-100 p-2 space-y-2">
              {filteredModules.map((mod) => {
                const matrix = permissions[selectedRole]?.[mod] || {
                  view: false,
                  create: false,
                  edit: false,
                  approve: false,
                  delete: false,
                  export: false,
                };
                const formattedName = mod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                const actions: PermissionAction[] = ['view', 'create', 'edit', 'approve', 'delete', 'export'];
                const isSuperAdmin = selectedRole === 'Super Admin';

                return (
                  <div key={mod} className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200/60">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">{formattedName}</span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        {actions.filter((a) => matrix[a]).length}/6 Active
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {actions.map((act) => {
                        const isChecked = Boolean(matrix[act]);
                        return (
                          <button
                            key={act}
                            disabled={isSuperAdmin}
                            onClick={() => {
                              updateRolePermissions(selectedRole, mod, act, !isChecked);
                            }}
                            className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-between border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                : 'bg-white text-slate-400 border-slate-200'
                            }`}
                          >
                            <span className="capitalize">{act}</span>
                            {isChecked ? <Check className="w-3 h-3 text-[#0c4a26]" /> : <Slash className="w-2.5 h-2.5 text-slate-300" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: USER MANAGEMENT (SUPER ADMIN EXCLUSIVE)               */}
      {/* ============================================================ */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Registered Staff & Credentials</h2>
              <p className="text-xs text-slate-500">
                Manage accounts, assign roles, inspect inherited capabilities, and customize overrides.
              </p>
            </div>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0c4a26] hover:bg-[#093a1d] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Account</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Assigned Role</th>
                    <th className="p-3.5">Branch</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Permissions Model</th>
                    <th className="p-3.5">Last Login</th>
                    <th className="p-3.5 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const hasOverrides = u.customPermissions && Object.keys(u.customPermissions).length > 0;
                    const overrideCount = hasOverrides
                      ? Object.values(u.customPermissions!).reduce(
                          (acc, modObj) => acc + Object.keys(modObj || {}).length,
                          0
                        )
                      : 0;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#0c4a26] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{u.name}</p>
                              <p className="text-[11px] text-slate-400">{u.email}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{u.phone}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-[#0c4a26] border border-emerald-200">
                            {u.role}
                          </span>
                        </td>

                        <td className="p-3.5 font-medium text-slate-700">{u.branch}</td>

                        <td className="p-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>

                        <td className="p-3.5">
                          {hasOverrides ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              Custom ({overrideCount} overrides)
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              Inherited from {u.role}
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-slate-500 font-mono text-[11px]">{u.lastLogin}</td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setRoleChangeUser(u);
                                setNewSelectedRole(u.role);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[11px] cursor-pointer"
                              title="Change Role"
                            >
                              Role
                            </button>
                            <button
                              onClick={() => handleOpenUserPermissions(u)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#0c4a26] rounded-md font-bold text-[11px] cursor-pointer"
                              title="Manage Custom Overrides"
                            >
                              Permissions
                            </button>
                            <button
                              onClick={() => resetUserAccess(u.id)}
                              className="p-1 text-slate-400 hover:text-amber-600 rounded-md cursor-pointer"
                              title="Reset Credentials (PIN 1234)"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleUserStatus(u.id)}
                              className={`p-1 rounded-md cursor-pointer ${
                                u.status === 'Active'
                                  ? 'text-slate-400 hover:text-red-600'
                                  : 'text-emerald-600 hover:text-emerald-800'
                              }`}
                              title={u.status === 'Active' ? 'Deactivate User' : 'Reactivate User'}
                            >
                              {u.status === 'Active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            {canDeleteStaff() && (
                              <button
                                onClick={() => {
                                  if (u.id === currentUser.id) {
                                    notify('error', 'Action Prohibited', 'You cannot delete your own logged-in Super Admin account.');
                                    return;
                                  }
                                  setDeletingUser(u);
                                  setDeleteUserReason('Account decommissioned by Super Admin');
                                }}
                                disabled={u.id === currentUser.id}
                                className={`p-1 rounded-md transition-colors ${
                                  u.id === currentUser.id
                                    ? 'text-slate-200 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                                }`}
                                title={u.id === currentUser.id ? 'Cannot delete own account' : 'Permanently Delete User Account'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: ADD USER ACCOUNT (SECTION 10)                       */}
      {/* ============================================================ */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Provision Staff Account</h3>
                <p className="text-[11px] text-slate-500">Only Super Admin can assign staff roles and clearance.</p>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Jean Pierre Habimana"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="jean@freshandmore.rw"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Role *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white text-slate-800"
                  >
                    <option value="Cashier">Cashier (POS & Sales only)</option>
                    <option value="Stock Manager">Stock Manager (Inventory & POs)</option>
                    <option value="Manager">Manager (Operations supervisor)</option>
                    <option value="Business Owner">Business Owner (Financials oversight)</option>
                    <option value="Super Admin">Super Admin (Full authority)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Branch Location</label>
                  <select
                    value={newUserBranch}
                    onChange={(e) => setNewUserBranch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="Main Branch">Downtown Kigali Branch</option>
                    <option value="Nyarutarama Express">Nyarutarama Express</option>
                    <option value="Kicukiro Warehouse">Kicukiro Warehouse</option>
                    <option value="All Branches">All Branches</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Default POS PIN (4 digits)</label>
                  <input
                    required
                    maxLength={4}
                    value={newUserPin}
                    onChange={(e) => setNewUserPin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-center font-bold tracking-widest"
                  />
                </div>
              </div>

              {/* Dynamic Inherited Permissions Summary */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-4 h-4 text-[#0c4a26]" />
                  <span>Inherited Clearance from {newUserRole}</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  {newUserRole === 'Cashier' &&
                    'Granted POS checkout, customer registry, and personal cash shifts. Financial statements and cost prices are hidden.'}
                  {newUserRole === 'Stock Manager' &&
                    'Granted inventory counts, PO creation, goods receiving, and supplier tracking. Accounting is restricted.'}
                  {newUserRole === 'Manager' &&
                    'Granted operational management, discount approvals, refunds, and expense authorizations.'}
                  {newUserRole === 'Business Owner' &&
                    'Granted executive financial reports, gross margin statements, and business performance tracking.'}
                  {newUserRole === 'Super Admin' &&
                    'Full master access including role assignment, permission matrix governance, and audit trails.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0c4a26] hover:bg-[#093a1d] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: CHANGE ROLE WITH AUDIT REASON                      */}
      {/* ============================================================ */}
      {roleChangeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Change Staff Role</h3>
                <p className="text-[11px] text-slate-500">Target user: {roleChangeUser.name}</p>
              </div>
              <button
                onClick={() => setRoleChangeUser(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-950">
              <p className="font-bold">Current Role: {roleChangeUser.role}</p>
              <p className="text-[11px] text-amber-800">
                Changing this role will immediately update navigation visibility, page protection, and action clearance.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select New Role</label>
                <select
                  value={newSelectedRole}
                  onChange={(e) => setNewSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold bg-white text-slate-800"
                >
                  <option value="Cashier">Cashier</option>
                  <option value="Stock Manager">Stock Manager</option>
                  <option value="Manager">Manager</option>
                  <option value="Business Owner">Business Owner</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Administrative Audit Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={roleChangeReason}
                  onChange={(e) => setRoleChangeReason(e.target.value)}
                  placeholder="e.g. Promoted to branch operations supervisor"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRoleChangeUser(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRoleChange}
                className="px-5 py-2 bg-[#0c4a26] text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Confirm & Reassign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: MANAGE CUSTOM USER OVERRIDES (SECTION 11)           */}
      {/* ============================================================ */}
      {managingPermissionsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl p-6 text-xs flex flex-col justify-between animate-in zoom-in-95 duration-200">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">
                      User Overrides: {managingPermissionsUser.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">
                      Role: {managingPermissionsUser.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Apply bespoke overrides on top of the role default. Unset items automatically inherit from{' '}
                    {managingPermissionsUser.role}.
                  </p>
                </div>
                <button
                  onClick={() => setManagingPermissionsUser(null)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Legend */}
              <div className="py-2.5 flex items-center gap-4 text-[11px] border-b border-slate-100">
                <span className="flex items-center gap-1 font-semibold text-slate-500">
                  <span className="w-2.5 h-2.5 rounded bg-slate-200 inline-block" /> Inherited Default
                </span>
                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Custom Allowed
                </span>
                <span className="flex items-center gap-1 font-semibold text-red-600">
                  <span className="w-2.5 h-2.5 rounded bg-red-500 inline-block" /> Custom Denied
                </span>
              </div>
            </div>

            {/* Matrix of Overrides */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1 custom-scrollbar max-h-[50vh]">
              {ALL_MODULES.map((mod) => {
                const formattedName = mod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                const actions: PermissionAction[] = ['view', 'create', 'edit', 'approve', 'delete', 'export'];

                return (
                  <div key={mod} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 text-[11px] w-36 truncate">{formattedName}</span>
                    <div className="flex items-center gap-1.5 flex-1 justify-end">
                      {actions.map((act) => {
                        const inherited = Boolean(permissions[managingPermissionsUser.role]?.[mod]?.[act]);
                        const overrideVal = userCustomOverrides[mod]?.[act];
                        const isOverridden = overrideVal !== undefined;
                        const effective = isOverridden ? overrideVal : inherited;

                        return (
                          <button
                            key={act}
                            onClick={() => toggleUserCustomAction(mod, act)}
                            title={`${act.toUpperCase()}: ${isOverridden ? 'Custom Override' : 'Inherited from Role'}`}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                              isOverridden
                                ? effective
                                  ? 'bg-emerald-500 text-white border-emerald-600'
                                  : 'bg-red-500 text-white border-red-600'
                                : effective
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-400 border-slate-200'
                            }`}
                          >
                            <span className="capitalize">{act.slice(0, 3)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setUserCustomOverrides({})}
                className="text-[11px] text-amber-700 font-bold hover:underline cursor-pointer"
              >
                Clear All Custom Overrides
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setManagingPermissionsUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUserPermissions}
                  className="px-5 py-2 bg-[#0c4a26] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Overrides
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={confirmResetRole !== null}
        title={`Reset ${confirmResetRole} Permissions`}
        description={`This will reset all ${confirmResetRole} permission matrix toggles back to standard system defaults.`}
        onConfirm={() => {
          if (confirmResetRole) resetRolePermissionsToDefault(confirmResetRole);
          setConfirmResetRole(null);
        }}
        onCancel={() => setConfirmResetRole(null)}
      />

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>Delete User Account</span>
              </div>
              <button
                onClick={() => setDeletingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-red-950 text-sm">
                “Are you sure you want to delete this staff member? This action cannot be undone.”
              </div>
              <p className="text-red-700 leading-relaxed text-[11px]">
                Deleting this staff member removes their account credentials permanently. Historical sales, transactions, payments, and audit records linked to <strong className="text-red-900">{deletingUser.name}</strong> will be preserved intact for reporting and accountability.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deletion Reason (Audit Trail)
              </label>
              <input
                type="text"
                value={deleteUserReason}
                onChange={(e) => setDeleteUserReason(e.target.value)}
                placeholder="Reason for deletion..."
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
                <span>{isDeletingUser ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const StaffManagementView: React.FC = () => {
  const { canManageUsersAndRoles } = useStore();

  if (!canManageUsersAndRoles()) {
    return <AccessRestrictedView moduleName="staff_management" requiredAction="manage" />;
  }

  return <UsersRolesContent initialTab="roles" />;
};

export const StaffListView: React.FC = () => {
  const {
    currentUser,
    users,
    attendanceRecords,
    addUser,
    updateUser,
    changeUserRole,
    toggleUserStatus,
    resetUserAccess,
    deleteUser,
    notify,
    canManageUsersAndRoles,
    canDeleteStaff,
    settings,
  } = useStore();

  if (!canManageUsersAndRoles()) {
    return <AccessRestrictedView moduleName="staff_list" requiredAction="view" />;
  }

  // Filters & Search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');

  // Modals & Drawers
  const [selectedStaffProfile, setSelectedStaffProfile] = useState<UserAccount | null>(null);
  const [editingStaff, setEditingStaff] = useState<UserAccount | null>(null);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [roleChangeStaff, setRoleChangeStaff] = useState<UserAccount | null>(null);
  const [newSelectedRole, setNewSelectedRole] = useState<UserRole>('Cashier');
  const [roleChangeReason, setRoleChangeReason] = useState('Operational role update');

  // Delete modal
  const [deletingStaff, setDeletingStaff] = useState<UserAccount | null>(null);
  const [deleteReason, setDeleteReason] = useState('Account decommissioned by Super Admin');
  const [isDeleting, setIsDeleting] = useState(false);

  // Add staff form state
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('+250 788 ');
  const [addRole, setAddRole] = useState<UserRole>('Cashier');
  const [addBranch, setAddBranch] = useState('Main Branch');
  const [addPin, setAddPin] = useState('1234');

  // Edit staff form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Suspended'>('Active');

  const branches = useMemo(() => {
    const list = new Set<string>();
    users.forEach((u) => {
      if (u.branch) list.add(u.branch);
    });
    settings.branches.forEach((b) => list.add(b.name));
    return Array.from(list);
  }, [users, settings.branches]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !search.trim() ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.phone.toLowerCase().includes(search.toLowerCase()) ||
        u.branch.toLowerCase().includes(search.toLowerCase());

      const matchesRole = roleFilter === 'All' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
      const matchesBranch = branchFilter === 'All' || u.branch === branchFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesBranch;
    });
  }, [users, search, roleFilter, statusFilter, branchFilter]);

  // Statistics
  const totalStaffCount = users.length;
  const activeStaffCount = users.filter((u) => u.status === 'Active').length;
  const cashiersCount = users.filter((u) => u.role === 'Cashier').length;
  const managementCount = users.filter((u) => ['Super Admin', 'Business Owner', 'Manager'].includes(u.role)).length;

  const handleOpenEdit = (staff: UserAccount) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditEmail(staff.email);
    setEditPhone(staff.phone);
    setEditBranch(staff.branch);
    setEditPin(staff.pin || '1234');
    setEditStatus(staff.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!editName.trim() || !editEmail.trim()) {
      notify('error', 'Validation Error', 'Full name and email address are required.');
      return;
    }

    const success = await updateUser(
      editingStaff.id,
      {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        branch: editBranch.trim(),
        pin: editPin.trim() || '1234',
        status: editStatus,
      },
      `Staff details updated by ${currentUser.name}`
    );

    if (success) {
      if (selectedStaffProfile?.id === editingStaff.id) {
        setSelectedStaffProfile((prev) =>
          prev
            ? {
                ...prev,
                name: editName.trim(),
                email: editEmail.trim(),
                phone: editPhone.trim(),
                branch: editBranch.trim(),
                pin: editPin.trim() || '1234',
                status: editStatus,
              }
            : null
        );
      }
      setEditingStaff(null);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim()) {
      notify('error', 'Validation Error', 'Full name and email are required.');
      return;
    }

    const success = await addUser(
      {
        name: addName.trim(),
        email: addEmail.trim(),
        phone: addPhone.trim(),
        role: addRole,
        branch: addBranch,
        status: 'Active',
        pin: addPin.trim() || '1234',
      },
      `Staff provisioned by ${currentUser.name}`
    );

    if (success) {
      setIsAddStaffOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPhone('+250 788 ');
      setAddPin('1234');
    }
  };

  const handleExecuteRoleChange = async () => {
    if (!roleChangeStaff) return;
    const success = await changeUserRole(roleChangeStaff.id, newSelectedRole, roleChangeReason);
    if (success && selectedStaffProfile?.id === roleChangeStaff.id) {
      setSelectedStaffProfile((prev) => (prev ? { ...prev, role: newSelectedRole } : null));
    }
    setRoleChangeStaff(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    setIsDeleting(true);
    const success = await deleteUser(deletingStaff.id, deleteReason.trim() || 'Staff account removed');
    setIsDeleting(false);
    if (success) {
      if (selectedStaffProfile?.id === deletingStaff.id) {
        setSelectedStaffProfile(null);
      }
      setDeletingStaff(null);
      setDeleteReason('Account decommissioned by Super Admin');
    }
  };

  const exportStaffCSV = () => {
    const rows = [
      ['ID', 'Name', 'Role', 'Email', 'Phone', 'Branch', 'Status', 'Last Login'],
      ...filteredStaff.map((u) => [
        u.id,
        u.name,
        u.role,
        u.email,
        u.phone,
        u.branch,
        u.status,
        u.lastLogin,
      ]),
    ];
    const csv = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((cell) => `"${cell}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `FreshMore_Staff_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('success', 'Export Downloaded', 'Staff directory exported to CSV.');
  };

  return (
    <div className="space-y-5">
      {/* 1. Header with Breadcrumb & Primary Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#0c4a26]">
              <ClipboardList className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff List</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0c4a26] border border-emerald-200">
              Staff & Administration
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            View all staff members, search and filter by role or status, edit staff details, and inspect individual staff profiles.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportStaffCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Download CSV report of staff directory"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsAddStaffOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0c4a26] hover:bg-[#093a1d] rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Total Staff</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{totalStaffCount}</p>
          <span className="text-[10px] text-slate-400 font-medium">Registered accounts</span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Active Accounts</p>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">{activeStaffCount}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Authorized to login</span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Cashiers</p>
          <p className="text-xl font-extrabold text-blue-700 mt-1">{cashiersCount}</p>
          <span className="text-[10px] text-blue-600 font-medium">Terminal checkout staff</span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-500">Managers & Admins</p>
          <p className="text-xl font-extrabold text-purple-700 mt-1">{managementCount}</p>
          <span className="text-[10px] text-purple-600 font-medium">Operational supervisors</span>
        </div>
      </div>

      {/* 3. Search and Multi-Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26] text-slate-700"
            >
              <option value="All">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Business Owner">Business Owner</option>
              <option value="Manager">Manager</option>
              <option value="Cashier">Cashier</option>
              <option value="Stock Manager">Stock Manager</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26] text-slate-700"
            >
              <option value="All">All Account Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Suspended">Suspended / Inactive</option>
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26] text-slate-700"
            >
              <option value="All">All Store Branches</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter count indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Showing <strong className="text-slate-800 font-bold">{filteredStaff.length}</strong> of{' '}
            {totalStaffCount} staff members
          </span>
          {(search || roleFilter !== 'All' || statusFilter !== 'All' || branchFilter !== 'All') && (
            <button
              onClick={() => {
                setSearch('');
                setRoleFilter('All');
                setStatusFilter('All');
                setBranchFilter('All');
              }}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Staff Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <th className="p-3.5">Staff Member</th>
                <th className="p-3.5">Assigned Role</th>
                <th className="p-3.5">Store Branch</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Shift Status</th>
                <th className="p-3.5">Clearance Model</th>
                <th className="p-3.5">Last Login</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No staff accounts match your current filters</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search query or reset the role and status filters.</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const todayShift = attendanceRecords.find(
                    (a) => a.userId === staff.id && a.date === timeSync.getTodayString()
                  );
                  const isClockedIn = todayShift?.status === 'Clocked In';

                  const hasOverrides = staff.customPermissions && Object.keys(staff.customPermissions).length > 0;
                  const overrideCount = hasOverrides
                    ? Object.values(staff.customPermissions!).reduce(
                        (acc, modObj) => acc + Object.keys(modObj || {}).length,
                        0
                      )
                    : 0;

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      onClick={() => setSelectedStaffProfile(staff)}
                    >
                      {/* Avatar & Contact */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0c4a26] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ring-2 ring-emerald-600/10">
                            {staff.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 group-hover:text-[#0c4a26] transition-colors truncate">
                              {staff.name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono truncate">{staff.email}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{staff.phone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Role */}
                      <td className="p-3.5">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-[#0c4a26] border border-emerald-200">
                          {staff.role}
                        </span>
                      </td>

                      {/* Branch */}
                      <td className="p-3.5 font-medium text-slate-700">{staff.branch}</td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            staff.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              staff.status === 'Active' ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                          />
                          {staff.status}
                        </span>
                      </td>

                      {/* Shift / Attendance Status */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isClockedIn
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{isClockedIn ? `On Shift (${todayShift?.clockInTime})` : 'Off Duty'}</span>
                        </span>
                      </td>

                      {/* Clearance Model */}
                      <td className="p-3.5">
                        {hasOverrides ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Custom ({overrideCount})</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">Standard {staff.role}</span>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="p-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {staff.lastLogin}
                      </td>

                      {/* Administrative Actions */}
                      <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedStaffProfile(staff)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] cursor-pointer"
                            title="View Staff Profile"
                          >
                            Profile
                          </button>
                          <button
                            onClick={() => handleOpenEdit(staff)}
                            className="p-1.5 text-slate-600 hover:text-[#0c4a26] hover:bg-emerald-50 rounded-lg cursor-pointer"
                            title="Edit Staff Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setRoleChangeStaff(staff);
                              setNewSelectedRole(staff.role);
                            }}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#0c4a26] rounded-lg font-bold text-[11px] cursor-pointer"
                            title="Change Role"
                          >
                            Role
                          </button>
                          <button
                            onClick={() => toggleUserStatus(staff.id)}
                            className={`p-1.5 rounded-lg cursor-pointer ${
                              staff.status === 'Active'
                                ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                            }`}
                            title={staff.status === 'Active' ? 'Deactivate Staff' : 'Reactivate Staff'}
                          >
                            {staff.status === 'Active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                          {canDeleteStaff() && (
                            <button
                              onClick={() => {
                                if (staff.id === currentUser.id) {
                                  notify('error', 'Cannot Delete Self', 'You cannot delete your own active administrator account.');
                                  return;
                                }
                                setDeletingStaff(staff);
                                setDeleteReason(`Staff record deleted by ${currentUser.name} (${currentUser.role})`);
                              }}
                              disabled={staff.id === currentUser.id}
                              className={`p-1.5 rounded-lg transition-colors ${
                                staff.id === currentUser.id
                                  ? 'text-slate-200 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                              }`}
                              title={staff.id === currentUser.id ? 'Cannot delete own account' : 'Delete Staff Member'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. MODAL: INDIVIDUAL STAFF PROFILE DRAWER / CARD             */}
      {/* ============================================================ */}
      {selectedStaffProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200 text-slate-800">
            {/* Header Lockup */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0c4a26] text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {selectedStaffProfile.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 leading-tight">
                    {selectedStaffProfile.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#0c4a26] border border-emerald-200">
                      {selectedStaffProfile.role}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedStaffProfile.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedStaffProfile.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffProfile(null)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Information Sections */}
            <div className="space-y-3.5">
              {/* Contact Details */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Contact Information & Location
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Email Address</span>
                    <span className="font-mono font-medium text-slate-800">{selectedStaffProfile.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Phone Number</span>
                    <span className="font-mono font-medium text-slate-800">{selectedStaffProfile.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Assigned Store Branch</span>
                    <span className="font-semibold text-slate-800">{selectedStaffProfile.branch}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">POS PIN Status</span>
                    <span className="font-mono text-emerald-700 font-bold">Configured (4-digit)</span>
                  </div>
                </div>
              </div>

              {/* Clearance & Access Control Model */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Role Capabilities & Clearance
                </p>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{selectedStaffProfile.role} Access Policy</p>
                    <p className="text-[11px] text-slate-500">
                      Inherits system permissions according to the store's role policy.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Standard
                  </span>
                </div>
                {selectedStaffProfile.customPermissions &&
                  Object.keys(selectedStaffProfile.customPermissions).length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-amber-800 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Has custom individual module capability overrides enabled.</span>
                    </div>
                  )}
              </div>

              {/* Security & Audit */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Last System Sign-In:</span>
                  <span className="font-mono font-semibold text-slate-700">{selectedStaffProfile.lastLogin}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Account ID:</span>
                  <span className="font-mono text-slate-400">{selectedStaffProfile.id}</span>
                </div>
              </div>
            </div>

            {/* Profile Action Toolbar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    handleOpenEdit(selectedStaffProfile);
                  }}
                  className="px-3 py-1.5 bg-[#0c4a26] hover:bg-[#093a1d] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Edit Details
                </button>
                <button
                  onClick={() => {
                    setRoleChangeStaff(selectedStaffProfile);
                    setNewSelectedRole(selectedStaffProfile.role);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Change Role
                </button>
                <button
                  onClick={() => {
                    resetUserAccess(selectedStaffProfile.id);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  title="Reset PIN to 1234"
                >
                  Reset PIN
                </button>
                {canDeleteStaff() && (
                  <button
                    onClick={() => {
                      if (selectedStaffProfile.id === currentUser.id) {
                        notify('error', 'Cannot Delete Self', 'You cannot delete your own active administrator account.');
                        return;
                      }
                      setDeletingStaff(selectedStaffProfile);
                      setDeleteReason(`Staff record deleted by ${currentUser.name} (${currentUser.role})`);
                    }}
                    disabled={selectedStaffProfile.id === currentUser.id}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Delete Staff Member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Staff</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedStaffProfile(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. MODAL: EDIT STAFF DETAILS                                 */}
      {/* ============================================================ */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Edit Staff Details</h3>
                <p className="text-[11px] text-slate-500">Modify profile, branch, and status for {editingStaff.name}.</p>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Store Branch</label>
                  <select
                    value={editBranch}
                    onChange={(e) => setEditBranch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">POS PIN (4-digit passcode)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  placeholder="e.g. 1234"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0c4a26] hover:bg-[#093a1d] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. MODAL: ADD STAFF ACCOUNT                                  */}
      {/* ============================================================ */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Provision Staff Account</h3>
                <p className="text-[11px] text-slate-500">
                  Authorized managers and administrators can add and clear staff accounts.
                </p>
              </div>
              <button
                onClick={() => setIsAddStaffOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Marie Claire Uwase"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Role *</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Stock Manager">Stock Manager</option>
                    <option value="Manager">Manager</option>
                    <option value="Business Owner">Business Owner</option>
                    {currentUser.role === 'Super Admin' && <option value="Super Admin">Super Admin</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="marie@freshandmore.rw"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number (Rwanda)</label>
                  <input
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="+250 788 xxx xxx"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Branch Location</label>
                  <select
                    value={addBranch}
                    onChange={(e) => setAddBranch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial POS PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={addPin}
                    onChange={(e) => setAddPin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0c4a26]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0c4a26] hover:bg-[#093a1d] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. MODAL: ROLE CHANGE                                        */}
      {/* ============================================================ */}
      {roleChangeStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Change Staff Role</h3>
                <p className="text-[11px] text-slate-500">
                  Reassign clearance level for {roleChangeStaff.name}.
                </p>
              </div>
              <button
                onClick={() => setRoleChangeStaff(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Role</label>
                <select
                  value={newSelectedRole}
                  onChange={(e) => setNewSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                >
                  <option value="Cashier">Cashier</option>
                  <option value="Stock Manager">Stock Manager</option>
                  <option value="Manager">Manager</option>
                  <option value="Business Owner">Business Owner</option>
                  {currentUser.role === 'Super Admin' && <option value="Super Admin">Super Admin</option>}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Role Change</label>
                <input
                  value={roleChangeReason}
                  onChange={(e) => setRoleChangeReason(e.target.value)}
                  placeholder="e.g. Promotion to store supervisor"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRoleChangeStaff(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRoleChange}
                  className="px-4 py-2 bg-[#0c4a26] hover:bg-[#093a1d] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Confirm Reassignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. MODAL: DELETE STAFF MEMBER (SYSTEM ADMIN & BUSINESS OWNER) */}
      {/* ============================================================ */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 text-xs space-y-4 animate-in zoom-in-95 duration-200 text-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <span>Delete Staff Member</span>
              </div>
              <button
                onClick={() => setDeletingStaff(null)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer transition-colors"
                title="Cancel and close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Required Exact Confirmation Prompt */}
            <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-2xl space-y-2.5">
              <p className="text-red-950 font-bold text-sm leading-snug">
                “Are you sure you want to delete this staff member? This action cannot be undone.”
              </p>
              <div className="p-2.5 bg-white/80 rounded-xl border border-red-200/60 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{deletingStaff.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                    {deletingStaff.role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-mono">{deletingStaff.email}</p>
                <p className="text-[11px] text-slate-500">Branch: {deletingStaff.branch}</p>
              </div>
            </div>

            {/* Historical Records Preservation Notice */}
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1 text-slate-700">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Historical Records Preserved for Accountability</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-950">
                Deleting this staff member permanently deletes their account login credentials. All historical sales, transactions, customer payments, cash shift tallies, and audit records associated with this staff member will remain intact in the system for auditing and reporting.
              </p>
            </div>

            {/* Reason for Audit Logging */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">
                Audit Deletion Reason <span className="text-slate-400 font-normal">(Recorded in immutable Audit Log)</span>
              </label>
              <input
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Employee departure / contract conclusion"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            {/* Performing User Note */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Authorized Action by:</span>
              <span className="font-semibold text-slate-800">
                {currentUser.name} ({currentUser.role})
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting Staff...' : 'Delete Staff Member'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const UsersRolesView: React.FC = () => {
  return <StaffManagementView />;
};

export const AuditLogsView: React.FC = () => {
  const { auditLogs, currentUser, hasPermission, deleteAuditLog, clearAllAuditLogs } = useStore();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'Info' | 'Warning' | 'Critical'>('All');
  const [confirmClearAudit, setConfirmClearAudit] = useState(false);

  // Cashier cannot view audit logs per Section 5
  if (!hasPermission('audit_logs', 'view')) {
    return <AccessRestrictedView moduleName="audit_logs" requiredAction="view" />;
  }

  const filtered = auditLogs.filter((log) => {
    const matchesSeverity = severityFilter === 'All' || log.severity === severityFilter;
    const matchesSearch =
      !search ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.record.toLowerCase().includes(search.toLowerCase()) ||
      log.reason.toLowerCase().includes(search.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const exportAuditCSV = () => {
    const rows = [
      ['Date', 'User', 'Role', 'Module', 'Action', 'Target Record', 'Audit Reason', 'Severity'],
      ...filtered.map((l) => [l.date, l.user, l.role, l.module, l.action, l.record, l.reason, l.severity]),
    ];
    const csv = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = 'fresh_and_more_security_audit_logs.csv';
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Audit Trail & Governance Logs</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#0c4a26]">
              Immutable
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic ledger tracking sales, stock adjustments, cashier drawer events, role reassignments, and security breaches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'Super Admin' && auditLogs.length > 0 && (
            <button
              onClick={() => setConfirmClearAudit(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span>Clear All Logs</span>
            </button>
          )}
          {hasPermission('audit_logs', 'export') && (
            <button
              onClick={exportAuditCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Audit CSV</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Search & Severity filter */}
        <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <input
            type="text"
            placeholder="Search audit records, users, reasons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#0c4a26]"
          />

          <div className="flex items-center gap-1 overflow-x-auto">
            {(['All', 'Info', 'Warning', 'Critical'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  severityFilter === sev
                    ? 'bg-[#0c4a26] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b font-semibold text-slate-500">
                <th className="p-3">Timestamp</th>
                <th className="p-3">User & Role</th>
                <th className="p-3">Module</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target Record</th>
                <th className="p-3">Audit Reason</th>
                <th className="p-3">Severity</th>
                {currentUser.role === 'Super Admin' && <th className="p-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{log.date}</td>
                  <td className="p-3">
                    <p className="font-bold text-slate-800">{log.user}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{log.role}</p>
                  </td>
                  <td className="p-3 font-medium text-slate-600">{log.module}</td>
                  <td className="p-3 font-bold text-slate-900">{log.action}</td>
                  <td className="p-3 text-slate-700 font-mono text-[11px]">{log.record}</td>
                  <td className="p-3 text-slate-500 truncate max-w-xs">{log.reason}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.severity === 'Critical'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : log.severity === 'Warning'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                  {currentUser.role === 'Super Admin' && (
                    <td className="p-3 text-right">
                      <button
                        onClick={() => deleteAuditLog(log.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                        title="Delete this audit record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={confirmClearAudit}
        title="Clear Entire Audit Trail"
        description="Are you sure you want to permanently clear all security and operational audit logs? This action cannot be undone."
        onConfirm={() => {
          clearAllAuditLogs();
          setConfirmClearAudit(false);
        }}
        onCancel={() => setConfirmClearAudit(false)}
      />
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    deleteBranch,
    addBranch,
    switchToEmptyDatabase,
    resetToDemoDatabase,
    isEmptyDbMode,
    hasPermission,
    currentUser,
  } = useStore();
  const [storeName, setStoreName] = useState(settings.businessName);
  const [taxRate, setTaxRate] = useState(settings.defaultTaxRate.toString());
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [confirmDbModal, setConfirmDbModal] = useState<'empty' | 'demo' | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<{ id: string; name: string } | null>(null);
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [branchManager, setBranchManager] = useState('');
  const [branchIsWarehouse, setBranchIsWarehouse] = useState(false);

  // Cashier and Stock Manager cannot access system settings per Section 5
  if (!hasPermission('settings', 'view')) {
    return <AccessRestrictedView moduleName="settings" requiredAction="view" />;
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('settings', 'edit')) return;
    updateSettings({
      businessName: storeName,
      defaultTaxRate: Number(taxRate) || 18,
      phone,
      address,
    });
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchLocation.trim()) return;
    addBranch({
      name: branchName.trim(),
      location: branchLocation.trim(),
      manager: branchManager.trim() || currentUser.name,
      isWarehouse: branchIsWarehouse,
    });
    setBranchName('');
    setBranchLocation('');
    setBranchManager('');
    setBranchIsWarehouse(false);
    setIsAddBranchOpen(false);
  };

  const canEdit = hasPermission('settings', 'edit');

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">System & Branch Settings</h1>
        <p className="text-xs text-slate-500">Configure business identity, tax rates, thermal receipts, branches, and database modes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Business Profile */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs text-xs space-y-4">
          <h2 className="font-bold text-slate-900 text-sm border-b pb-2">Business Profile & Receipts</h2>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Supermarket Name</label>
              <input
                disabled={!canEdit}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-bold disabled:bg-slate-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Standard VAT Tax (%)</label>
                <input
                  disabled={!canEdit}
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-bold disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Store Currency</label>
                <input disabled value="RWF (Rwandan Franc)" className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-slate-500 font-bold" />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                disabled={!canEdit}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Physical Address</label>
              <input
                disabled={!canEdit}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg disabled:bg-slate-50"
              />
            </div>
            {canEdit && (
              <button type="submit" className="px-4 py-2 bg-[#0f532b] text-white font-bold rounded-lg shadow-sm cursor-pointer">
                Save Settings
              </button>
            )}
          </form>
        </div>

        {/* Database Management & Branches */}
        <div className="space-y-4">
          {/* Branch Outlets Management */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs text-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="font-bold text-slate-900 text-sm">Branches & Warehouses ({settings.branches.length})</h2>
              {canEdit && (
                <button
                  onClick={() => setIsAddBranchOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#0f532b] font-bold rounded-lg border border-emerald-200 text-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Branch</span>
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {settings.branches.map((b) => (
                <div
                  key={b.id}
                  className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{b.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          b.isWarehouse ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-[#0c4a26]'
                        }`}
                      >
                        {b.isWarehouse ? 'Warehouse' : 'Storefront'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{b.location} • Mgr: {b.manager}</p>
                  </div>
                  {canEdit && settings.branches.length > 1 && (
                    <button
                      onClick={() => setDeletingBranch(b)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                      title="Delete Branch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Database Management */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs text-xs space-y-4">
            <h2 className="font-bold text-slate-900 text-sm border-b pb-2">Database Environment</h2>
            <p className="text-slate-500">
              Switch between demo grocery simulation data and a fresh empty database for evaluation:
            </p>
            <div className="p-3 bg-slate-50 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">Current Mode:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isEmptyDbMode ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {isEmptyDbMode ? 'Empty Database Mode' : 'Kigali Demo Database'}
                </span>
              </div>
            </div>
            {canEdit && (
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setConfirmDbModal('empty')}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Switch to Empty Database (0 RWF Tests)
                </button>
                <button
                  onClick={() => setConfirmDbModal('demo')}
                  className="w-full py-2.5 bg-[#0f532b] hover:bg-[#0c4423] text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Reset to Kigali Fresh & More Demo Data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Branch Modal */}
      {isAddBranchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl p-5 text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-sm text-slate-900">Add Store Branch / Warehouse</h3>
              <button onClick={() => setIsAddBranchOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBranch} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Branch Name *</label>
                <input
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Remera Branch Outlet"
                  className="w-full px-3 py-2 border rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Physical Location *</label>
                <input
                  required
                  value={branchLocation}
                  onChange={(e) => setBranchLocation(e.target.value)}
                  placeholder="e.g. KG 17 Ave, Remera, Kigali"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Branch Manager</label>
                <input
                  value={branchManager}
                  onChange={(e) => setBranchManager(e.target.value)}
                  placeholder="e.g. Jean Claude N."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="warehouse-check"
                  checked={branchIsWarehouse}
                  onChange={(e) => setBranchIsWarehouse(e.target.checked)}
                  className="rounded text-[#0f532b]"
                />
                <label htmlFor="warehouse-check" className="font-bold text-slate-700 cursor-pointer">
                  This location is a primary Central Warehouse (Not a retail POS terminal)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddBranchOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0f532b] text-white font-bold rounded-lg cursor-pointer"
                >
                  Add Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Branch Confirm Dialog */}
      <ConfirmDialog
        open={deletingBranch !== null}
        title="Delete Store Branch"
        description={`Are you sure you want to remove branch "${deletingBranch?.name}"?`}
        onConfirm={() => {
          if (deletingBranch) {
            deleteBranch(deletingBranch.id);
            setDeletingBranch(null);
          }
        }}
        onCancel={() => setDeletingBranch(null)}
      />

      <ConfirmDialog
        open={confirmDbModal !== null}
        title={confirmDbModal === 'empty' ? 'Switch to Empty Database' : 'Reset Demo Data'}
        description={
          confirmDbModal === 'empty'
            ? 'This will clear sales, receipts, and inventory balances to test empty zero-RWF states.'
            : 'This will restore the complete Fresh & More Kigali supermarket dataset with products, sales, and accounts.'
        }
        onConfirm={() => {
          if (confirmDbModal === 'empty') switchToEmptyDatabase();
          else resetToDemoDatabase();
          setConfirmDbModal(null);
        }}
        onCancel={() => setConfirmDbModal(null)}
      />
    </div>
  );
};
