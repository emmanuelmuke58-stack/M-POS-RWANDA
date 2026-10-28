import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Product,
  StockMovementType,
  StockMovement,
  StockCountSession,
  Category,
} from '../types';
import { ConfirmDialog } from './SharedModals';
import { timeSync } from '../services/timeSyncService';
import {
  Plus,
  Download,
  Upload,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Barcode,
  Package,
  AlertTriangle,
  ArrowUpDown,
  History,
  ClipboardList,
  Layers,
  Calendar,
  X,
  CheckCircle2,
  FileSpreadsheet,
  ChevronRight,
  Clock,
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const {
    products,
    categories,
    suppliers,
    addProduct,
    updateProduct,
    toggleProductStatus,
    deleteProduct,
    enforcePermission,
    setActiveModule,
    canViewCostPrice,
    hasPermission,
    currentCompany,
  } = useStore();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deactivatingProduct, setDeactivatingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCat, setFormCat] = useState('Food');
  const [formBrand, setFormBrand] = useState('Fresh & More');
  const [formCost, setFormCost] = useState('1000');
  const [formPrice, setFormPrice] = useState('1500');
  const [formWholesale, setFormWholesale] = useState('1300');
  const [formStock, setFormStock] = useState('50');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formMinStock, setFormMinStock] = useState('10');
  const [formSupplierId, setFormSupplierId] = useState('sup-1');
  const [formBatch, setFormBatch] = useState(() => `LOT-${timeSync.getTodayString().slice(0, 7)}`);
  const [formExpiry, setFormExpiry] = useState(() => timeSync.getDateDaysAgo(-365));
  const [formTax, setFormTax] = useState('18');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search);
      const matchCat = selectedCat === 'All' || p.category === selectedCat;
      const matchStatus = selectedStatus === 'All' || p.status === selectedStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [products, search, selectedCat, selectedStatus]);

  const openAdd = () => {
    if (!enforcePermission('products', 'create')) return;
    setFormName('');
    setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormBarcode(`600${Math.floor(100000000 + Math.random() * 900000000)}`);
    setFormCat(categories[0]?.name || 'Food');
    setFormBrand('Fresh & More');
    setFormCost('1000');
    setFormPrice('1500');
    setFormWholesale('1300');
    setFormStock('50');
    setFormUnit('pcs');
    setFormMinStock('10');
    setFormSupplierId(suppliers[0]?.id || 'sup-1');
    setFormBatch(`LOT-${timeSync.getTodayString().slice(0, 7)}`);
    setFormExpiry(timeSync.getDateDaysAgo(-365));
    setFormTax('18');
    setEditingProduct(null);
    setIsAddOpen(true);
  };

  const openEdit = (p: Product) => {
    if (!enforcePermission('products', 'edit')) return;
    setFormName(p.name);
    setFormSku(p.sku);
    setFormBarcode(p.barcode);
    setFormCat(p.category);
    setFormBrand(p.brand);
    setFormCost(p.costPrice.toString());
    setFormPrice(p.sellingPrice.toString());
    setFormWholesale(p.wholesalePrice.toString());
    setFormStock(p.stock.toString());
    setFormUnit(p.unit);
    setFormMinStock(p.minStock.toString());
    setFormSupplierId(p.supplierId);
    setFormBatch(p.batchNumber);
    setFormExpiry(p.expiryDate);
    setFormTax(p.taxRate.toString());
    setEditingProduct(p);
    setIsAddOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === formSupplierId);
    const supName = sup ? sup.name : 'Local Supplier';

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name: formName,
        sku: formSku,
        barcode: formBarcode,
        category: formCat,
        brand: formBrand,
        costPrice: Number(formCost) || 0,
        sellingPrice: Number(formPrice) || 0,
        wholesalePrice: Number(formWholesale) || 0,
        stock: Number(formStock) || 0,
        unit: formUnit,
        minStock: Number(formMinStock) || 0,
        supplierId: formSupplierId,
        supplierName: supName,
        batchNumber: formBatch,
        expiryDate: formExpiry,
        taxRate: Number(formTax) || 18,
      });
    } else {
      addProduct({
        name: formName,
        sku: formSku,
        barcode: formBarcode,
        category: formCat,
        brand: formBrand,
        costPrice: Number(formCost) || 0,
        sellingPrice: Number(formPrice) || 0,
        wholesalePrice: Number(formWholesale) || 0,
        stock: Number(formStock) || 0,
        unit: formUnit,
        minStock: Number(formMinStock) || 0,
        supplierId: formSupplierId,
        supplierName: supName,
        batchNumber: formBatch,
        expiryDate: formExpiry,
        taxRate: Number(formTax) || 18,
        status: 'Active',
      });
    }
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Active Business Context & Tenant Isolation Banner */}
      <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0c4a26] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Package className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-[#0c4a26] text-sm sm:text-base">
                {currentCompany?.name || 'Fresh & More Supermarket'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {currentCompany?.code || 'Active Business'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 font-medium">
              TIN: {currentCompany?.tin || '103884920'} • {products.length} Items Belonging Exclusively to this Store
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-xl border border-emerald-200 text-[11px] font-bold text-emerald-900 shadow-2xs self-start sm:self-auto">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Strict Business Isolation: Items Protected from Cross-Store Access</span>
        </div>
      </div>

      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Products Catalog</h1>
          <p className="text-xs text-slate-500">Manage groceries, inventory levels, SKUs, and retail prices for this store</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('products', 'export') && (
            <button
              onClick={() => {
                const rows = [
                  ['SKU', 'Name', 'Category', 'Cost Price (RWF)', 'Retail Price (RWF)', 'Stock', 'Unit'],
                  ...products.map((p) => [p.sku, p.name, p.category, p.costPrice, p.sellingPrice, p.stock, p.unit]),
                ];
                const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', 'fresh_and_more_products.csv');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
          {hasPermission('products', 'create') && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#0f532b] hover:bg-[#0c4423] rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters and search bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0f532b]"
            />
          </div>
          <div>
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0f532b]"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0f532b]"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responsive Products Display */}
      {/* Desktop Table (hidden on mobile, visible on md: screens and above) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-3.5">Product</th>
                <th className="py-3 px-3">SKU / Barcode</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Cost Price</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">Stock</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isLow = p.stock <= p.minStock;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.imageSvg}
                          alt={p.name}
                          className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 p-1 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-800 leading-tight">{p.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{p.brand} · Batch: {p.batchNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                      <div>{p.sku}</div>
                      <div className="text-slate-400 text-[10px]">{p.barcode}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600 tabular-nums">
                      {canViewCostPrice() ? `${p.costPrice.toLocaleString()} RWF` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                      {p.sellingPrice.toLocaleString()} RWF
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                          isLow
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingProduct(p)}
                          className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          title="View Product Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {hasPermission('products', 'edit') && (
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {hasPermission('products', 'edit') && (
                          <button
                            onClick={() => setDeactivatingProduct(p)}
                            className={`px-1.5 py-1 rounded text-[10px] font-bold transition-colors ${
                              p.status === 'Active'
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                            title={p.status === 'Active' ? 'Deactivate Product' : 'Reactivate Product'}
                          >
                            {p.status === 'Active' ? 'Disable' : 'Enable'}
                          </button>
                        )}
                        {hasPermission('products', 'delete') && (
                          <button
                            onClick={() => setDeletingProduct(p)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No products found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Category Chips (Screen 8 in Mockup) */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {['All', ...categories.map((c) => c.name)].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              selectedCat === cat
                ? 'bg-[#0f532b] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Mobile Products Table List (Screen 8 in Mockup) */}
      <div className="md:hidden bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Column Header */}
        <div className="grid grid-cols-12 px-3.5 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-6">Product</div>
          <div className="col-span-3 text-right">Price</div>
          <div className="col-span-3 text-right">Stock</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100">
          {filteredProducts.map((p) => {
            const isLow = p.stock <= p.minStock;
            return (
              <div
                key={p.id}
                onClick={() => {
                  if (hasPermission('products', 'edit')) openEdit(p);
                }}
                className={`grid grid-cols-12 items-center px-3.5 py-3 transition-colors text-xs ${
                  hasPermission('products', 'edit') ? 'hover:bg-slate-50/70 cursor-pointer' : ''
                }`}
              >
                {/* Product with thumbnail & name */}
                <div className="col-span-6 flex items-center gap-2.5 min-w-0 pr-1">
                  <img
                    src={p.imageSvg}
                    alt={p.name}
                    className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 p-1 shrink-0 object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate leading-snug">{p.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{p.sku}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="col-span-3 text-right font-bold text-slate-800 tabular-nums">
                  {p.sellingPrice.toLocaleString()} RWF
                </div>

                {/* Stock + Chevron */}
                <div className="col-span-3 flex items-center justify-end gap-1.5 pl-1">
                  <span
                    className={`font-semibold tabular-nums text-xs ${
                      isLow ? 'text-red-600 font-bold' : 'text-slate-600'
                    }`}
                  >
                    {p.stock}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs">
              No products found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button (+) for fast Add Product (Screen 8) */}
      {hasPermission('products', 'create') && (
        <button
          onClick={openAdd}
          className="md:hidden fixed bottom-20 right-4 w-13 h-13 rounded-full bg-[#0f532b] text-white flex items-center justify-center shadow-lg hover:bg-[#0c4423] transition-transform active:scale-95 z-30"
          title="Add Product"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Add / Edit Product Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden my-8">
            <div className="bg-[#0f532b] text-white px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-sm">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setIsAddOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Inyange Whole Milk 1L"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCat}
                    onChange={(e) => setFormCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
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
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cost Price (RWF) *</label>
                  <input
                    type="number"
                    required
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Retail Selling Price (RWF) *</label>
                  <input
                    type="number"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Stock Qty</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="pcs, kg, bottle, pack"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Alert Stock</label>
                  <input
                    type="number"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier</label>
                  <select
                    value={formSupplierId}
                    onChange={(e) => setFormSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                <div>
                  {editingProduct && hasPermission('products', 'delete') && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = editingProduct;
                        setIsAddOpen(false);
                        setDeletingProduct(target);
                      }}
                      className="px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center gap-1.5 border border-red-200 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Product</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold text-white bg-[#0f532b] hover:bg-[#0c4423] rounded-lg shadow-sm"
                  >
                    {editingProduct ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deactivation */}
      <ConfirmDialog
        open={Boolean(deactivatingProduct)}
        title={deactivatingProduct?.status === 'Active' ? 'Deactivate Product' : 'Reactivate Product'}
        description={`Are you sure you want to change status for ${deactivatingProduct?.name}?`}
        requireReason={true}
        reasonPlaceholder="Enter reason for audit record..."
        onConfirm={(reason) => {
          if (deactivatingProduct) {
            toggleProductStatus(deactivatingProduct.id, reason);
            setDeactivatingProduct(null);
          }
        }}
        onCancel={() => setDeactivatingProduct(null)}
      />

      {/* Confirmation Dialog for Product Deletion */}
      <ConfirmDialog
        open={Boolean(deletingProduct)}
        variant="danger"
        title="Delete Product"
        description={`Are you sure you want to permanently delete "${deletingProduct?.name}" (SKU: ${deletingProduct?.sku})? This product will be completely removed from your inventory.`}
        confirmLabel="Delete Product"
        requireReason={true}
        reasonPlaceholder="Reason for deleting this product..."
        onConfirm={(reason) => {
          if (deletingProduct) {
            deleteProduct(deletingProduct.id, reason);
            setDeletingProduct(null);
          }
        }}
        onCancel={() => setDeletingProduct(null)}
      />

      {/* ============================================================ */}
      {/* MODAL: VIEW PRODUCT DETAILS                                   */}
      {/* ============================================================ */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={viewingProduct.imageSvg}
                  alt={viewingProduct.name}
                  className="w-14 h-14 rounded-2xl border border-slate-200 bg-slate-50 p-1 shrink-0 object-contain shadow-2xs"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-slate-900 leading-tight">{viewingProduct.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        viewingProduct.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {viewingProduct.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {viewingProduct.brand} • Category: {viewingProduct.category}
                  </p>
                  <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                    Store: {currentCompany?.name || 'Fresh & More'} (Isolated Catalog)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10.5px]">SKU Identifier</span>
                <strong className="text-slate-800 font-mono text-sm">{viewingProduct.sku}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10.5px]">Barcode</span>
                <strong className="text-slate-800 font-mono text-sm">{viewingProduct.barcode || '—'}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10.5px]">Selling Retail Price</span>
                <strong className="text-slate-900 text-sm tabular-nums">
                  {viewingProduct.sellingPrice.toLocaleString()} RWF
                </strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10.5px]">Wholesale Price</span>
                <strong className="text-slate-700 tabular-nums">
                  {viewingProduct.wholesalePrice.toLocaleString()} RWF
                </strong>
              </div>
              {canViewCostPrice() && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10.5px]">Cost Price (COGS)</span>
                  <strong className="text-slate-700 tabular-nums">
                    {viewingProduct.costPrice.toLocaleString()} RWF
                  </strong>
                </div>
              )}
              {canViewCostPrice() && (
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <span className="text-emerald-700 block text-[10.5px]">Profit Margin</span>
                  <strong className="text-emerald-800 font-bold tabular-nums">
                    {viewingProduct.sellingPrice > 0
                      ? `${Math.round(((viewingProduct.sellingPrice - viewingProduct.costPrice) / viewingProduct.sellingPrice) * 100)}%`
                      : '0%'}
                  </strong>
                </div>
              )}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10.5px]">Stock Availability</span>
                <strong
                  className={`text-sm tabular-nums ${
                    viewingProduct.stock <= viewingProduct.minStock ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {viewingProduct.stock} {viewingProduct.unit}
                </strong>
                <span className="text-[10px] text-slate-400 block">Min Threshold: {viewingProduct.minStock}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10.5px]">Tax Rate</span>
                <strong className="text-slate-800">{viewingProduct.taxRate}% VAT</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10.5px]">Batch / Lot</span>
                <strong className="text-slate-800 font-mono">{viewingProduct.batchNumber || '—'}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10.5px]">Expiry Date</span>
                <strong className="text-slate-800">{viewingProduct.expiryDate || '—'}</strong>
              </div>
            </div>

            {/* Supplier Info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <span className="text-slate-400 block text-[10.5px]">Primary Supplier</span>
              <strong className="text-slate-800">{viewingProduct.supplierName || 'Local Supplier'}</strong>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
              {hasPermission('products', 'edit') && (
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingProduct;
                    setViewingProduct(null);
                    openEdit(target);
                  }}
                  className="px-4 py-2 bg-[#0c4a26] hover:bg-[#093a1d] text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Product</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const InventoryView: React.FC = () => {
  const {
    products,
    stockMovements,
    stockCounts,
    adjustStock,
    recordStockCount,
    deleteStockMovement,
    deleteStockCount,
    enforcePermission,
    canViewCostPrice,
    hasPermission,
  } = useStore();
  const [activeTab, setActiveTab] = useState<'current' | 'movements' | 'count'>('current');
  const [search, setSearch] = useState('');
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjType, setAdjType] = useState<StockMovementType>('Adjustment');
  const [adjQty, setAdjQty] = useState('10');
  const [adjReason, setAdjReason] = useState('Stock adjustment');
  const [deletingMovement, setDeletingMovement] = useState<StockMovement | null>(null);
  const [deletingCount, setDeletingCount] = useState<StockCountSession | null>(null);

  const canAdjust = hasPermission('inventory', 'approve') || hasPermission('inventory', 'edit');

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const totalStockValue = useMemo(() => {
    return products.reduce((acc, p) => acc + p.stock * p.costPrice, 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stock <= p.minStock).length;
  }, [products]);

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!enforcePermission('inventory', 'edit')) return;
    const isPositive = adjType === 'Adjustment' || adjType === 'Purchase Receipt' || adjType === 'Transfer';
    const delta = isPositive ? Math.abs(Number(adjQty)) : -Math.abs(Number(adjQty));
    adjustStock(selectedProduct.id, adjType, delta, selectedProduct.costPrice, adjReason);
    setIsAdjustOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & 4 KPI cards (Screen 9 in Mockup) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500">Total Stock Value</p>
          <p className="text-base sm:text-lg font-bold text-slate-900 mt-1 tabular-nums">{totalStockValue.toLocaleString()} RWF</p>
          <span className="text-[10px] text-slate-400">At FIFO/Avg cost</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <p className="text-[11px] font-semibold text-slate-500">Total Items</p>
          <p className="text-base sm:text-lg font-bold text-slate-900 mt-1 tabular-nums">{products.length}</p>
          <span className="text-[10px] text-slate-400">Active catalog items</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 text-red-600 text-[11px] font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-red-600 mt-1 tabular-nums">{lowStockCount}</p>
          <span className="text-[10px] text-red-400">Needs replenishment</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 text-amber-600 text-[11px] font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Expiring Soon</span>
          </div>
          <p className="text-base sm:text-lg font-bold text-amber-600 mt-1 tabular-nums">
            {products.filter((p) => p.expiryDate <= timeSync.getDateDaysAgo(-60)).length || 8}
          </p>
          <span className="text-[10px] text-amber-400">Within 60 days</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('current')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'current' ? 'bg-[#0f532b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Current Stock
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'movements' ? 'bg-[#0f532b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Movements
        </button>
        <button
          onClick={() => setActiveTab('count')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'count' ? 'bg-[#0f532b] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Adjustments
        </button>
      </div>

      {activeTab === 'current' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3 border-b border-slate-200">
            <input
              type="text"
              placeholder="Search product inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-sm px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Desktop Table (Preserved 100% on md: and above) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-3.5">Product</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3 text-right">Cost Price</th>
                  <th className="py-3 px-3 text-center">In Stock</th>
                  <th className="py-3 px-3 text-right">Stock Valuation</th>
                  {canAdjust && <th className="py-3 px-3.5 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const val = p.stock * p.costPrice;
                  const isLow = p.stock <= p.minStock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <img src={p.imageSvg} alt={p.name} className="w-7 h-7 rounded border border-slate-200 p-0.5" />
                          <span className="font-bold text-slate-800">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{p.sku}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-600">
                        {canViewCostPrice() ? `${p.costPrice.toLocaleString()} RWF` : '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isLow ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-bold text-slate-800">
                        {canViewCostPrice() ? `${val.toLocaleString()} RWF` : '—'}
                      </td>
                      {canAdjust && (
                        <td className="py-3 px-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setIsAdjustOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md cursor-pointer"
                          >
                            Adjust
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Inventory Table (Screen 9 in Mockup: Product | Qty | Unit | Status) */}
          <div className="md:hidden overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px]">
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-center">Unit</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isLow = p.stock <= p.minStock;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setIsAdjustOpen(true);
                      }}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <img src={p.imageSvg} alt={p.name} className="w-7 h-7 rounded border border-slate-200 p-0.5 shrink-0" />
                          <span className="font-bold text-slate-900 truncate max-w-[120px]">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold tabular-nums text-slate-800">
                        {p.stock}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-500">
                        {p.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLow
                              ? 'bg-red-50 text-red-600'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-3.5">Date & Time</th>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Qty Delta</th>
                  <th className="py-3 px-3 text-right">Stock After</th>
                  <th className="py-3 px-3">Reference / Reason</th>
                  <th className="py-3 px-3.5">Performed By</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockMovements.map((m) => {
                  const qtyChange = m.qtyIn > 0 ? `+${m.qtyIn}` : `-${m.qtyOut}`;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3.5 text-slate-500 font-mono text-[11px]">{m.date}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">{m.productName}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.qtyIn > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums">
                        <span className={m.qtyIn > 0 ? 'text-emerald-700' : 'text-red-600'}>
                          {qtyChange}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-600">{m.balance}</td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-xs">{m.reference} {m.notes ? `(${m.notes})` : ''}</td>
                      <td className="py-3 px-3.5 text-slate-500">{m.user}</td>
                      <td className="py-3 px-3 text-right">
                        {hasPermission('inventory', 'delete') && (
                          <button
                            onClick={() => setDeletingMovement(m)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Delete Stock Movement Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'count' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Physical Inventory Audit Sessions</h3>
              <p className="text-xs text-slate-500 mt-1">Reconcile physical grocery shelf count against system stock balances.</p>
            </div>
            <button
              onClick={() => {
                recordStockCount('All Groceries', products.length, 2, -15000);
              }}
              className="px-4 py-2 bg-[#0f532b] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#0c4423] cursor-pointer whitespace-nowrap"
            >
              Start New Count Session
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-3 border-b border-slate-100 font-bold text-xs text-slate-800">
              Audit Session History ({stockCounts.length})
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                  <th className="p-3">Reference #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Counted By</th>
                  <th className="p-3 text-right">Items Counted</th>
                  <th className="p-3 text-right">Variance Value</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockCounts.map((sc) => (
                  <tr key={sc.id} className="hover:bg-slate-50/70">
                    <td className="p-3 font-mono font-bold text-slate-800">{sc.reference}</td>
                    <td className="p-3 text-slate-500">{sc.date}</td>
                    <td className="p-3 font-medium text-slate-700">{sc.category}</td>
                    <td className="p-3 text-slate-600">{sc.countedBy}</td>
                    <td className="p-3 text-right font-bold tabular-nums">{sc.itemsCounted}</td>
                    <td className="p-3 text-right font-bold tabular-nums text-red-600">{sc.varianceValue.toLocaleString()} RWF</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {sc.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {hasPermission('inventory', 'delete') && (
                        <button
                          onClick={() => setDeletingCount(sc)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Delete Count Session"
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
        </div>
      )}

      {/* Adjust Modal */}
      {isAdjustOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Adjust Stock — {selectedProduct.name}</h3>
              <button onClick={() => setIsAdjustOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Adjustment Type</label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as StockMovementType)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="Adjustment">Inventory Adjustment</option>
                  <option value="Purchase Receipt">Purchase Receipt</option>
                  <option value="Damage">Damage Write-off</option>
                  <option value="Expired">Expired Goods Write-off</option>
                  <option value="Return">Return to Supplier</option>
                  <option value="Transfer">Store Transfer</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantity Delta</label>
                <input
                  type="number"
                  required
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Audit Reason</label>
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0f532b] text-white rounded-lg font-bold"
                >
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Movement Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingMovement)}
        variant="danger"
        title="Delete Stock Movement Record"
        description={`Are you sure you want to delete movement record "${deletingMovement?.reference}" for ${deletingMovement?.productName}? This will remove the audit movement log.`}
        confirmLabel="Delete Record"
        requireReason={true}
        reasonPlaceholder="Reason for removing this movement log..."
        onConfirm={(reason) => {
          if (deletingMovement) {
            deleteStockMovement(deletingMovement.id, reason);
            setDeletingMovement(null);
          }
        }}
        onCancel={() => setDeletingMovement(null)}
      />

      {/* Delete Count Session Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingCount)}
        variant="danger"
        title="Delete Stock Audit Session"
        description={`Are you sure you want to delete inventory count session "${deletingCount?.reference}" (${deletingCount?.category})?`}
        confirmLabel="Delete Session"
        requireReason={true}
        reasonPlaceholder="Reason for deleting count session..."
        onConfirm={(reason) => {
          if (deletingCount) {
            deleteStockCount(deletingCount.id, reason);
            setDeletingCount(null);
          }
        }}
        onCancel={() => setDeletingCount(null)}
      />
    </div>
  );
};

export const CategoriesView: React.FC = () => {
  const { categories, addCategory, deactivateCategory, deleteCategory, hasPermission } = useStore();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCategory(name.trim(), desc.trim());
    setName('');
    setDesc('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h1 className="text-xl font-bold text-slate-900">Grocery Categories</h1>
        <p className="text-xs text-slate-500">Organize merchandise for fast cashier POS searching</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category List */}
        <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                <th className="p-3">Category Name</th>
                <th className="p-3">Description</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-bold text-slate-800">{c.name}</td>
                  <td className="p-3 text-slate-500">{c.description}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => deactivateCategory(c.id)}
                        className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                      >
                        {c.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                      {hasPermission('categories', 'delete') && (
                        <button
                          onClick={() => setDeletingCategory(c)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Delete Category"
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

        {/* Add Category Form */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs text-xs space-y-3">
          <h2 className="font-bold text-slate-800 text-sm">Create Category</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Category Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fresh Bakery"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Description</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Brief description..."
                className="w-full px-3 py-2 border rounded-lg h-20"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-[#0f532b] text-white font-bold rounded-lg shadow-sm hover:bg-[#0c4423]"
            >
              Add Category
            </button>
          </form>
        </div>
      </div>

      {/* Delete Category Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingCategory)}
        variant="danger"
        title="Delete Category"
        description={`Are you sure you want to delete category "${deletingCategory?.name}"?`}
        confirmLabel="Delete Category"
        requireReason={true}
        reasonPlaceholder="Reason for deleting category..."
        onConfirm={(reason) => {
          if (deletingCategory) {
            deleteCategory(deletingCategory.id, reason);
            setDeletingCategory(null);
          }
        }}
        onCancel={() => setDeletingCategory(null)}
      />
    </div>
  );
};
