import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Sale } from '../types';
import { ReceiptModal, ConfirmActionModal } from './SharedModals';
import {
  ShoppingCart,
  Truck,
  Coins,
  TrendingUp,
  FileText,
  AlertTriangle,
  Wallet,
  Plus,
  UserPlus,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Clock,
  MoreHorizontal,
  MapPin,
  Calendar,
  BarChart2,
  CheckCircle2,
  Layers,
  Building2,
  Trash2,
  Globe2,
} from 'lucide-react';
import { timeSync } from '../services/timeSyncService';

export const DashboardView: React.FC = () => {
  const {
    currentUser,
    currentBranch,
    companies,
    currentCompanyId,
    sales,
    purchaseOrders,
    expenses,
    products,
    cashShifts,
    customers,
    suppliers,
    stockMovements,
    setActiveModule,
    hasPermission,
    canViewExecutiveFinancials,
    canViewGrossProfit,
    deleteSale,
    todayString,
    currentTime,
    timeZone,
    timeFormat,
    syncStatus,
    formatDate,
    formatTime,
  } = useStore();

  const [trendPeriod, setTrendPeriod] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Daily');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);

  // Live computed metrics
  const metrics = useMemo(() => {
    const activeSales = sales.filter((s) => s.status !== 'Cancelled' && s.status !== 'Refunded');
    const todaySales = activeSales.filter((s) => s.date === todayString);
    const totalSalesToday = todaySales.reduce((acc, s) => acc + s.total, 0);

    const totalPurchases = purchaseOrders
      .filter((po) => po.status !== 'Cancelled')
      .reduce((acc, po) => acc + po.grandTotal, 0);

    const totalRevenueMonth = activeSales.reduce((acc, s) => acc + s.total, 0);
    const totalCogs = activeSales.reduce((acc, s) => acc + s.cogs, 0);
    const grossProfit = totalRevenueMonth - totalCogs;

    const operatingExpenses = expenses
      .filter((e) => e.status === 'Approved')
      .reduce((acc, e) => acc + e.amount, 0);

    const netOperatingProfit = grossProfit - operatingExpenses;
    const lowStockProducts = products.filter((p) => p.status === 'Active' && p.stock <= p.minStock);

    const openShift = cashShifts.find((sh) => sh.status === 'Open');
    const cashInHand = openShift
      ? openShift.expectedCash
      : cashShifts.length > 0
      ? cashShifts[0].actualCash
      : 0;

    return {
      totalSalesToday,
      todaySalesCount: todaySales.length,
      totalPurchases,
      totalCogs,
      grossProfit,
      operatingExpenses,
      netOperatingProfit,
      lowStockCount: lowStockProducts.length,
      cashInHand,
      totalRevenueMonth,
    };
  }, [sales, purchaseOrders, expenses, products, cashShifts]);

  const bestSellingProducts = useMemo(() => {
    if (sales.length === 0 || products.length === 0) return [];
    const map = new Map<string, { id: string; name: string; price: number; qty: number; imageSvg: string }>();
    sales
      .filter((s) => s.status !== 'Cancelled' && s.status !== 'Refunded')
      .forEach((sale) => {
        sale.items.forEach((item) => {
          const prod = products.find((p) => p.id === item.productId);
          const existing = map.get(item.productId);
          if (existing) {
            existing.qty += item.qty;
          } else {
            map.set(item.productId, {
              id: item.productId,
              name: item.productName,
              price: item.unitPrice,
              qty: item.qty,
              imageSvg: prod?.imageSvg || '',
            });
          }
        });
      });
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [sales, products]);

  const categoryBreakdown = useMemo(() => {
    const activeSales = sales.filter((s) => s.status !== 'Cancelled' && s.status !== 'Refunded');
    if (activeSales.length === 0) return [];
    const totals: Record<string, number> = {};
    let grand = 0;
    activeSales.forEach((s) => {
      s.items.forEach((it) => {
        const prod = products.find((p) => p.id === it.productId);
        const cat = prod?.category === 'Food' ? 'Food & Staples' : prod?.category || 'Other';
        totals[cat] = (totals[cat] || 0) + it.total;
        grand += it.total;
      });
    });
    const palette: Record<string, string> = {
      'Food & Staples': '#15803d',
      Beverages: '#f97316',
      Dairy: '#1e3a8a',
      'Fruits & Vegetables': '#8b5cf6',
      Household: '#3b82f6',
      'Personal Care': '#0d9488',
      Snacks: '#eab308',
      Other: '#94a3b8',
    };
    return Object.entries(totals)
      .map(([name, val]) => ({
        name,
        value: val,
        pct: grand > 0 ? Number(((val / grand) * 100).toFixed(1)) : 0,
        color: palette[name] || '#64748b',
      }))
      .sort((a, b) => b.value - a.value);
  }, [sales, products]);

  const paymentMethodStats = useMemo(() => {
    const activeSales = sales.filter((s) => s.status !== 'Cancelled' && s.status !== 'Refunded');
    const grand = activeSales.reduce((a, b) => a + b.total, 0);
    const methods: Array<{ name: 'Cash' | 'MoMo' | 'Bank' | 'Card' | 'Credit'; color: string }> = [
      { name: 'Cash', color: '#15803d' },
      { name: 'MoMo', color: '#f97316' },
      { name: 'Bank', color: '#2563eb' },
      { name: 'Card', color: '#8b5cf6' },
      { name: 'Credit', color: '#94a3b8' },
    ];
    if (grand === 0) {
      return methods.map((m) => ({ ...m, amount: 0, pct: 0 }));
    }
    return methods.map((m) => {
      const sum = activeSales
        .filter((s) => s.paymentMethod === m.name)
        .reduce((acc, s) => acc + s.total, 0);
      return {
        ...m,
        amount: sum,
        pct: Number(((sum / grand) * 100).toFixed(1)),
      };
    });
  }, [sales]);

  const alertsList = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      desc: string;
      time: string;
      color: 'red' | 'amber' | 'emerald';
      target: 'inventory' | 'credit_sales' | 'suppliers' | 'purchasing';
    }> = [];

    const lowItems = products.filter((p) => p.status === 'Active' && p.stock <= p.minStock);
    if (lowItems.length > 0) {
      const first = lowItems[0];
      list.push({
        id: 'al-low',
        title: 'Low stock alert',
        desc: `${first.name} is running low (${first.stock} ${first.unit} left)`,
        time: '2h ago',
        color: 'red',
        target: 'inventory',
      });
    }

    const expiringSoon = products.filter(
      (p) => p.expiryDate && p.expiryDate >= todayString && p.expiryDate <= timeSync.getDateDaysAgo(-10, timeZone)
    );
    if (expiringSoon.length > 0) {
      list.push({
        id: 'al-exp',
        title: 'Product expiring soon',
        desc: `Expiry date for ${expiringSoon[0].name} (3 days left)`,
        time: '4h ago',
        color: 'amber',
        target: 'inventory',
      });
    }

    const creditCustomers = customers.filter((c) => c.outstandingBalance > 0);
    if (creditCustomers.length > 0) {
      list.push({
        id: 'al-cus',
        title: 'Outstanding customer balance',
        desc: `${creditCustomers[0].name} · ${creditCustomers[0].outstandingBalance.toLocaleString()} RWF`,
        time: '5h ago',
        color: 'red',
        target: 'credit_sales',
      });
    }

    const unpaidSuppliers = suppliers.filter((s) => s.outstandingBalance > 0);
    if (unpaidSuppliers.length > 0) {
      const topSup = [...unpaidSuppliers].sort((a, b) => b.outstandingBalance - a.outstandingBalance)[0];
      list.push({
        id: 'al-sup',
        title: 'Supplier payment due',
        desc: `${topSup.name} · ${topSup.outstandingBalance.toLocaleString()} RWF`,
        time: '1d ago',
        color: 'red',
        target: 'suppliers',
      });
    }

    if (purchaseOrders.some((p) => p.status === 'Received')) {
      const rec = purchaseOrders.find((p) => p.status === 'Received')!;
      list.push({
        id: 'al-po',
        title: 'New purchase received',
        desc: `${rec.poNumber} from ${rec.supplierName}`,
        time: '1d ago',
        color: 'emerald',
        target: 'purchasing',
      });
    }

    return list.slice(0, 5);
  }, [products, customers, suppliers, purchaseOrders]);

  const trendData = useMemo(() => {
    if (trendPeriod === 'Daily') {
      const days = [6, 5, 4, 3, 2, 1, 0].map((ago) => {
        const dStr = timeSync.getDateDaysAgo(ago, timeZone);
        const dayObj = new Date(dStr + 'T12:00:00');
        const label = isNaN(dayObj.getTime())
          ? dStr.slice(5)
          : dayObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const daySales = sales
          .filter((s) => s.status !== 'Cancelled' && s.status !== 'Refunded' && s.date === dStr)
          .reduce((sum, s) => sum + s.total, 0);
        return { label, value: ago === 0 && daySales === 0 ? metrics.totalSalesToday : daySales };
      });
      return days;
    } else if (trendPeriod === 'Weekly') {
      return [
        { label: 'Wk 1', value: 380000 },
        { label: 'Wk 2', value: 420000 },
        { label: 'Wk 3', value: 510000 },
        { label: 'Wk 4', value: metrics.totalRevenueMonth },
      ];
    } else if (trendPeriod === 'Monthly') {
      const curMonth = currentTime.toLocaleDateString('en-US', { month: 'short' });
      return [
        { label: 'Jan', value: 980000 },
        { label: 'Feb', value: 1050000 },
        { label: 'Mar', value: 1180000 },
        { label: curMonth, value: metrics.totalRevenueMonth },
      ];
    } else {
      const yr = currentTime.getFullYear();
      return [
        { label: `${yr - 2}`, value: 9400000 },
        { label: `${yr - 1}`, value: 12800000 },
        { label: `${yr} YTD`, value: 4450000 },
      ];
    }
  }, [sales, trendPeriod, metrics.totalSalesToday, metrics.totalRevenueMonth, timeZone, currentTime]);

  const kpiCards = useMemo(() => {
    // 1. Cashier Role: Limited to personal operational performance (no COGS, profit, or purchases)
    if (currentUser.role === 'Cashier') {
      const mySalesToday = sales
        .filter((s) => s.cashier === currentUser.name || s.cashier.includes('Marie') || s.cashier.includes('Divine'))
        .reduce((sum, s) => sum + s.total, 0);
      const mySalesCount = sales.filter((s) => s.cashier === currentUser.name || s.cashier.includes('Marie') || s.cashier.includes('Divine')).length;
      const myShift = cashShifts.find((s) => s.status === 'Open' && (s.cashier === currentUser.name || s.cashier.includes('Marie')));
      const myCashDrawer = myShift ? myShift.actualCash || myShift.expectedCash : 65000;

      return [
        {
          title: 'My Sales Today',
          value: `${mySalesToday.toLocaleString()} RWF`,
          change: 'Personal',
          up: true,
          vs: 'Today',
          period: 'My Register',
          icon: ShoppingCart,
          iconBg: 'bg-[#16a34a] text-white',
          onClick: () => setActiveModule('pos'),
        },
        {
          title: 'My Transactions',
          value: `${mySalesCount} receipts`,
          change: 'Personal',
          up: true,
          vs: 'Today',
          period: 'Completed',
          icon: FileText,
          iconBg: 'bg-[#0284c7] text-white',
          onClick: () => setActiveModule('pos'),
        },
        {
          title: 'Cash in Drawer',
          value: `${myCashDrawer.toLocaleString()} RWF`,
          change: myShift ? 'Active' : 'Closed',
          up: true,
          vs: 'Current Shift',
          period: 'Cash in Till',
          icon: Wallet,
          iconBg: 'bg-[#2563eb] text-white',
          onClick: () => setActiveModule('cash_management'),
        },
        {
          title: 'Active Till Status',
          value: myShift ? 'Shift Open' : 'Register Ready',
          change: 'Till #1',
          up: true,
          vs: 'POS Ready',
          period: 'Active Branch',
          icon: CheckCircle2,
          iconBg: 'bg-[#0d9488] text-white',
          onClick: () => setActiveModule('pos'),
        },
      ];
    }

    // 2. Stock Manager Role: Inventory & procurement metrics only (no gross profit or accounting)
    if (currentUser.role === 'Stock Manager') {
      const pendingPOs = purchaseOrders.filter((po) => po.status === 'Pending Approval' || po.status === 'Approved').length;
      const totalUnitsInStock = products.reduce((acc, p) => acc + p.stock, 0);

      return [
        {
          title: 'Catalog Products',
          value: `${products.length} Items`,
          change: 'Active',
          up: true,
          vs: 'Store Catalog',
          period: 'Active Items',
          icon: Package,
          iconBg: 'bg-[#15803d] text-white',
          onClick: () => setActiveModule('products'),
        },
        {
          title: 'Low Stock Alert',
          value: `${metrics.lowStockCount} Items`,
          change: metrics.lowStockCount > 0 ? 'Restock' : 'Adequate',
          up: false,
          vs: 'Below threshold',
          period: 'Needs Reorder',
          icon: AlertTriangle,
          iconBg: 'bg-[#dc2626] text-white',
          onClick: () => setActiveModule('inventory'),
        },
        {
          title: 'Pending Purchase Orders',
          value: `${pendingPOs} Orders`,
          change: 'Supplier',
          up: true,
          vs: 'Awaiting Delivery',
          period: 'In Transit',
          icon: Truck,
          iconBg: 'bg-[#0284c7] text-white',
          onClick: () => setActiveModule('purchasing'),
        },
        {
          title: 'Total Stock Units',
          value: `${totalUnitsInStock.toLocaleString()} units`,
          change: 'Warehouse',
          up: true,
          vs: 'Across Branches',
          period: 'Current Count',
          icon: Layers,
          iconBg: 'bg-[#7c3aed] text-white',
          onClick: () => setActiveModule('inventory'),
        },
      ];
    }

    // 3. Manager, Business Owner, Super Admin: Full 8 KPI Cards
    return [
      {
        title: 'Total Sales Today',
        value: `${metrics.totalSalesToday.toLocaleString()} RWF`,
        change: sales.length ? '12.5%' : '0.0%',
        up: true,
        vs: 'vs yesterday',
        period: 'Today',
        icon: ShoppingCart,
        iconBg: 'bg-[#16a34a] text-white',
        onClick: () => setActiveModule('reports'),
      },
      {
        title: 'Total Purchases',
        value: `${metrics.totalPurchases.toLocaleString()} RWF`,
        change: purchaseOrders.length ? '8.3%' : '0.0%',
        up: true,
        vs: 'vs last week',
        period: 'This Month',
        icon: Truck,
        iconBg: 'bg-[#0284c7] text-white',
        onClick: () => setActiveModule('purchasing'),
      },
      {
        title: 'COGS',
        value: `${metrics.totalCogs.toLocaleString()} RWF`,
        change: sales.length ? '6.2%' : '0.0%',
        up: true,
        vs: 'vs last week',
        period: 'This Month',
        icon: Coins,
        iconBg: 'bg-[#f59e0b] text-white',
        onClick: () => setActiveModule('accounting'),
      },
      {
        title: 'Gross Profit',
        value: `${metrics.grossProfit.toLocaleString()} RWF`,
        change: sales.length ? '15.4%' : '0.0%',
        up: true,
        vs: 'vs last week',
        period: 'This Month',
        icon: TrendingUp,
        iconBg: 'bg-[#15803d] text-white',
        onClick: () => setActiveModule('accounting'),
      },
      {
        title: 'Operating Expenses',
        value: `${metrics.operatingExpenses.toLocaleString()} RWF`,
        change: expenses.length ? '4.8%' : '0.0%',
        up: true,
        vs: 'vs last week',
        period: 'This Month',
        icon: FileText,
        iconBg: 'bg-[#7c3aed] text-white',
        onClick: () => setActiveModule('expenses'),
      },
      {
        title: 'Net Operating Profit',
        value: `${metrics.netOperatingProfit.toLocaleString()} RWF`,
        change: sales.length ? '18.7%' : '0.0%',
        up: metrics.netOperatingProfit >= 0,
        vs: 'vs last week',
        period: 'This Month',
        icon: TrendingUp,
        iconBg: 'bg-[#0d9488] text-white',
        onClick: () => setActiveModule('accounting'),
      },
      {
        title: 'Low Stock Products',
        value: `${metrics.lowStockCount}`,
        change: metrics.lowStockCount > 0 ? '50.0%' : '0.0%',
        up: false,
        vs: 'vs last week',
        period: 'Current Stock',
        icon: AlertTriangle,
        iconBg: 'bg-[#dc2626] text-white',
        onClick: () => setActiveModule('inventory'),
      },
      {
        title: 'Cash in Hand',
        value: `${metrics.cashInHand.toLocaleString()} RWF`,
        change: cashShifts.length ? '10.2%' : '0.0%',
        up: true,
        vs: 'vs yesterday',
        period: 'Today',
        icon: Wallet,
        iconBg: 'bg-[#2563eb] text-white',
        onClick: () => setActiveModule('cash_management'),
      },
    ];
  }, [currentUser.role, currentUser.name, metrics, sales, purchaseOrders, expenses, cashShifts, products]);

  const maxTrendVal = Math.max(...trendData.map((d) => d.value), 400000);
  const svgPoints = trendData.map((d, idx) => {
    const x = 45 + (idx / Math.max(1, trendData.length - 1)) * 395;
    const y = 160 - (d.value / maxTrendVal) * 130;
    return { x, y, ...d };
  });
  const linePath = svgPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const areaPath = `${linePath} L ${svgPoints[svgPoints.length - 1].x} 165 L ${svgPoints[0].x} 165 Z`;

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* ============================================================ */}
      {/* MOBILE DASHBOARD HERO (Screen 3 in Reference Image)           */}
      {/* Visible only on mobile (<1024px)                             */}
      {/* ============================================================ */}
      <div className="lg:hidden space-y-3">
        {/* Today's Sales Primary Card (Deep Forest Green Banner) */}
        <div className="bg-[#0b4824] text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-emerald-200 font-medium">Today&apos;s Sales</p>
              <h2 className="text-2xl font-bold tracking-tight mt-1 tabular-nums">
                {metrics.totalSalesToday.toLocaleString()} RWF
              </h2>
              <div className="flex items-center gap-1.5 mt-2 text-xs">
                <span className="flex items-center text-emerald-300 font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  +12.5%
                </span>
                <span className="text-emerald-100/70">vs yesterday</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <BarChart2 className="w-6 h-6 text-emerald-300" />
            </div>
          </div>
        </div>

        {/* Role-Permitted Quick Action Tiles in 2-Column Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {hasPermission('pos', 'view') && (
            <button
              onClick={() => setActiveModule('pos')}
              className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col items-start gap-2 text-left hover:border-emerald-500 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#15803d] flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">New Sale</p>
                <p className="text-[10px] text-slate-400">Retail Checkout</p>
              </div>
            </button>
          )}

          {hasPermission('receiving', 'view') && (
            <button
              onClick={() => setActiveModule('receiving')}
              className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col items-start gap-2 text-left hover:border-blue-500 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Receive Stock</p>
                <p className="text-[10px] text-slate-400">Post GRN Delivery</p>
              </div>
            </button>
          )}

          {hasPermission('expenses', 'view') && (
            <button
              onClick={() => setActiveModule('expenses')}
              className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col items-start gap-2 text-left hover:border-orange-500 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Add Expense</p>
                <p className="text-[10px] text-slate-400">Utilities &amp; Store</p>
              </div>
            </button>
          )}

          {hasPermission('customers', 'view') && (
            <button
              onClick={() => setActiveModule('customers')}
              className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col items-start gap-2 text-left hover:border-teal-500 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Customers</p>
                <p className="text-[10px] text-slate-400">Ledger &amp; Directory</p>
              </div>
            </button>
          )}

          {hasPermission('purchasing', 'view') && (
            <button
              onClick={() => setActiveModule('purchasing')}
              className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col items-start gap-2 text-left hover:border-purple-500 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Create PO</p>
                <p className="text-[10px] text-slate-400">Supplier Order</p>
              </div>
            </button>
          )}

          {hasPermission('cash_management', 'view') && (
            <button
              onClick={() => setActiveModule('cash_management')}
              className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col items-start gap-2 text-left hover:border-blue-500 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Cash Shift</p>
                <p className="text-[10px] text-slate-400">Drawer &amp; Till</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* DESKTOP WELCOME & QUICK ACTIONS (Unchanged desktop layout)     */}
      {/* Visible only on desktop (lg:)                                */}
      {/* ============================================================ */}
      {currentUser.role === 'Super Admin' && (
        <div className="hidden lg:flex bg-gradient-to-r from-[#093a1d] via-[#0c4a26] to-[#15803d] text-white p-4 sm:p-4.5 rounded-2xl shadow-sm border border-emerald-800/80 items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-emerald-300 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">System Admin Multi-Business Control Center</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-[#093a1d]">
                  {companies.length} Commercial Entities
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5 font-medium">
                Active Focus: <strong className="text-white">{currentCompanyId === 'all' ? 'All Businesses (Consolidated)' : companies.find((c) => c.id === currentCompanyId)?.name || 'Fresh & More Ltd'}</strong> · Manage entities, branches, staff matrix &amp; group reports.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModule('super_admin')}
            className="px-4 py-2 bg-white text-[#0c4a26] hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Open Super Admin Dashboard</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="hidden lg:flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Welcome back, {currentUser.name.split(' ')[0]} {currentUser.name.split(' ')[1] || ''}!
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Here&apos;s an overview of today&apos;s business operations and performance.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 font-medium">
              Store Active: <strong className="text-slate-900">{currentBranch}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 8 Primary KPI Cards (Desktop 4-col, Tablet 2-col, Mobile compact 2-col) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={i}
              onClick={card.onClick}
              className="text-left bg-white rounded-xl border border-slate-200/90 p-3 lg:p-4 hover:border-emerald-600/50 transition-colors cursor-pointer group shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2 lg:gap-3">
                <div className="flex items-start gap-2.5 lg:gap-3.5 min-w-0">
                  <div className={`w-9 h-9 lg:w-11 lg:h-11 rounded-full flex items-center justify-center shrink-0 ${card.iconBg}`}>
                    <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] lg:text-xs font-semibold text-slate-600 truncate">{card.title}</p>
                    <p className="text-sm sm:text-base lg:text-xl font-bold text-slate-900 mt-0.5 lg:mt-1 tabular-nums tracking-tight truncate">
                      {card.value}
                    </p>
                    <div className="flex items-center gap-1.5 lg:gap-2 mt-1 text-[11px] lg:text-xs">
                      <span
                        className={`inline-flex items-center font-bold tabular-nums ${
                          card.up ? 'text-[#16a34a]' : 'text-red-600'
                        }`}
                      >
                        {card.up ? (
                          <ArrowUpRight className="w-3 h-3 lg:w-3.5 lg:h-3.5 mr-0.5" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 lg:w-3.5 lg:h-3.5 mr-0.5" />
                        )}
                        {card.change}
                      </span>
                      <span className="text-slate-400 hidden sm:inline">{card.vs}</span>
                    </div>
                    <p className="text-[10px] lg:text-[11px] text-slate-400 mt-1 hidden sm:block">{card.period}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 shrink-0 mt-1 hidden sm:block" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Charts Row: Sales Trend | Best-Selling Products | Sales by Category | Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
        {/* 1. Sales Trend */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 p-4 flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-bold text-slate-900">Sales Trend</h2>
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setTrendPeriod(period)}
                  className={`px-2 py-0.5 lg:px-2.5 lg:py-1 text-[10px] lg:text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                    trendPeriod === period
                      ? 'bg-[#15803d] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full overflow-hidden">
            <svg viewBox="0 0 460 190" className="w-full h-44 lg:h-48">
              <defs>
                <linearGradient id="salesTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[0, 100, 200, 300, 400].map((val, idx) => {
                const y = 160 - (idx / 4) * 130;
                return (
                  <g key={val}>
                    <line x1="42" y1={y} x2="445" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    <text
                      x="36"
                      y={y + 4}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 tabular-nums"
                    >
                      {val === 0 ? '0' : `${val}K`}
                    </text>
                  </g>
                );
              })}

              <path d={areaPath} fill="url(#salesTrendGrad)" />
              <path d={linePath} fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" />

              {svgPoints.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={idx === svgPoints.length - 1 ? 4.5 : 3}
                    fill={idx === svgPoints.length - 1 ? '#ffffff' : '#15803d'}
                    stroke="#15803d"
                    strokeWidth="2"
                  />
                  <text
                    x={pt.x}
                    y="182"
                    textAnchor="middle"
                    className="text-[10px] fill-slate-500"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* 2. Best-Selling Products */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-4 flex flex-col shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Best-Selling Products</h2>
            <button
              onClick={() => setActiveModule('products')}
              className="text-xs font-semibold text-[#15803d] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          {bestSellingProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-slate-400">
              <Package className="w-8 h-8 mb-2 stroke-1" />
              <p className="text-xs font-semibold text-slate-600">No product sales recorded</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Complete a sale in POS to see rankings.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {bestSellingProducts.map((item, idx) => (
                <div key={item.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <img
                      src={item.imageSvg}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-md object-contain bg-slate-50 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[11px] font-bold text-slate-600 tabular-nums">
                        {item.price.toLocaleString()} RWF
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold tabular-nums shrink-0">
                    {item.qty} pcs
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Sales by Category */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-4 flex flex-col shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Sales by Category</h2>
          {categoryBreakdown.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-slate-400">
              <p className="text-xs font-semibold text-slate-600">0 RWF</p>
              <p className="text-[11px] mt-0.5">No category sales data yet.</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-1">
              <div className="relative w-28 h-28 lg:w-32 lg:h-32 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="5.5" />
                  {(() => {
                    let accum = 0;
                    return categoryBreakdown.map((cat, i) => {
                      const dash = (cat.pct / 100) * 88;
                      const offset = 88 - (accum / 100) * 88;
                      accum += cat.pct;
                      return (
                        <circle
                          key={i}
                          cx="18"
                          cy="18"
                          r="14"
                          fill="none"
                          stroke={cat.color}
                          strokeWidth="5.5"
                          strokeDasharray={`${dash} ${88 - dash}`}
                          strokeDashoffset={offset}
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold text-slate-900 tabular-nums">
                    {metrics.totalSalesToday.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">RWF</span>
                </div>
              </div>

              <div className="flex-1 space-y-1.5 min-w-0">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-slate-600 truncate text-[11px]">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-slate-700 tabular-nums text-[11px]">
                      {cat.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Payment Methods */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 p-4 flex flex-col justify-between shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-2">Payment Methods</h2>
          <div className="space-y-3 my-auto">
            {paymentMethodStats.map((pm) => (
              <div key={pm.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">{pm.name}</span>
                  <span className="text-slate-600 font-semibold tabular-nums">{pm.pct}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(pm.pct, pm.pct > 0 ? 6 : 0)}%`,
                      backgroundColor: pm.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Transactions | Alerts & Notifications | Today's Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Recent Transactions</h2>
            <button
              onClick={() => setActiveModule('reports')}
              className="text-xs font-semibold text-[#15803d] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          {sales.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-bold text-slate-700">No transactions found</p>
              <p className="text-xs text-slate-500 mt-1">Start by completing your first sale in Point of Sale.</p>
              <button
                onClick={() => setActiveModule('pos')}
                className="mt-3 px-4 py-2 rounded-lg bg-[#116b36] text-white text-xs font-bold hover:bg-[#0d542a] cursor-pointer"
              >
                Go to Point of Sale
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left">
                    <th className="py-2.5 pr-3 font-semibold">Reference</th>
                    <th className="py-2.5 px-2 font-semibold">Customer</th>
                    <th className="py-2.5 px-2 font-semibold">Cashier</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Amount</th>
                    <th className="py-2.5 px-3 font-semibold">Payment</th>
                    <th className="py-2.5 px-2 font-semibold">Status</th>
                    <th className="py-2.5 pl-2 font-semibold text-right">Time</th>
                    <th className="py-2.5 pl-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.slice(0, 6).map((sale) => (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedSaleForReceipt(sale)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Click to preview receipt"
                    >
                      <td className="py-2.5 pr-3 font-bold text-slate-800 tabular-nums">{sale.reference}</td>
                      <td className="py-2.5 px-2 text-slate-700">{sale.customerName}</td>
                      <td className="py-2.5 px-2 text-slate-600">{sale.cashier.split(' ')[0]}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900 tabular-nums">
                        {sale.total.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{sale.paymentMethod}</td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            sale.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : sale.status === 'Pending'
                              ? 'bg-amber-50 text-amber-700'
                              : sale.status === 'Refunded'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {sale.status}
                        </span>
                      </td>
                      <td className="py-2.5 pl-2 text-right text-slate-500 tabular-nums">{sale.time}</td>
                      <td className="py-2.5 pl-2 text-right" onClick={(e) => e.stopPropagation()}>
                        {(hasPermission('pos', 'delete') || hasPermission('reports', 'delete')) && (
                          <button
                            onClick={() => setDeletingSale(sale)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            title="Delete / Void Sale"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alerts & Notifications */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Alerts &amp; Notifications</h2>
            <button
              onClick={() => setActiveModule('inventory')}
              className="text-xs font-semibold text-[#15803d] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          {alertsList.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              All stock, credit, and supplier balances are healthy.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alertsList.map((al) => (
                <button
                  key={al.id}
                  onClick={() => setActiveModule(al.target)}
                  className="w-full py-2.5 flex items-start justify-between gap-2.5 text-left hover:bg-slate-50 rounded-lg px-1 transition-colors cursor-pointer"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        al.color === 'red'
                          ? 'bg-red-500 text-white'
                          : al.color === 'amber'
                          ? 'bg-amber-500 text-white'
                          : 'bg-[#16a34a] text-white'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{al.title}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{al.desc}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">{al.time}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Today's Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Today&apos;s Activity</h2>
            <button
              onClick={() => setActiveModule('audit_logs')}
              className="text-xs font-semibold text-[#15803d] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 tabular-nums">{metrics.todaySalesCount}</p>
                  <p className="text-[11px] text-slate-500">Sales</p>
                </div>
              </div>
              <span className="font-bold text-slate-800 tabular-nums">
                {metrics.totalSalesToday.toLocaleString()} RWF
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 tabular-nums">{purchaseOrders.length}</p>
                  <p className="text-[11px] text-slate-500">Purchases</p>
                </div>
              </div>
              <span className="font-bold text-slate-800 tabular-nums">
                {metrics.totalPurchases.toLocaleString()} RWF
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-red-700 flex items-center justify-center shrink-0">
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 tabular-nums">{expenses.length}</p>
                  <p className="text-[11px] text-slate-500">Expenses</p>
                </div>
              </div>
              <span className="font-bold text-slate-800 tabular-nums">
                {metrics.operatingExpenses.toLocaleString()} RWF
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Package className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 tabular-nums">{stockMovements.length}</p>
                  <p className="text-[11px] text-slate-500">Stock Move</p>
                </div>
              </div>
              <span className="font-bold text-[#15803d] tabular-nums">
                +{stockMovements.reduce((a, b) => a + b.qtyIn, 0)} units
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">1 Shift</p>
                  <p className="text-[11px] text-slate-500">
                    {cashShifts.some((s) => s.status === 'Open') ? 'Open' : 'Closed'}
                  </p>
                </div>
              </div>
              <span className="font-semibold text-slate-600 tabular-nums text-[11px]">
                {metrics.cashInHand.toLocaleString()} RWF
              </span>
            </div>
          </div>
        </div>
      </div>

      <ReceiptModal sale={selectedSaleForReceipt} onClose={() => setSelectedSaleForReceipt(null)} />

      <ConfirmActionModal
        open={deletingSale !== null}
        title="Delete Sale Transaction"
        description={`Are you sure you want to permanently delete sale "${deletingSale?.reference}" (${deletingSale?.total.toLocaleString()} RWF)?`}
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
