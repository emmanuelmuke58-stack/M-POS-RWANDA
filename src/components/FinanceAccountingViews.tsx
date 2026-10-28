import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { ExpenseCategory, PaymentRecord, Expense, CashShift } from '../types';
import { AccessRestrictedView } from './AccessRestrictedView';
import { ConfirmActionModal } from './SharedModals';
import {
  Plus,
  CheckCircle2,
  Wallet,
  Calculator,
  Lock,
  Unlock,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Download,
  Calendar,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Trash2,
} from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { expenses, addExpense, approveExpense, deleteExpense, enforcePermission, hasPermission, todayString } = useStore();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [formCat, setFormCat] = useState<ExpenseCategory>('Electricity & Water');
  const [formAmount, setFormAmount] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formMethod, setFormMethod] = useState<'Cash' | 'MoMo' | 'Bank'>('Cash');

  if (!hasPermission('expenses', 'view')) {
    return <AccessRestrictedView moduleName="expenses" requiredAction="view" />;
  }

  const filteredExpenses = expenses.filter((e) => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase()) || e.reference.includes(search);
    const matchCat = catFilter === 'All' || e.category === catFilter;
    return matchSearch && matchCat;
  });

  const totalApproved = expenses
    .filter((e) => e.status === 'Approved')
    .reduce((acc, e) => acc + e.amount, 0);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enforcePermission('expenses', 'create')) return;
    addExpense({
      date: todayString,
      category: formCat,
      amount: Number(formAmount) || 0,
      description: formDesc,
      paymentMethod: formMethod,
      supportingDoc: '',
      status: 'Pending Approval',
    });
    setIsAddOpen(false);
    setFormAmount('');
    setFormDesc('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Operating Expenses (OPEX)</h1>
          <p className="text-xs text-slate-500">Track petty cash, utilities, rent, logistics, and store operational costs</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0f532b] rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500">Total OPEX Approved</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{totalApproved.toLocaleString()} RWF</p>
          <p className="text-[11px] text-slate-400">Total verified expenses</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 border-b flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs px-3 py-1.5 text-xs border rounded-lg"
          />
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b font-semibold text-slate-500">
              <th className="p-3">Ref #</th>
              <th className="p-3">Date</th>
              <th className="p-3">Category</th>
              <th className="p-3">Description</th>
              <th className="p-3">Paid Via</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredExpenses.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/70">
                <td className="p-3 font-mono font-bold text-slate-800">{e.reference}</td>
                <td className="p-3 text-slate-500">{e.date}</td>
                <td className="p-3 font-medium text-slate-700">{e.category}</td>
                <td className="p-3 text-slate-600 truncate max-w-xs">{e.description}</td>
                <td className="p-3 text-slate-500">{e.paymentMethod}</td>
                <td className="p-3 text-right font-bold text-slate-900 tabular-nums">
                  {e.amount.toLocaleString()} RWF
                </td>
                <td className="p-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      e.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {e.status === 'Pending Approval' && hasPermission('expenses', 'approve') && (
                      <button
                        onClick={() => approveExpense(e.id)}
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 font-bold rounded hover:bg-emerald-100 cursor-pointer"
                      >
                        Approve
                      </button>
                    )}
                    {hasPermission('expenses', 'delete') && (
                      <button
                        onClick={() => setDeletingExpense(e)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                        title="Delete Expense Record"
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

      <ConfirmActionModal
        open={deletingExpense !== null}
        title="Delete Expense Record"
        description={`Are you sure you want to permanently delete expense record "${deletingExpense?.reference}" (${deletingExpense?.amount.toLocaleString()} RWF - ${deletingExpense?.category})?`}
        confirmText="Delete Expense"
        requireReason
        onConfirm={(reason) => {
          if (deletingExpense) {
            deleteExpense(deletingExpense.id, reason);
            setDeletingExpense(null);
          }
        }}
        onCancel={() => setDeletingExpense(null)}
      />

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl p-5 text-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Record Expense Voucher</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Category</label>
                <select
                  value={formCat}
                  onChange={(e) => setFormCat(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="Electricity & Water">Electricity & Water</option>
                  <option value="Rent">Store Rent</option>
                  <option value="Salaries & Wages">Staff Wages</option>
                  <option value="Transport">Transport & Logistics</option>
                  <option value="Packaging">Packaging Supplies</option>
                  <option value="Repairs">Maintenance & Repairs</option>
                  <option value="Internet">Internet & Telecom</option>
                  <option value="Other">Other Operational</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount (RWF) *</label>
                <input
                  type="number"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. EUCL Pre-paid electricity token"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="Cash">Cash (Petty Cash)</option>
                  <option value="MoMo">MTN Mobile Money</option>
                  <option value="Bank">Bank Account</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-[#0f532b] text-white font-bold rounded-lg">Record Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const CashManagementView: React.FC = () => {
  const { cashShifts, openCashShift, countCashShift, closeCashShift, deleteCashShift, hasPermission } = useStore();
  const [openingCash, setOpeningCash] = useState('50000');
  const [closeActual, setCloseActual] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [deletingShift, setDeletingShift] = useState<CashShift | null>(null);

  const activeShift = cashShifts.find((s) => s.status === 'Open');

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    openCashShift(Number(openingCash) || 50000);
  };

  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    closeCashShift(Number(closeActual) || 0, closeNote);
    setIsCloseOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">Cash Drawer & Shift Management</h1>
        <p className="text-xs text-slate-500">Track cashier float, opening/closing balances, and end-of-shift cash drawer reconciliations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Shift Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <h2 className="font-bold text-slate-900 text-sm flex items-center justify-between">
            <span>Current Drawer Shift</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${activeShift ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
              {activeShift ? 'Shift Active' : 'Drawer Closed'}
            </span>
          </h2>

          {activeShift ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-lg space-y-1">
                <p className="font-bold text-emerald-900">{activeShift.cashier}</p>
                <p className="text-emerald-700">Opened at {activeShift.openingTime}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div className="p-2 border rounded">
                  <span className="text-[10px] text-slate-400 block">Opening Float</span>
                  <span className="font-bold tabular-nums">{activeShift.openingCash.toLocaleString()} RWF</span>
                </div>
                <div className="p-2 border rounded">
                  <span className="text-[10px] text-slate-400 block">Cash Sales Today</span>
                  <span className="font-bold tabular-nums text-emerald-700">+{activeShift.cashSales.toLocaleString()} RWF</span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 border rounded flex justify-between items-center font-bold">
                <span>Expected Drawer Total:</span>
                <span className="text-emerald-800 text-sm tabular-nums">{activeShift.expectedCash.toLocaleString()} RWF</span>
              </div>
              <button
                onClick={() => {
                  setCloseActual(activeShift.expectedCash.toString());
                  setIsCloseOpen(true);
                }}
                className="w-full py-2 bg-red-600 text-white font-bold rounded-lg shadow-sm hover:bg-red-700 cursor-pointer"
              >
                Close Cash Shift & Reconcile
              </button>
            </div>
          ) : (
            <form onSubmit={handleOpen} className="space-y-3 text-xs">
              <p className="text-slate-500">No shift is currently active. Enter opening float to start cashier register:</p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Opening Cash Float (RWF)</label>
                <input
                  type="number"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-bold"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-[#0f532b] text-white font-bold rounded-lg shadow-sm hover:bg-[#0c4423] cursor-pointer"
              >
                Open Register Shift
              </button>
            </form>
          )}
        </div>

        {/* Shift History */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
          <h3 className="font-bold text-slate-900 text-sm">Recent Cash Drawer Shifts</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {cashShifts.map((s) => (
              <div key={s.id} className="p-2.5 border rounded-lg space-y-1 hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-800">{s.cashier}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono text-[11px]">{s.openingTime}</span>
                    {hasPermission('cash_management', 'delete') && (
                      <button
                        onClick={() => setDeletingShift(s)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                        title="Delete Shift Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Expected: {s.expectedCash.toLocaleString()} RWF</span>
                  <span>Actual: {s.actualCash.toLocaleString()} RWF</span>
                </div>
                {s.status === 'Closed' && (
                  <div className="text-[11px] font-semibold">
                    <span className={s.difference === 0 ? 'text-emerald-700' : 'text-red-600'}>
                      Variance: {s.difference > 0 ? `+${s.difference}` : s.difference} RWF
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={deletingShift !== null}
        title="Delete Cash Shift Session"
        description={`Are you sure you want to permanently delete this cash shift record (${deletingShift?.cashier} - ${deletingShift?.openingTime})?`}
        confirmText="Delete Shift"
        requireReason
        onConfirm={(reason) => {
          if (deletingShift) {
            deleteCashShift(deletingShift.id, reason);
            setDeletingShift(null);
          }
        }}
        onCancel={() => setDeletingShift(null)}
      />

      {/* Close Shift Modal */}
      {isCloseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-5 text-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Close Cash Drawer Register</h3>
            <form onSubmit={handleClose} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Physical Cash Count (RWF)</label>
                <input
                  type="number"
                  required
                  value={closeActual}
                  onChange={(e) => setCloseActual(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Discrepancy / Audit Note</label>
                <input
                  type="text"
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  placeholder="e.g. Verified and counted exact bills"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCloseOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-red-600 text-white font-bold rounded-lg cursor-pointer">Confirm & Close</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const PaymentsView: React.FC = () => {
  const { payments, reconcilePayment, deletePayment, hasPermission } = useStore();
  const [methodFilter, setMethodFilter] = useState('All');
  const [deletingPayment, setDeletingPayment] = useState<PaymentRecord | null>(null);

  const filtered = payments.filter((p) => methodFilter === 'All' || p.method === methodFilter);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">Payments & Reconciliation</h1>
        <p className="text-xs text-slate-500">Audit Cash, MTN MoMo, Card POS, and Bank settlements</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border rounded-lg"
          >
            <option value="All">All Channels</option>
            <option value="Cash">Cash</option>
            <option value="MoMo">MTN MoMo</option>
            <option value="Card">Bank Card</option>
            <option value="Bank">Bank Transfer</option>
          </select>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b font-semibold text-slate-500">
              <th className="p-3">Ref #</th>
              <th className="p-3">Date & Time</th>
              <th className="p-3">Direction</th>
              <th className="p-3">Method</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/70">
                <td className="p-3 font-mono font-bold text-slate-800">{p.reference}</td>
                <td className="p-3 text-slate-500">{p.date} {p.time}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.type === 'Sale Payment' || p.type === 'Credit Collection' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {p.type}
                  </span>
                </td>
                <td className="p-3 font-bold text-slate-700">{p.method}</td>
                <td className="p-3 text-right font-bold tabular-nums">
                  {p.amount.toLocaleString()} RWF
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'Reconciled' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {p.status === 'Pending' && (
                      <button
                        onClick={() => reconcilePayment(p.id, 'Reconciled')}
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 font-bold rounded hover:bg-emerald-100 cursor-pointer"
                      >
                        Reconcile
                      </button>
                    )}
                    {hasPermission('payments', 'delete') && (
                      <button
                        onClick={() => setDeletingPayment(p)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                        title="Delete Payment Record"
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

      <ConfirmActionModal
        open={deletingPayment !== null}
        title="Delete Payment Record"
        description={`Are you sure you want to permanently delete payment record "${deletingPayment?.reference}" (${deletingPayment?.amount.toLocaleString()} RWF - ${deletingPayment?.method})?`}
        confirmText="Delete Payment"
        requireReason
        onConfirm={(reason) => {
          if (deletingPayment) {
            deletePayment(deletingPayment.id, reason);
            setDeletingPayment(null);
          }
        }}
        onCancel={() => setDeletingPayment(null)}
      />
    </div>
  );
};

export const AccountingView: React.FC = () => {
  const { sales, purchaseOrders, expenses, customers, suppliers } = useStore();

  const totalRevenue = sales.filter((s) => s.status === 'Completed').reduce((acc, s) => acc + s.total, 0);
  const totalCogs = sales.filter((s) => s.status === 'Completed').reduce((acc, s) => acc + s.cogs, 0);
  const grossProfit = totalRevenue - totalCogs;
  const totalOpex = expenses.filter((e) => e.status === 'Approved').reduce((acc, e) => acc + e.amount, 0);
  const netIncome = grossProfit - totalOpex;

  const totalAR = customers.reduce((acc, c) => acc + c.outstandingBalance, 0);
  const totalAP = suppliers.reduce((acc, s) => acc + s.outstandingBalance, 0);

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">Accounting & Financial Statements</h1>
        <p className="text-xs text-slate-500">Automated Profit & Loss, Accounts Receivable (AR), and Accounts Payable (AP)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Profit & Loss Statement */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h2 className="font-bold text-slate-900 text-sm border-b pb-2">Profit & Loss Statement (P&L)</h2>
          <div className="space-y-2">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Gross Sales Revenue</span>
              <span className="tabular-nums font-bold text-emerald-700">{totalRevenue.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between text-slate-600 pl-3">
              <span>Less Cost of Goods Sold (COGS)</span>
              <span className="tabular-nums font-medium text-amber-700">-{totalCogs.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-dashed">
              <span>Gross Profit Margin</span>
              <span className="tabular-nums text-emerald-800">{grossProfit.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between text-slate-600 pl-3 pt-2">
              <span>Less Operating Expenses (OPEX)</span>
              <span className="tabular-nums font-medium text-red-600">-{totalOpex.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between font-bold text-base text-slate-900 pt-3 border-t-2 border-slate-900">
              <span>Net Operating Profit</span>
              <span className={`tabular-nums ${netIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {netIncome.toLocaleString()} RWF
              </span>
            </div>
          </div>
        </div>

        {/* Working Capital Balances */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h2 className="font-bold text-slate-900 text-sm border-b pb-2">Working Capital & Trade Balances</h2>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-blue-900">Accounts Receivable (Customer Credit)</p>
                <p className="text-[11px] text-blue-600">Total customer credit due</p>
              </div>
              <p className="font-bold text-blue-900 text-sm tabular-nums">{totalAR.toLocaleString()} RWF</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-amber-900">Accounts Payable (Vendor Bills)</p>
                <p className="text-[11px] text-amber-600">Total unpaid supplier invoices</p>
              </div>
              <p className="font-bold text-amber-900 text-sm tabular-nums">{totalAP.toLocaleString()} RWF</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-emerald-900">Net Working Capital</p>
                <p className="text-[11px] text-emerald-600">AR minus AP balance</p>
              </div>
              <p className="font-bold text-emerald-900 text-sm tabular-nums">{(totalAR - totalAP).toLocaleString()} RWF</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
