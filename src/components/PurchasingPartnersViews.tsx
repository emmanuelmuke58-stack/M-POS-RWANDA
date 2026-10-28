import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { PurchaseOrder, PurchaseOrderItem, Supplier, Customer, Sale, PaymentMethod, GoodsReceipt } from '../types';
import { ConfirmDialog } from './SharedModals';
import { timeSync } from '../services/timeSyncService';
import {
  Plus,
  Truck,
  Users,
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  X,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ArrowDownLeft,
  Calendar,
  Trash2,
} from 'lucide-react';

export const PurchasingView: React.FC = () => {
  const { purchaseOrders, suppliers, products, createPurchaseOrder, updatePOStatus, deletePurchaseOrder, enforcePermission, hasPermission, todayString } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isNewPoOpen, setIsNewPoOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [expectedDate, setExpectedDate] = useState(() => timeSync.getDateDaysAgo(-3));
  const [notes, setNotes] = useState('');
  const [deletingPo, setDeletingPo] = useState<PurchaseOrder | null>(null);

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchSearch =
        po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'All' || po.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [purchaseOrders, search, statusFilter]);

  const addItem = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    if (items.some((i) => i.productId === productId)) return;
    setItems([
      ...items,
      {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        unit: prod.unit,
        orderedQty: 50,
        receivedQty: 0,
        rejectedQty: 0,
        unitCost: prod.costPrice,
        discount: 0,
        tax: Math.round(50 * prod.costPrice * 0.18),
        total: 50 * prod.costPrice,
      },
    ]);
  };

  const updateItemQty = (productId: string, qty: number) => {
    setItems(
      items.map((i) =>
        i.productId === productId ? { ...i, orderedQty: qty, total: qty * i.unitCost } : i
      )
    );
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enforcePermission('purchasing', 'create')) return;
    if (items.length === 0) return;
    const sup = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];
    const subtotal = items.reduce((acc, i) => acc + i.total, 0);
    const tax = Math.round(subtotal * 0.18);

    createPurchaseOrder({
      supplierId: sup.id,
      supplierName: sup.name,
      date: todayString,
      expectedDelivery: expectedDate,
      items,
      subtotal,
      discount: 0,
      tax,
      additionalCosts: 0,
      grandTotal: subtotal + tax,
      status: 'Pending Approval',
      notes,
    });
    setIsNewPoOpen(false);
    setItems([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Purchase Orders (PO)</h1>
          <p className="text-xs text-slate-500">Replenish supermarket shelves and manage wholesale supplier orders</p>
        </div>
        <button
          onClick={() => {
            if (!enforcePermission('purchasing', 'create')) return;
            setIsNewPoOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0f532b] hover:bg-[#0c4423] rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create Purchase Order</span>
        </button>
      </div>

      {/* Filter pills on mobile (Screen 10 in Mockup: All, Pending, Approved, Received) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {['All', 'Pending Approval', 'Approved', 'Received', 'Cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              statusFilter === st
                ? 'bg-[#0f532b] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st === 'Pending Approval' ? 'Pending' : st}
          </button>
        ))}
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search PO # or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200"
          />
        </div>
      </div>

      {/* Desktop Table Layout (100% Preserved) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <th className="p-3">PO Number</th>
              <th className="p-3">Supplier</th>
              <th className="p-3">Order Date</th>
              <th className="p-3">Expected Date</th>
              <th className="p-3 text-right">Items</th>
              <th className="p-3 text-right">Grand Total</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.map((po) => (
              <tr key={po.id} className="hover:bg-slate-50/70">
                <td className="p-3 font-mono font-bold text-slate-800">{po.poNumber}</td>
                <td className="p-3 font-medium text-slate-700">{po.supplierName}</td>
                <td className="p-3 text-slate-500">{po.date}</td>
                <td className="p-3 text-slate-500">{po.expectedDelivery}</td>
                <td className="p-3 text-right text-slate-600">{po.items.length} skus</td>
                <td className="p-3 text-right font-bold text-slate-900 tabular-nums">
                  {po.grandTotal.toLocaleString()} RWF
                </td>
                <td className="p-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      po.status === 'Received'
                        ? 'bg-emerald-100 text-emerald-800'
                        : po.status === 'Approved'
                        ? 'bg-blue-100 text-blue-800'
                        : po.status === 'Cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {po.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {po.status === 'Pending Approval' && hasPermission('purchasing', 'approve') && (
                      <button
                        onClick={() => updatePOStatus(po.id, 'Approved', 'Approved by manager')}
                        className="px-2 py-1 bg-blue-50 text-blue-700 font-bold rounded hover:bg-blue-100 cursor-pointer"
                      >
                        Approve
                      </button>
                    )}
                    {po.status === 'Approved' && (
                      <span className="text-xs text-slate-400 mr-1">Ready for GRN</span>
                    )}
                    {hasPermission('purchasing', 'delete') && (
                      <button
                        onClick={() => setDeletingPo(po)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Delete Purchase Order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List (Screen 10 in Mockup) */}
      <div className="md:hidden space-y-2.5">
        {filteredOrders.map((po) => (
          <div key={po.id} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-900 text-sm">{po.poNumber}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    po.status === 'Received'
                      ? 'bg-emerald-50 text-emerald-700'
                      : po.status === 'Approved'
                      ? 'bg-blue-50 text-blue-700'
                      : po.status === 'Cancelled'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {po.status === 'Pending Approval' ? 'Pending' : po.status}
                </span>
                {hasPermission('purchasing', 'delete') && (
                  <button
                    onClick={() => setDeletingPo(po)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded"
                    title="Delete Purchase Order"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="font-bold text-slate-800 text-xs">{po.supplierName}</p>
            <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-100">
              <span className="text-[11px]">{po.date}</span>
              <span className="font-extrabold text-slate-900 text-sm tabular-nums">
                {po.grandTotal.toLocaleString()} RWF
              </span>
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="py-10 text-center text-slate-400 text-xs">
            No purchase orders matching this filter.
          </div>
        )}
      </div>

      {/* Create PO Modal */}
      {isNewPoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl overflow-hidden text-xs max-h-[85vh] flex flex-col">
            <div className="bg-[#0f532b] text-white p-4 flex items-center justify-between">
              <h2 className="font-bold text-sm">Create New Purchase Order</h2>
              <button onClick={() => setIsNewPoOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreatePO} className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Add Product Line</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select product to order...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.costPrice.toLocaleString()} RWF)
                    </option>
                  ))}
                </select>
              </div>

              {items.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-2 space-y-2">
                  <p className="font-bold text-slate-700">Order Items ({items.length})</p>
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded">
                      <div className="flex-1 truncate">
                        <p className="font-bold text-slate-800 truncate">{item.productName}</p>
                        <p className="text-[10px] text-slate-400">@ {item.unitCost.toLocaleString()} RWF</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.orderedQty}
                          min={1}
                          onChange={(e) => updateItemQty(item.productId, Number(e.target.value))}
                          className="w-16 px-2 py-1 border rounded text-right font-bold"
                        />
                        <span className="font-bold text-slate-800 tabular-nums w-24 text-right">
                          {item.total.toLocaleString()} RWF
                        </span>
                        <button type="button" onClick={() => removeItem(item.productId)} className="text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewPoOpen(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={items.length === 0}
                  className="px-5 py-2 bg-[#0f532b] text-white font-bold rounded-lg shadow-sm disabled:opacity-50"
                >
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete PO Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingPo)}
        variant="danger"
        title="Delete Purchase Order"
        description={`Are you sure you want to permanently delete purchase order "${deletingPo?.poNumber}" from ${deletingPo?.supplierName}?`}
        confirmLabel="Delete Order"
        requireReason={true}
        reasonPlaceholder="Reason for deleting purchase order..."
        onConfirm={(reason) => {
          if (deletingPo) {
            deletePurchaseOrder(deletingPo.id, reason);
            setDeletingPo(null);
          }
        }}
        onCancel={() => setDeletingPo(null)}
      />
    </div>
  );
};

