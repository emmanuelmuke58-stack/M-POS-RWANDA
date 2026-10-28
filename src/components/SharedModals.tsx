import React, { useState } from 'react';
import { Sale } from '../types';
import { useStore } from '../context/StoreContext';
import { Printer, Download, Share2, CheckCircle2, X, AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm Action',
  requireReason = false,
  reasonPlaceholder = 'Enter reason for audit log...',
  variant = 'warning',
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is required for this sensitive operation (logged in Audit Trail).');
      return;
    }
    onConfirm(reason.trim() || 'Confirmed by user');
    setReason('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-lg overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                variant === 'danger'
                  ? 'bg-red-50 text-red-600'
                  : variant === 'warning'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Sensitive operation — recorded in Audit Logs</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>

          {requireReason && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit Reason / Explanation <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError('');
                }}
                placeholder={reasonPlaceholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
              />
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : variant === 'warning'
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-[#116b36] hover:bg-[#0d542a]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  confirmLabel?: string;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  confirmText,
  confirmLabel,
  variant = 'danger',
  ...props
}) => {
  return (
    <ConfirmDialog
      {...props}
      variant={variant}
      confirmLabel={confirmText || confirmLabel || 'Confirm Action'}
    />
  );
};

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
  onNewSale?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose, onNewSale }) => {
  const { settings, notify } = useStore();

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
    notify('info', 'Print Triggered', `Sent receipt ${sale.reference} to printer.`);
  };

  const handleDownload = () => {
    const lines = [
      '========================================',
      '              FRESH & MORE              ',
      '         Alimentation / Grocery         ',
      `   ${settings.address}`,
      `   Tel: ${settings.phone} | TIN: ${settings.tin}`,
      '========================================',
      `Receipt No : ${sale.reference}`,
      `Date & Time: ${sale.date} ${sale.time}`,
      `Cashier    : ${sale.cashier}`,
      `Customer   : ${sale.customerName}`,
      '----------------------------------------',
      'Product               Qty   Price  Total',
      '----------------------------------------',
      ...sale.items.map(
        (i) =>
          `${i.productName.padEnd(20, ' ').slice(0, 20)} ${String(i.qty).padStart(3, ' ')} ${String(
            i.unitPrice
          ).padStart(7, ' ')} ${String(i.total).padStart(7, ' ')}`
      ),
      '----------------------------------------',
      `Subtotal:              ${sale.subtotal.toLocaleString()} RWF`,
      `Discount:              ${sale.discount.toLocaleString()} RWF`,
      `Tax (18% VAT incl.):   ${sale.tax.toLocaleString()} RWF`,
      `TOTAL:                 ${sale.total.toLocaleString()} RWF`,
      '----------------------------------------',
      `Payment Method:        ${sale.paymentMethod}`,
      `Amount Paid:           ${sale.amountReceived.toLocaleString()} RWF`,
      `Change:                ${sale.changeGiven.toLocaleString()} RWF`,
      ...(sale.balanceDue > 0 ? [`Balance Due:           ${sale.balanceDue.toLocaleString()} RWF`] : []),
      '========================================',
      settings.receiptFooter,
      '========================================',
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt-${sale.reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    notify('success', 'Receipt Downloaded', `Saved Receipt-${sale.reference}.txt`);
  };

  const handleShare = () => {
    const summary = `Fresh & More Receipt ${sale.reference} — Total: ${sale.total.toLocaleString()} RWF (${sale.paymentMethod}) on ${sale.date} ${sale.time}. Thank you for shopping with Fresh & More!`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary);
    }
    notify('success', 'Receipt Copied', 'Receipt summary copied to clipboard.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="bg-[#116b36] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="text-sm font-bold">Sale Completed — {sale.reference}</h3>
              <p className="text-[11px] text-emerald-100">Thermal / PDF Receipt Preview</p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-100 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div id="printable-area" className="p-5 bg-white text-slate-900 text-xs font-mono overflow-y-auto flex-1">
          <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
            <div className="text-base font-bold tracking-wide text-slate-900">FRESH &amp; MORE</div>
            <div className="text-xs text-slate-600 font-semibold">Alimentation / Grocery</div>
            <div className="text-[11px] text-slate-500 mt-1">{settings.address}</div>
            <div className="text-[11px] text-slate-500">
              Tel: {settings.phone} · TIN: {settings.tin}
            </div>
          </div>

          <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 mb-3 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt Number:</span>
              <span className="font-bold tabular-nums">{sale.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date &amp; Time:</span>
              <span className="tabular-nums">
                {sale.date} {sale.time}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{sale.cashier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span>{sale.customerName}</span>
            </div>
          </div>

          <table className="w-full text-[11px] mb-3 border-b border-dashed border-slate-300 pb-3">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-1.5 font-semibold">Product</th>
                <th className="pb-1.5 font-semibold text-right">Qty</th>
                <th className="pb-1.5 font-semibold text-right">Price</th>
                <th className="pb-1.5 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 pr-2 font-medium text-slate-800">{item.productName}</td>
                  <td className="py-1.5 text-right tabular-nums">{item.qty}</td>
                  <td className="py-1.5 text-right tabular-nums">{item.unitPrice.toLocaleString()}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 mb-3 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{sale.subtotal.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Discount</span>
              <span className="tabular-nums">-{sale.discount.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax (VAT 18% incl.)</span>
              <span className="tabular-nums">{sale.tax.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL</span>
              <span className="tabular-nums">{sale.total.toLocaleString()} RWF</span>
            </div>
          </div>

          <div className="space-y-1 border-b border-dashed border-slate-300 pb-3 mb-3 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-bold">{sale.paymentMethod}</span>
            </div>
            {sale.splits && sale.splits.length > 0 && (
              <div className="pl-2 space-y-0.5 text-[10px] text-slate-500">
                {sale.splits.map((s, i) => (
                  <div key={i} className="flex justify-between">
                    <span>• {s.method}</span>
                    <span className="tabular-nums">{s.amount.toLocaleString()} RWF</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Paid:</span>
              <span className="tabular-nums">{sale.amountReceived.toLocaleString()} RWF</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Change:</span>
              <span className="font-bold text-emerald-700 tabular-nums">{sale.changeGiven.toLocaleString()} RWF</span>
            </div>
            {sale.balanceDue > 0 && (
              <div className="flex justify-between text-amber-700 font-bold">
                <span>Credit Balance Due:</span>
                <span className="tabular-nums">{sale.balanceDue.toLocaleString()} RWF</span>
              </div>
            )}
          </div>

          <div className="text-center text-[11px] text-slate-500 pt-1">
            <p className="font-semibold text-slate-700">Thank you for shopping with Fresh &amp; More.</p>
            <p className="text-[10px] mt-0.5">Kigali, Rwanda · Currency: RWF</p>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 shrink-0">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
          <button
            onClick={() => {
              if (onNewSale) onNewSale();
              onClose();
            }}
            className="w-full py-2.5 text-xs font-bold text-white bg-[#116b36] hover:bg-[#0d542a] rounded-lg"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
};
