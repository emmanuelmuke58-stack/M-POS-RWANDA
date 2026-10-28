import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { SaleItem, PaymentMethod, PaymentSplit, Sale } from '../types';
import { timeSync } from '../services/timeSyncService';
import {
  Store,
  ShoppingCart,
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  Printer,
  Download,
  RotateCcw,
  Calendar,
  Clock,
  Cloud,
  User,
  Users,
  Bell,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
  Package,
  TrendingUp,
  Settings,
  ClipboardList,
  LayoutGrid,
  Utensils,
  Coffee,
  Milk,
  Apple,
  Home,
  Heart,
  Cookie,
  Pause,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
  Percent,
} from 'lucide-react';

export interface POSViewProps {
  onSwitchToWebsite?: () => void;
}

interface CategoryOption {
  key: string;
  label: string;
  icon: React.ElementType;
}

const CATEGORIES: CategoryOption[] = [
  { key: 'All', label: 'All', icon: LayoutGrid },
  { key: 'Food', label: 'Food', icon: Utensils },
  { key: 'Beverages', label: 'Beverages', icon: Coffee },
  { key: 'Dairy', label: 'Dairy', icon: Milk },
  { key: 'Fruits & Veg', label: 'Fruits & Veg', icon: Apple },
  { key: 'Household', label: 'Household', icon: Home },
  { key: 'Personal Care', label: 'Personal Care', icon: Heart },
  { key: 'Snacks', label: 'Snacks', icon: Cookie },
];