export const ReceivingView: React.FC = () => {
  const { purchaseOrders, goodsReceipts, confirmGoodsReceipt, deleteGoodsReceipt, enforcePermission, hasPermission, todayString } = useStore();
  const [selectedPoId, setSelectedPoId] = useState('');
  const [deletingGrn, setDeletingGrn] = useState<GoodsReceipt | null>(null);

  const eligibleOrders = purchaseOrders.filter((po) => po.status === 'Approved');

  const handleReceive = (po: PurchaseOrder) => {
    if (!enforcePermission('receiving', 'create')) return;
    confirmGoodsReceipt({
      poId: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      date: todayString,
      items: po.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        orderedQty: i.orderedQty,
        previouslyReceivedQty: 0,
        receiveNowQty: i.orderedQty,
        rejectedQty: 0,
        damagedQty: 0,
        actualUnitCost: i.unitCost,
        batchNumber: `LOT-${Date.now().toString().slice(-4)}`,
        expiryDate: timeSync.getDateDaysAgo(-180),
      })),
      totalReceivedValue: po.subtotal,
      notes: 'Delivered in good condition to warehouse',
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">Goods Receiving (GRN)</h1>
        <p className="text-xs text-slate-500">Accept vendor deliveries, update inventory stock, and verify invoice totals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pending Deliveries to receive */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <h2 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-700" />
            <span>Pending Purchase Orders</span>
          </h2>
          {eligibleOrders.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No pending POs waiting for receipt.</p>
          ) : (
            eligibleOrders.map((po) => (
              <div key={po.id} className="p-3 border border-slate-200 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-slate-800">{po.poNumber}</span>
                  <span className="font-bold text-emerald-700">{po.grandTotal.toLocaleString()} RWF</span>
                </div>
                <p className="text-slate-600 font-medium">{po.supplierName}</p>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-slate-400">{po.items.length} items</span>
                  <button
                    onClick={() => handleReceive(po)}
                    className="px-3 py-1 bg-[#0f532b] text-white font-bold rounded shadow-sm hover:bg-[#0c4423]"
                  >
                    Receive Delivery
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Goods Receipt History */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <h2 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Received Goods Notes (GRN)</span>
          </h2>
          {goodsReceipts.map((grn) => (
            <div key={grn.id} className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono font-bold text-slate-900">{grn.grnNumber}</span>
                  <span className="text-slate-500 font-mono ml-2 text-[11px]">{grn.date}</span>
                </div>
                {hasPermission('receiving', 'delete') && (
                  <button
                    onClick={() => setDeletingGrn(grn)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                    title="Delete GRN Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-slate-700">{grn.supplierName} · PO: {grn.poNumber}</p>
              <p className="text-emerald-700 font-bold tabular-nums">
                Valued: {grn.totalReceivedValue.toLocaleString()} RWF
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Delete GRN Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingGrn)}
        variant="danger"
        title="Delete Goods Receipt Note (GRN)"
        description={`Are you sure you want to delete GRN "${deletingGrn?.grnNumber}" from ${deletingGrn?.supplierName}?`}
        confirmLabel="Delete GRN"
        requireReason={true}
        reasonPlaceholder="Reason for removing GRN record..."
        onConfirm={(reason) => {
          if (deletingGrn) {
            deleteGoodsReceipt(deletingGrn.id, reason);
            setDeletingGrn(null);
          }
        }}
        onCancel={() => setDeletingGrn(null)}
      />
    </div>
  );
};

export const SuppliersView: React.FC = () => {
  const { suppliers, addSupplier, recordSupplierPayment, deleteSupplier, hasPermission } = useStore();
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [paySup, setPaySup] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'Cash' | 'MoMo' | 'Bank'>('Bank');
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // Supplier form
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tin, setTin] = useState('');
  const [cat, setCat] = useState('Groceries');
  const [terms, setTerms] = useState('Net 30');

  const filteredSuppliers = suppliers.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search)
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addSupplier({
      name,
      contactPerson: contact,
      phone,
      email,
      tin,
      address: 'Kigali, Rwanda',
      status: 'Active',
    });
    setIsAddOpen(false);
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySup || !payAmount) return;
    recordSupplierPayment(paySup.id, null, Number(payAmount), payMethod, 'Payment to vendor');
    setPaySup(null);
    setPayAmount('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Suppliers & Vendors</h1>
          <p className="text-xs text-slate-500">Manage vendor profiles, purchase history, and outstanding accounts payable</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0f532b] rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 border-b">
          <input
            type="text"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-1.5 text-xs border rounded-lg"
          />
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b font-semibold text-slate-500">
              <th className="p-3">Supplier</th>
              <th className="p-3">Phone / Email</th>
              <th className="p-3">TIN / Terms</th>
              <th className="p-3 text-right">Total Purchases</th>
              <th className="p-3 text-right">Payable Balance</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredSuppliers.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/70">
                <td className="p-3">
                  <p className="font-bold text-slate-800">{s.name}</p>
                  <p className="text-slate-400 text-[11px]">{s.contactPerson}</p>
                </td>
                <td className="p-3 text-slate-600">
                  <p>{s.phone}</p>
                  <p className="text-slate-400 text-[11px]">{s.email}</p>
                </td>
                <td className="p-3 text-slate-600">
                  <p className="font-mono text-[11px]">TIN: {s.tin}</p>
                  <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{s.address}</span>
                </td>
                <td className="p-3 text-right font-medium text-slate-700 tabular-nums">
                  {s.totalPurchases.toLocaleString()} RWF
                </td>
                <td className="p-3 text-right font-bold text-red-600 tabular-nums">
                  {s.outstandingBalance.toLocaleString()} RWF
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {s.outstandingBalance > 0 && (
                      <button
                        onClick={() => {
                          setPaySup(s);
                          setPayAmount(s.outstandingBalance.toString());
                        }}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded hover:bg-emerald-100 cursor-pointer"
                      >
                        Pay Bill
                      </button>
                    )}
                    {hasPermission('suppliers', 'delete') && (
                      <button
                        onClick={() => setDeletingSupplier(s)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Supplier Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl p-5 text-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Add New Supplier</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company Name *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                  <input value={contact} onChange={(e) => setContact(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone *</label>
                  <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">TIN Number</label>
                  <input value={tin} onChange={(e) => setTin(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
                  <input value={terms} onChange={(e) => setTerms(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-[#0f532b] text-white font-bold rounded-lg">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {paySup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-5 text-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Record Payment to {paySup.name}</h3>
            <p className="text-slate-500">Outstanding Balance: <strong className="text-red-600">{paySup.outstandingBalance.toLocaleString()} RWF</strong></p>
            <form onSubmit={handlePay} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Amount (RWF)</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="Bank">Bank Transfer</option>
                  <option value="MoMo">MTN MoMo</option>
                  <option value="Cash">Cash in Hand</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPaySup(null)} className="px-3 py-1.5 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-[#0f532b] text-white font-bold rounded-lg">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Supplier Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingSupplier)}
        variant="danger"
        title="Delete Supplier Profile"
        description={`Are you sure you want to permanently delete supplier "${deletingSupplier?.name}"? All associated historical purchases will remain in records.`}
        confirmLabel="Delete Supplier"
        requireReason={true}
        reasonPlaceholder="Reason for removing supplier..."
        onConfirm={(reason) => {
          if (deletingSupplier) {
            deleteSupplier(deletingSupplier.id, reason);
            setDeletingSupplier(null);
          }
        }}
        onCancel={() => setDeletingSupplier(null)}
      />
    </div>
  );
};

export const CustomersView: React.FC = () => {
  const { customers, addCustomer, deleteCustomer, hasPermission } = useStore();
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [limit, setLimit] = useState('100000');
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer({
      name,
      phone,
      email,
      creditLimit: Number(limit) || 50000,
      tin: '',
      address: 'Kigali, Rwanda',
      dueDate: timeSync.getDateDaysAgo(-30),
    });
    setIsAddOpen(false);
    setName('');
    setPhone('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customers & Loyalty</h1>
          <p className="text-xs text-slate-500">Retail clients, customer credit accounts, and contact registry</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0f532b] rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 border-b">
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-3 py-1.5 text-xs border rounded-lg"
          />
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b font-semibold text-slate-500">
              <th className="p-3">Customer</th>
              <th className="p-3">Phone</th>
              <th className="p-3 text-right">Credit Limit</th>
              <th className="p-3 text-right">Outstanding Credit</th>
              <th className="p-3 text-right">Total Purchases</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCustomers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/70">
                <td className="p-3 font-bold text-slate-800">{c.name}</td>
                <td className="p-3 text-slate-600">{c.phone}</td>
                <td className="p-3 text-right text-slate-600 tabular-nums">{c.creditLimit.toLocaleString()} RWF</td>
                <td className="p-3 text-right font-bold text-red-600 tabular-nums">
                  {c.outstandingBalance > 0 ? `${c.outstandingBalance.toLocaleString()} RWF` : '—'}
                </td>
                <td className="p-3 text-right font-medium text-slate-700 tabular-nums">
                  {c.totalPurchases.toLocaleString()} RWF
                </td>
                <td className="p-3 text-right">
                  {hasPermission('customers', 'delete') && c.id !== 'cus-0' && (
                    <button
                      onClick={() => setDeletingCustomer(c)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      title="Delete Customer"
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

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl p-5 text-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Add Customer</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Full Name *</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Credit Limit (RWF)</label>
                <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-[#0f532b] text-white font-bold rounded-lg">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingCustomer)}
        variant="danger"
        title="Delete Customer Profile"
        description={`Are you sure you want to permanently delete customer "${deletingCustomer?.name}"?`}
        confirmLabel="Delete Customer"
        requireReason={true}
        reasonPlaceholder="Reason for removing customer profile..."
        onConfirm={(reason) => {
          if (deletingCustomer) {
            deleteCustomer(deletingCustomer.id, reason);
            setDeletingCustomer(null);
          }
        }}
        onCancel={() => setDeletingCustomer(null)}
      />
    </div>
  );
};

export const CreditSalesView: React.FC = () => {
  const { customers, recordCreditRepayment, sales } = useStore();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState<'Cash' | 'MoMo' | 'Bank'>('MoMo');

  const creditCustomers = customers.filter((c) => c.outstandingBalance > 0);
  const totalOutstanding = creditCustomers.reduce((acc, c) => acc + c.outstandingBalance, 0);

  const handleRepay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !repayAmount) return;
    recordCreditRepayment(null, selectedCustomerId, Number(repayAmount), repayMethod, 'Customer Credit Repayment');
    setSelectedCustomerId('');
    setRepayAmount('');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Total Credit Outstanding</p>
          <p className="text-xl font-bold text-red-600 mt-1 tabular-nums">{totalOutstanding.toLocaleString()} RWF</p>
          <p className="text-[11px] text-slate-400">Total owed by customers</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Debtors Count</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{creditCustomers.length}</p>
          <p className="text-[11px] text-slate-400">Customers with positive balance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Debtors List */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 border-b font-bold text-slate-800 text-xs">Customer Credit Balances</div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-500 font-semibold">
                <th className="p-3">Customer</th>
                <th className="p-3">Phone</th>
                <th className="p-3 text-right">Owed Balance</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {creditCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-bold text-slate-800">{c.name}</td>
                  <td className="p-3 text-slate-600">{c.phone}</td>
                  <td className="p-3 text-right font-bold text-red-600 tabular-nums">
                    {c.outstandingBalance.toLocaleString()} RWF
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setRepayAmount(c.outstandingBalance.toString());
                      }}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded hover:bg-emerald-100"
                    >
                      Receive Payment
                    </button>
                  </td>
                </tr>
              ))}
              {creditCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">
                    No customers have outstanding credit balances.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Record Repayment Form */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs space-y-3">
          <h2 className="font-bold text-slate-900 text-sm">Record Credit Repayment</h2>
          <form onSubmit={handleRepay} className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  const cus = creditCustomers.find((c) => c.id === e.target.value);
                  if (cus) setRepayAmount(cus.outstandingBalance.toString());
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select customer...</option>
                {creditCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.outstandingBalance.toLocaleString()} RWF)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Amount (RWF)</label>
              <input
                type="number"
                required
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
              <select
                value={repayMethod}
                onChange={(e) => setRepayMethod(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="MoMo">MTN MoMo</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank Transfer</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={!selectedCustomerId || !repayAmount}
              className="w-full py-2 bg-[#0f532b] text-white font-bold rounded-lg shadow-sm disabled:opacity-50"
            >
              Confirm Repayment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