export const POSView: React.FC<POSViewProps> = ({ onSwitchToWebsite }) => {
  const {
    products,
    customers,
    settings,
    heldSales,
    completeSale,
    holdSale,
    removeHeldSale,
    notify,
    setActiveModule,
    currentTime,
    timeZone,
    timeFormat,
    currentBranch,
    currentUser,
    hasPermission,
    currentCompany,
    logout,
    isFirebaseConnected,
    firebaseProjectId,
  } = useStore();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart & Order State
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cus-0');
  const [orderDiscountPercent, setOrderDiscountPercent] = useState<number>(0);
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [manualDiscountInput, setManualDiscountInput] = useState<string>('0');

  // Order reference counter (e.g. #000123)
  const [orderNumber, setOrderNumber] = useState<string>('#000123');

  // Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [momoPhone, setMomoPhone] = useState<string>('+250 788 ');
  const [splits, setSplits] = useState<PaymentSplit[]>([
    { method: 'Cash', amount: 0 },
    { method: 'MoMo', amount: 0 },
  ]);

  // Modals & Panels
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [heldDrawerOpen, setHeldDrawerOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [mobileCartDrawerOpen, setMobileCartDrawerOpen] = useState(false);

  // Live Kigali Clock
  const [liveClock, setLiveClock] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timeZone || 'Africa/Kigali',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: timeFormat === '12h',
      };
      setLiveClock(now.toLocaleString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timeZone, timeFormat]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status !== 'Active') return false;

      let matchesCat = selectedCategory === 'All';
      if (selectedCategory === 'Fruits & Veg') {
        matchesCat = p.category === 'Fruits & Vegetables';
      } else if (selectedCategory !== 'All') {
        matchesCat = p.category === selectedCategory;
      }

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Add Product to Cart
  const addToCart = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    if (prod.stock <= 0) {
      notify('error', 'Out of Stock', `${prod.name} has 0 units available in inventory.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        if (existing.qty + 1 > prod.stock) {
          notify('warning', 'Stock Limit Reached', `Only ${prod.stock} ${prod.unit} available in inventory.`);
          return prev;
        }
        const nextQty = existing.qty + 1;
        return prev.map((i) =>
          i.productId === productId
            ? { ...i, qty: nextQty, total: Math.max(0, nextQty * i.unitPrice - i.discount) }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          unit: prod.unit,
          qty: 1,
          unitPrice: prod.sellingPrice,
          costPrice: prod.costPrice,
          discount: 0,
          taxRate: prod.taxRate,
          total: prod.sellingPrice,
        },
      ];
    });
  };

  // Barcode / Enter key search handling
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const exactMatch = products.find(
        (p) => p.barcode.toLowerCase() === q || p.sku.toLowerCase() === q
      );
      if (exactMatch) {
        addToCart(exactMatch.id);
        setSearchQuery('');
        notify('success', 'Product Added', `Added ${exactMatch.name} to order.`);
      } else if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0].id);
        setSearchQuery('');
        notify('success', 'Product Added', `Added ${filteredProducts[0].name} to order.`);
      }
    }
  };

  // Quantity Controls
  const updateQty = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const nextQty = item.qty + delta;
          if (nextQty <= 0) return null;
          if (prod && nextQty > prod.stock) {
            notify('warning', 'Stock Limit Reached', `Only ${prod.stock} ${prod.unit} available.`);
            return item;
          }
          return {
            ...item,
            qty: nextQty,
            total: Math.max(0, nextQty * item.unitPrice - item.discount),
          };
        })
        .filter(Boolean) as SaleItem[]
    );
  };

  // Remove from Cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Clear Cart
  const clearCart = () => {
    setCart([]);
    setOrderDiscountPercent(0);
    setManualDiscountInput('0');
    setAmountReceived('');
    setCancelConfirmOpen(false);
  };

  // Order Totals Calculation
  const totals = useMemo(() => {
    const grossSubtotal = cart.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);

    // Apply overall order discount percent if applicable
    const allowedDiscountMax = settings?.maxCashierDiscountPercent || 15;
    const effectiveDiscountPercent = Math.min(orderDiscountPercent, allowedDiscountMax);
    const calculatedDiscount = Math.round((grossSubtotal * effectiveDiscountPercent) / 100);

    const payableTotal = Math.max(0, grossSubtotal - calculatedDiscount);

    // Tax calculation according to Rwandan 18% standard VAT or item configuration
    const totalTax = cart.reduce((acc, i) => {
      if (i.taxRate <= 0) return acc;
      const itemNet = i.total * (1 - effectiveDiscountPercent / 100);
      return acc + Math.round((itemNet * i.taxRate) / (100 + i.taxRate));
    }, 0);

    const totalCogs = cart.reduce((acc, i) => acc + i.qty * i.costPrice, 0);

    return {
      subtotal: grossSubtotal,
      discount: calculatedDiscount,
      discountPercent: effectiveDiscountPercent,
      tax: totalTax,
      total: payableTotal,
      cogs: totalCogs,
      totalItemsCount: cart.reduce((sum, item) => sum + item.qty, 0),
    };
  }, [cart, orderDiscountPercent, settings]);

  // Cash tendered calculations
  const numericCashReceived = Number(amountReceived) || 0;
  const changeAmount =
    paymentMethod === 'Cash' && numericCashReceived > totals.total
      ? numericCashReceived - totals.total
      : 0;

  const splitAllocatedTotal = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

  // Hold Sale
  const handleHoldSale = () => {
    if (cart.length === 0) {
      notify('warning', 'Empty Cart', 'Add products to the order before holding.');
      return;
    }
    const cust = customers.find((c) => c.id === selectedCustomerId) || customers[0];
    holdSale({
      customerName: cust?.name || 'Walk-in Customer',
      items: cart,
      total: totals.total,
    });
    setCart([]);
    setOrderDiscountPercent(0);
    notify('info', 'Order Held', `Order held for ${cust?.name || 'Walk-in Customer'}.`);
  };

  // Recall Held Sale
  const handleRecallHeld = (heldId: string) => {
    const found = heldSales.find((h) => h.id === heldId);
    if (!found) return;
    setCart(found.items);
    removeHeldSale(heldId);
    setHeldDrawerOpen(false);
    notify('success', 'Order Recalled', `Recalled order with ${found.items.length} items.`);
  };

  // Complete Sale
  const handleCompleteSale = () => {
    if (cart.length === 0) {
      notify('warning', 'Cart is Empty', 'Select products from the catalog to start an order.');
      return;
    }

    const cust = customers.find((c) => c.id === selectedCustomerId) || customers[0];

    // Credit Sale checks
    if (paymentMethod === 'Credit') {
      if (!cust || cust.id === 'cus-0' || cust.name === 'Walk-in Customer') {
        notify('error', 'Customer Required for Credit', 'Please select a registered customer for Credit Sales.');
        return;
      }
      if (cust.outstandingBalance + totals.total > cust.creditLimit) {
        notify(
          'error',
          'Credit Limit Exceeded',
          `${cust.name}'s credit limit is ${cust.creditLimit.toLocaleString()} RWF (Current balance: ${cust.outstandingBalance.toLocaleString()} RWF).`
        );
        return;
      }
    }

    // Cash Tender check
    if (paymentMethod === 'Cash' && numericCashReceived > 0 && numericCashReceived < totals.total) {
      notify(
        'error',
        'Insufficient Cash Received',
        `Amount received (${numericCashReceived.toLocaleString()} RWF) is less than total due (${totals.total.toLocaleString()} RWF).`
      );
      return;
    }

    // Split Payment check
    if (paymentMethod === 'Split Payment' && splitAllocatedTotal !== totals.total) {
      notify(
        'error',
        'Split Allocation Mismatch',
        `Allocated split payments (${splitAllocatedTotal.toLocaleString()} RWF) must match Total (${totals.total.toLocaleString()} RWF).`
      );
      return;
    }

    const creditPortion =
      paymentMethod === 'Credit'
        ? totals.total
        : paymentMethod === 'Split Payment'
        ? splits.filter((s) => s.method === 'Credit').reduce((a, b) => a + b.amount, 0)
        : 0;

    const paidAmount = totals.total - creditPortion;
    const finalReceived =
      paymentMethod === 'Cash'
        ? numericCashReceived || totals.total
        : paymentMethod === 'Credit'
        ? 0
        : totals.total;

    const saleRecord = completeSale({
      customerId: cust?.id || 'cus-0',
      customerName: cust?.name || 'Walk-in Customer',
      items: cart,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total,
      cogs: totals.cogs,
      paymentMethod,
      splits: paymentMethod === 'Split Payment' ? splits : undefined,
      amountReceived: finalReceived,
      changeGiven: paymentMethod === 'Cash' ? Math.max(0, finalReceived - totals.total) : 0,
      paidAmount,
      balanceDue: creditPortion,
      dueDate: creditPortion > 0 ? timeSync.getDateDaysAgo(-7, timeZone) : undefined,
      status: creditPortion > 0 ? 'Pending' : 'Completed',
    });

    if (saleRecord) {
      setCompletedSale(saleRecord);
      setCart([]);
      setOrderDiscountPercent(0);
      setManualDiscountInput('0');
      setAmountReceived('');
      setCheckoutModalOpen(false);
      setMobileCartDrawerOpen(false);

      // Increment order number
      const nextNum = Math.floor(100000 + Math.random() * 900000);
      setOrderNumber(`#${nextNum}`);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f1f5f9] text-slate-800 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-950">
      {/* ============================================================ */}
      {/* 1. LEFT NAVIGATION SIDEBAR (Matching Mockup Design)          */}
      {/* ============================================================ */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#0c4a26] text-white shrink-0 border-r border-[#08331a] select-none">
        {/* Brand Header */}
        <div className="h-20 px-5 flex items-center gap-3 border-b border-emerald-900/60 bg-[#093a1d]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-green-300 flex items-center justify-center text-[#093a1d] font-black shadow-md shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div className="leading-tight truncate">
            <h1 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>Fresh &amp; More</span>
            </h1>
            <p className="text-[11px] text-emerald-300 font-semibold tracking-wide">M-POS Terminal</p>
          </div>
        </div>

        {/* Navigation Menu List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 text-xs font-semibold custom-scrollbar">
          {/* POS Terminal (Active Highlighted) */}
          <button
            onClick={() => setActiveModule('pos')}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-[#16a34a] text-white font-bold shadow-md shadow-emerald-950/20 cursor-pointer transition-all"
          >
            <ShoppingCart className="w-4 h-4 text-white" />
            <span className="truncate text-left text-sm tracking-wide">POS Terminal</span>
          </button>

          {/* Orders / Sales Ledger */}
          <button
            onClick={() => setActiveModule('credit_sales')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-emerald-100/80 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
          >
            <ClipboardList className="w-4 h-4 text-emerald-300/80" />
            <span className="truncate text-left">Orders &amp; Sales</span>
          </button>

          {/* Products / Menu Management */}
          <button
            onClick={() => setActiveModule('products')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-emerald-100/80 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
          >
            <Package className="w-4 h-4 text-emerald-300/80" />
            <span className="truncate text-left">Products</span>
          </button>

          {/* Inventory */}
          <button
            onClick={() => setActiveModule('inventory')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-emerald-100/80 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
          >
            <Layers className="w-4 h-4 text-emerald-300/80" />
            <span className="truncate text-left">Inventory</span>
          </button>

          {/* Customers */}
          <button
            onClick={() => setActiveModule('customers')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-emerald-100/80 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
          >
            <Users className="w-4 h-4 text-emerald-300/80" />
            <span className="truncate text-left">Customers</span>
          </button>

          {/* Reports */}
          <button
            onClick={() => setActiveModule('reports')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-emerald-100/80 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-emerald-300/80" />
            <span className="truncate text-left">Reports</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setActiveModule('settings')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-emerald-100/80 hover:bg-white/10 hover:text-white cursor-pointer transition-colors"
          >
            <Settings className="w-4 h-4 text-emerald-300/80" />
            <span className="truncate text-left">Settings</span>
          </button>
        </nav>

        {/* Bottom Slogan & Storefront Link */}
        <div className="p-3 bg-[#082e18] border-t border-emerald-900/60 space-y-2">
          {onSwitchToWebsite && (
            <button
              onClick={onSwitchToWebsite}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-emerald-100 text-xs font-semibold transition-colors cursor-pointer"
              title="Return to Public Customer Storefront"
            >
              <Store className="w-3.5 h-3.5 text-emerald-300" />
              <span>Store Website</span>
              <ExternalLink className="w-3 h-3 text-emerald-400" />
            </button>
          )}

          <div className="px-3 py-2 rounded-xl bg-black/20 flex items-center gap-2.5 text-emerald-200">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-[11px] leading-tight">
              <p className="font-bold text-white">Fresh &amp; More</p>
              <p className="text-emerald-300/80 text-[10px]">Quality Grocery Everyday</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* 2. MAIN WORKSPACE (Top Bar + Products + Current Order)       */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* ============================================================ */}
        {/* TOP NAVIGATION BAR                                           */}
        {/* ============================================================ */}
        <header className="h-18 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-20 shadow-2xs">
          {/* Left: Brand Identity & Terminal Title + Online Status */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mobile menu trigger */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#0c4a26] text-white flex items-center justify-center font-bold">
                <Store className="w-5 h-5 text-emerald-300" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">POS Terminal</h2>
                {/* Glowing Online Status Pill */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online</span>
                </span>
                {isFirebaseConnected && (
                  <span
                    className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-300/60"
                    title={`Cloud synchronized with Firebase (${firebaseProjectId})`}
                  >
                    <Cloud className="w-3 h-3 text-emerald-600" />
                    <span>Firestore</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                {currentBranch || 'Kigali Downtown Store'}
              </p>
            </div>
          </div>

          {/* Center: Search Bar for Product Name, Barcode, or SKU */}
          <div className="flex-1 max-w-xl mx-2 sm:mx-4">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search products by name, barcode, or SKU... (Enter to add)"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 border border-transparent focus:border-emerald-600 focus:outline-none transition-all shadow-inner"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => searchInputRef.current?.focus()}
                  className="absolute right-3 p-1 text-slate-400 hover:text-[#0c4a26] cursor-pointer"
                  title="Scan Barcode"
                >
                  <Barcode className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Date/Time + Cashier Profile + Notifications */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live Kigali Clock */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span className="tabular-nums font-semibold">{liveClock || 'Loading clock...'}</span>
            </div>

            {/* Held Orders Recall Badge Button */}
            {heldSales.length > 0 && (
              <button
                onClick={() => setHeldDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Recall held orders"
              >
                <Pause className="w-3.5 h-3.5 text-amber-600" />
                <span>Held ({heldSales.length})</span>
              </button>
            )}

            {/* Cashier Profile Chip */}
            <div className="flex items-center gap-2.5 pl-2 sm:border-l sm:border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0c4a26] to-[#15803d] text-white flex items-center justify-center font-extrabold text-xs shadow-2xs">
                {currentUser?.name?.slice(0, 2).toUpperCase() || 'EM'}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                  {currentUser?.name || 'Emmanuel'}
                </p>
                <p className="text-[10px] text-emerald-700 font-semibold">{currentUser?.role || 'Cashier'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* MAIN BODY: PRODUCT AREA + CURRENT ORDER PANEL                */}
        {/* ============================================================ */}
        <div className="flex-1 flex overflow-hidden">
          {/* ---------------------------------------------------------- */}
          {/* PRODUCT SELECTION AREA (Main Focus)                         */}
          {/* ---------------------------------------------------------- */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-hidden">
            {/* Category Filter Pills Bar */}
            <div className="px-4 sm:px-6 py-3.5 bg-white border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-[#0c4a26] text-white shadow-sm shadow-emerald-950/20'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-300' : 'text-slate-500'}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              {filteredProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <Search className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="font-bold text-slate-700 text-base">No grocery products found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    No matching items in "{selectedCategory}". Try clearing your search query or selecting "All".
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="mt-4 px-4 py-2 bg-emerald-50 text-[#0c4a26] hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Reset Search &amp; Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4.5">
                  {filteredProducts.map((prod) => {
                    const isOutOfStock = prod.stock <= 0;
                    const isLowStock = prod.stock > 0 && prod.stock <= (prod.minStock || 10);
                    const cartItem = cart.find((i) => i.productId === prod.id);

                    return (
                      <div
                        key={prod.id}
                        className={`group bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                          isOutOfStock
                            ? 'border-red-200/70 opacity-60'
                            : 'border-slate-200/90 hover:border-emerald-300 hover:shadow-md'
                        }`}
                      >
                        {/* Top Image Preview Container */}
                        <div className="h-36 sm:h-40 bg-slate-50 relative flex items-center justify-center p-3 overflow-hidden border-b border-slate-100">
                          {/* Stock Badges */}
                          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-xs">
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                                Low Stock ({prod.stock})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/90 text-slate-600 backdrop-blur-xs border border-slate-200/60 shadow-2xs">
                                {prod.stock} {prod.unit}
                              </span>
                            )}
                          </div>

                          {/* Cart Quantity Badge if already added */}
                          {cartItem && (
                            <span className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-[#0c4a26] text-white font-black text-xs flex items-center justify-center shadow-md animate-in zoom-in-75">
                              {cartItem.qty}
                            </span>
                          )}

                          {/* Image SVG illustration */}
                          <img
                            src={prod.imageSvg}
                            alt={prod.name}
                            className="w-20 h-20 sm:w-24 sm:h-24 object-contain group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>

                        {/* Product Card Details */}
                        <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {prod.category}
                            </p>
                            <h4
                              className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 mt-0.5"
                              title={prod.name}
                            >
                              {prod.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {prod.sku} • {prod.unit}
                            </p>
                          </div>

                          {/* Price & Add Button Row */}
                          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                Price
                              </p>
                              <p className="text-sm sm:text-base font-extrabold text-[#0c4a26] tabular-nums leading-tight">
                                {prod.sellingPrice.toLocaleString()}{' '}
                                <span className="text-[10px] font-bold text-slate-500">RWF</span>
                              </p>
                            </div>

                            {/* Add Button */}
                            <button
                              onClick={() => addToCart(prod.id)}
                              disabled={isOutOfStock}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-90 ${
                                isOutOfStock
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-[#0c4a26] hover:bg-[#15803d] text-white hover:shadow-emerald-900/20'
                              }`}
                              title={isOutOfStock ? 'Product out of stock' : `Add ${prod.name} to order`}
                            >
                              <Plus className="w-4 h-4 stroke-[2.5]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* CURRENT ORDER PANEL (Dedicated Right Panel)                */}
          {/* ---------------------------------------------------------- */}
          <div className="hidden lg:flex flex-col w-96 xl:w-[420px] bg-white border-l border-slate-200/90 shadow-sm shrink-0 h-full">
            {/* Order Header: Title + Order # + Customer */}
            <div className="p-4 border-b border-slate-200/90 bg-white">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#0c4a26] flex items-center justify-center font-bold">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">Current Order</h3>
                </div>

                {/* Prominent Order Number Badge matching Mockup (#000123) */}
                <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#e8f5e9] text-[#0c4a26] border border-emerald-300/80 font-mono tracking-tight">
                  {orderNumber}
                </span>
              </div>

              {/* Customer Selector Bar */}
              <div className="mt-3 flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-800 truncate">
                    {selectedCustomer?.name || 'Walk-in Customer'}
                  </span>
                </div>
                <button
                  onClick={() => setCustomerModalOpen(true)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer shrink-0"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Scrollable Order Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#0c4a26] flex items-center justify-center">
                    <ShoppingCart className="w-7 h-7 text-emerald-600" />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">Order is empty</p>
                  <p className="text-xs text-slate-400 max-w-[200px]">
                    Tap products on the left or scan barcodes to begin a sale.
                  </p>
                </div>
              ) : (
                cart.map((item) => {
                  const prod = products.find((p) => p.id === item.productId);
                  return (
                    <div
                      key={item.productId}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 flex items-center justify-between gap-3 text-xs transition-colors group"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0 p-1">
                        <img
                          src={prod?.imageSvg || item.productName}
                          alt={item.productName}
                          className="w-9 h-9 object-contain"
                        />
                      </div>

                      {/* Name & Unit Price */}
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-slate-900 truncate" title={item.productName}>
                          {item.productName}
                        </h5>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5 tabular-nums">
                          RWF {item.unitPrice.toLocaleString()}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">/ {item.unit}</span>
                        </p>
                      </div>

                      {/* Quantity Controls (- / Qty / +) */}
                      <div className="flex items-center gap-1.5 bg-white rounded-lg p-1 border border-slate-200 shadow-2xs">
                        <button
                          onClick={() => updateQty(item.productId, -1)}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-slate-900 px-1 min-w-[18px] text-center tabular-nums text-xs">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.productId, 1)}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-95"
                          title="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remove item button */}
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Order Calculations & Checkout Action Area */}
            <div className="p-4 border-t border-slate-200/90 bg-white space-y-3.5">
              {/* Calculations: Subtotal, Discount, Tax */}
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">Subtotal</span>
                  <span className="font-extrabold text-slate-800 tabular-nums">
                    RWF {totals.subtotal.toLocaleString()}
                  </span>
                </div>

                {/* Discount Row (Editable with Cashier Permissions) */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-500">Discount</span>
                    {hasPermission('pos', 'edit') && (
                      <button
                        onClick={() => setIsEditingDiscount(!isEditingDiscount)}
                        className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        {isEditingDiscount ? 'Done' : 'Edit'}
                      </button>
                    )}
                  </div>
                  {isEditingDiscount ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max={settings?.maxCashierDiscountPercent || 15}
                        value={manualDiscountInput}
                        onChange={(e) => {
                          setManualDiscountInput(e.target.value);
                          setOrderDiscountPercent(Number(e.target.value) || 0);
                        }}
                        className="w-14 px-1.5 py-0.5 text-right font-bold text-xs border border-slate-300 rounded bg-white"
                      />
                      <span className="text-[11px] text-slate-400 font-bold">%</span>
                    </div>
                  ) : (
                    <span className="font-semibold text-slate-700 tabular-nums">
                      {totals.discount > 0 ? `- RWF ${totals.discount.toLocaleString()}` : '0 RWF'}
                    </span>
                  )}
                </div>

                {/* Tax (18% Standard) */}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">Tax (18% VAT)</span>
                  <span className="font-semibold text-slate-700 tabular-nums">
                    RWF {totals.tax.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Grand Total Box (Matching Reference Mockup #eaf7ee background) */}
              <div className="p-4 rounded-2xl bg-[#eaf7ee] border border-emerald-200/90 flex items-center justify-between">
                <span className="font-black text-slate-900 text-base">Total</span>
                <span className="font-black text-2xl text-[#0c4a26] tabular-nums tracking-tight">
                  RWF {totals.total.toLocaleString()}
                </span>
              </div>

              {/* Action Buttons Row: Hold, Cancel, Print */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleHoldSale}
                  disabled={cart.length === 0}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Pause className="w-3.5 h-3.5 text-amber-600" />
                  <span>Hold</span>
                </button>

                <button
                  onClick={() => setCancelConfirmOpen(true)}
                  disabled={cart.length === 0}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-40 disabled:hover:bg-transparent text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-red-500" />
                  <span>Cancel</span>
                </button>

                <button
                  onClick={() => {
                    if (cart.length === 0) {
                      notify('warning', 'Empty Order', 'Add items before previewing a receipt.');
                      return;
                    }
                    window.print();
                  }}
                  disabled={cart.length === 0}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print</span>
                </button>
              </div>

              {/* Large Checkout Button */}
              <button
                onClick={() => {
                  if (cart.length === 0) {
                    notify('warning', 'Empty Cart', 'Please select items to proceed to checkout.');
                    return;
                  }
                  setAmountReceived(totals.total.toString());
                  setCheckoutModalOpen(true);
                }}
                disabled={cart.length === 0}
                className="w-full py-4 px-4 rounded-2xl bg-[#0c4a26] hover:bg-[#093a1d] active:scale-[0.99] disabled:opacity-50 disabled:hover:bg-[#0c4a26] disabled:active:scale-100 text-white font-black text-sm tracking-wide shadow-md shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <CreditCard className="w-4 h-4 text-emerald-300" />
                <span>Checkout</span>
                <ArrowRight className="w-4 h-4 text-emerald-300 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. BOTTOM STATUS FOOTER BAR (Matching Mockup Footer)         */}
        {/* ============================================================ */}
        <footer className="h-10 bg-white border-t border-slate-200/90 px-4 sm:px-6 flex items-center justify-between text-[11px] text-slate-500 shrink-0 select-none">
          <div className="flex items-center gap-2 font-medium">
            <Store className="w-3.5 h-3.5 text-emerald-700" />
            <span className="font-semibold text-slate-700">
              {currentCompany?.name || 'Fresh & More'} • {currentBranch || 'Downtown Kigali Store'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Cashier: <strong className="text-slate-800">{currentUser?.name || 'Emmanuel'}</strong>
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Connected</span>
            </div>
          </div>

          <div className="text-emerald-900/80 font-medium italic text-right">
            <span>Fresh Food • Quality Grocery • Great Service</span>
          </div>
        </footer>
      </div>

      {/* ============================================================ */}
      {/* 4. MOBILE FLOATING ORDER BAR & SLIDE-UP DRAWER               */}
      {/* ============================================================ */}
      <div className="lg:hidden fixed bottom-10 left-3 right-3 z-30">
        <button
          onClick={() => setMobileCartDrawerOpen(true)}
          className="w-full py-3.5 px-5 bg-[#0c4a26] text-white rounded-2xl shadow-xl flex items-center justify-between font-bold text-sm cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span>
              {cart.reduce((sum, i) => sum + i.qty, 0)} items in order
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-200 font-mono tabular-nums">
              RWF {totals.total.toLocaleString()}
            </span>
            <ArrowRight className="w-4 h-4 text-emerald-300" />
          </div>
        </button>
      </div>

      {/* Mobile Slide-Up Order Drawer */}
      {mobileCartDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileCartDrawerOpen(false)}
          />
          <div className="relative w-full max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#0c4a26]" />
                <h3 className="font-extrabold text-slate-900 text-base">Current Order ({orderNumber})</h3>
              </div>
              <button
                onClick={() => setMobileCartDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-slate-900 truncate">{item.productName}</h5>
                    <p className="text-[11px] text-slate-500 font-semibold tabular-nums">
                      RWF {item.unitPrice.toLocaleString()} / {item.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white rounded-lg p-1 border border-slate-200">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-slate-900 px-1 text-xs">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="p-1.5 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Mobile checkout buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between font-black text-lg text-slate-900">
                <span>Total Amount</span>
                <span className="text-[#0c4a26] tabular-nums">RWF {totals.total.toLocaleString()}</span>
              </div>
              <button
                onClick={() => {
                  setMobileCartDrawerOpen(false);
                  setAmountReceived(totals.total.toString());
                  setCheckoutModalOpen(true);
                }}
                className="w-full py-3.5 bg-[#0c4a26] text-white font-extrabold rounded-xl shadow-md text-sm"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. CHECKOUT AND PAYMENT MODAL (Section 2.E)                   */}
      {/* ============================================================ */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setCheckoutModalOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Checkout &amp; Payment</h3>
                <p className="text-xs text-slate-500 mt-0.5">Order {orderNumber} • Fresh &amp; More</p>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Due Banner */}
            <div className="p-6 text-center bg-gradient-to-br from-[#0c4a26] to-[#08331a] text-white">
              <p className="text-xs text-emerald-200/90 font-bold uppercase tracking-wider">
                Total Amount Due
              </p>
              <p className="text-3xl sm:text-4xl font-black mt-1 tabular-nums">
                {totals.total.toLocaleString()} <span className="text-lg font-bold text-emerald-300">RWF</span>
              </p>
              <p className="text-[11px] text-emerald-200/80 mt-1">
                Customer: {selectedCustomer?.name || 'Walk-in Customer'}
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'MoMo', 'Card', 'Credit', 'Split Payment'] as PaymentMethod[]).map((method) => {
                    const isSelected = paymentMethod === method;
                    return (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-[#0c4a26] text-[#0c4a26] shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {method === 'Cash' && <Banknote className="w-4 h-4" />}
                        {method === 'MoMo' && <Smartphone className="w-4 h-4" />}
                        {method === 'Card' && <CreditCard className="w-4 h-4" />}
                        {method === 'Credit' && <ClipboardList className="w-4 h-4" />}
                        {method === 'Split Payment' && <Layers className="w-4 h-4" />}
                        <span>{method}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Payment Details */}
              {paymentMethod === 'Cash' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cash Amount Received (RWF)
                    </label>
                    <input
                      type="number"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder={totals.total.toString()}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-base tabular-nums focus:border-[#0c4a26] focus:outline-none"
                    />
                  </div>

                  {/* Quick Tender Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Exact', val: totals.total },
                      { label: '+500', val: totals.total + 500 },
                      { label: '+1,000', val: totals.total + 1000 },
                      { label: '5,000', val: 5000 },
                      { label: '10,000', val: 10000 },
                      { label: '20,000', val: 20000 },
                      { label: '50,000', val: 5000 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() => setAmountReceived(btn.val.toString())}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Change Due Display */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Change Due:</span>
                    <span className="text-base font-black text-emerald-800 tabular-nums">
                      {changeAmount.toLocaleString()} RWF
                    </span>
                  </div>
                </div>
              )}

              {/* Mobile Money Details */}
              {paymentMethod === 'MoMo' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      MTN / Airtel Mobile Money Number
                    </label>
                    <input
                      type="text"
                      value={momoPhone}
                      onChange={(e) => setMomoPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:border-[#0c4a26] focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    A digital USSD payment prompt of <strong>{totals.total.toLocaleString()} RWF</strong> will be sent to the customer's handset.
                  </p>
                </div>
              )}

              {/* Credit Sale Check */}
              {paymentMethod === 'Credit' && (
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
                    <p className="font-bold">Debtor Credit Sale</p>
                    <p className="text-[11px]">
                      Customer: <strong>{selectedCustomer?.name}</strong> (Credit Limit:{' '}
                      {selectedCustomer?.creditLimit.toLocaleString()} RWF)
                    </p>
                    <p className="text-[11px]">
                      Current Balance: {selectedCustomer?.outstandingBalance.toLocaleString()} RWF
                    </p>
                  </div>
                </div>
              )}

              {/* Complete Payment Button */}
              <button
                onClick={handleCompleteSale}
                className="w-full py-4 bg-[#0c4a26] hover:bg-[#093a1d] text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer transition-all mt-4"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>Confirm Payment &amp; Issue Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. SALE CONFIRMATION & RECEIPT MODAL                         */}
      {/* ============================================================ */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setCompletedSale(null)}
          />

          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
            {/* Top Success Banner */}
            <div className="p-6 text-center bg-[#0c4a26] text-white">
              <div className="w-14 h-14 rounded-full bg-emerald-400 text-[#093a1d] flex items-center justify-center mx-auto mb-3 shadow-md">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h3 className="font-black text-xl">Payment Completed!</h3>
              <p className="text-xs text-emerald-200 mt-1">Transaction Ref: {completedSale.reference}</p>
            </div>

            {/* Receipt Content */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-mono space-y-2">
                <div className="text-center pb-2 border-b border-dashed border-slate-300">
                  <p className="font-extrabold text-slate-900 text-sm">FRESH &amp; MORE M-POS</p>
                  <p className="text-[10px] text-slate-500">Kigali, Rwanda • TIN: 103884920</p>
                  <p className="text-[10px] text-slate-500">{completedSale.date} • {completedSale.time}</p>
                  <p className="text-[10px] text-slate-500">Cashier: {completedSale.cashier}</p>
                </div>

                {/* Items */}
                <div className="space-y-1 py-1 border-b border-dashed border-slate-300 max-h-36 overflow-y-auto">
                  {completedSale.items.map((i) => (
                    <div key={i.productId} className="flex justify-between text-[11px]">
                      <span className="truncate max-w-[180px]">
                        {i.qty}x {i.productName}
                      </span>
                      <span className="font-bold tabular-nums">
                        {i.total.toLocaleString()} RWF
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1 pt-1 text-right text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span>{completedSale.subtotal.toLocaleString()} RWF</span>
                  </div>
                  {completedSale.discount > 0 && (
                    <div className="flex justify-between text-emerald-800">
                      <span>Discount:</span>
                      <span>-{completedSale.discount.toLocaleString()} RWF</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax (18%):</span>
                    <span>{completedSale.tax.toLocaleString()} RWF</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                    <span>GRAND TOTAL:</span>
                    <span>{completedSale.total.toLocaleString()} RWF</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-0.5">
                    <span>Method ({completedSale.paymentMethod}):</span>
                    <span>{completedSale.amountReceived.toLocaleString()} RWF</span>
                  </div>
                  {completedSale.changeGiven > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Change Given:</span>
                      <span>{completedSale.changeGiven.toLocaleString()} RWF</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => window.print()}
                  className="py-3 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-800"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => {
                    const content = `FRESH & MORE M-POS RECEIPT\nReference: ${completedSale.reference}\nDate: ${completedSale.date} ${completedSale.time}\nTotal: ${completedSale.total} RWF\nThank you!`;
                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Receipt-${completedSale.reference}.txt`;
                    a.click();
                  }}
                  className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>

              <button
                onClick={() => setCompletedSale(null)}
                className="w-full py-3 bg-[#0c4a26] text-white font-extrabold text-xs rounded-xl hover:bg-[#093a1d] cursor-pointer"
              >
                Start Next Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. HELD ORDERS RECALL DRAWER                                 */}
      {/* ============================================================ */}
      {heldDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setHeldDrawerOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Pause className="w-4 h-4 text-amber-600" />
                <h4 className="font-extrabold text-sm text-slate-900">Held Orders ({heldSales.length})</h4>
              </div>
              <button
                onClick={() => setHeldDrawerOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {heldSales.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <p>No orders currently on hold.</p>
                </div>
              ) : (
                heldSales.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900">{h.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{h.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {h.items.length} items • <strong className="text-slate-800">{h.total.toLocaleString()} RWF</strong>
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleRecallHeld(h.id)}
                        className="flex-1 py-1.5 bg-[#0c4a26] text-white rounded-lg font-bold text-xs hover:bg-[#093a1d] cursor-pointer"
                      >
                        Recall Order
                      </button>
                      <button
                        onClick={() => removeHeldSale(h.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        title="Discard"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. CANCEL ORDER CONFIRMATION MODAL                           */}
      {/* ============================================================ */}
      {cancelConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setCancelConfirmOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-5 z-10 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Cancel Current Order?</h4>
                <p className="text-xs text-slate-500 mt-1">
                  This will remove all {cart.length} items from the order panel. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setCancelConfirmOpen(false)}
                className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Keep Order
              </button>
              <button
                onClick={clearCart}
                className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Yes, Clear Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 9. CUSTOMER SELECTOR MODAL                                   */}
      {/* ============================================================ */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setCustomerModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-5 z-10 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 text-sm">Select Order Customer</h4>
              <button
                onClick={() => setCustomerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar">
              {customers.map((c) => {
                const isSelected = selectedCustomerId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setCustomerModalOpen(false);
                      notify('info', 'Customer Selected', `Assigned order to ${c.name}.`);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-colors flex items-center justify-between text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-bold">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.phone} • {c.status || 'Active'}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-700" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
