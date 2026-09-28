import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart,
  Search,
  Barcode,
  Camera,
  Trash2,
  Plus,
  Minus,
  Printer,
  Package,
  Clock,
  Cloud,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  RefreshCw,
  Edit,
  Save,
  Check,
  Store,
  Menu,
  ChevronRight,
  ShieldCheck,
  Server,
  Download,
  Upload,
  Share2,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';

interface Product {
  id: number;
  barcode: string;
  name: string;
  price: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface TransactionItem {
  product_name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Transaction {
  id: number;
  invoice_no: string;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  cashier_name: string;
  created_at: string;
  items: TransactionItem[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'pos' | 'products' | 'history' | 'cloudflare'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // POS State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [cashierName, setCashierName] = useState<string>('Kasir Utama');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  // Checkout / Receipt Modal
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Product Management State
  const [productForm, setProductForm] = useState<{ id?: number; barcode: string; name: string; price: string }>({
    barcode: '',
    name: '',
    price: ''
  });
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productModalOpen, setProductModalOpen] = useState<boolean>(false);

  // Virtual Numpad State
  const [numpadOpen, setNumpadOpen] = useState<boolean>(false);
  const [discountType, setDiscountType] = useState<'rp' | 'pct'>('rp');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [menuDropdownOpen, setMenuDropdownOpen] = useState<boolean>(false);

  // Report Filter States
  const [reportPeriod, setReportPeriod] = useState<string>('30'); // '7', '15', '30', '60', '90', or 'month_0'..'month_11'
  const [selectedReportProduct, setSelectedReportProduct] = useState<string>('all'); // 'all' or product name search

  const handleNumpadPress = (val: string) => {
    if (val === 'C') {
      setPaidAmount('');
    } else if (val === '⌫') {
      setPaidAmount(prev => prev.slice(0, -1));
    } else {
      setPaidAmount(prev => prev + val);
    }
  };

  // Transactions History State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const cached = localStorage.getItem('tokobazar_offline_transactions');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Network Connectivity State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Offline Transaction Queue Auto-Sync Effect
  useEffect(() => {
    const syncPendingTransactions = async () => {
      if (!navigator.onLine) return;
      try {
        const pendingQueueStr = localStorage.getItem('tokobazar_pending_tx_queue');
        if (!pendingQueueStr) return;
        const queue: any[] = JSON.parse(pendingQueueStr);
        if (queue.length === 0) return;

        console.log(`Auto-syncing ${queue.length} pending offline transactions to Cloudflare D1...`);
        const remainingQueue = [];
        for (const tx of queue) {
          try {
            const res = await fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(tx)
            });
            if (!res.ok) {
              remainingQueue.push(tx);
            }
          } catch {
            remainingQueue.push(tx);
          }
        }
        localStorage.setItem('tokobazar_pending_tx_queue', JSON.stringify(remainingQueue));
        if (remainingQueue.length < queue.length) {
          fetchTransactions();
        }
      } catch (e) {
        console.error('Failed to sync offline queue', e);
      }
    };

    window.addEventListener('online', syncPendingTransactions);
    if (navigator.onLine) {
      syncPendingTransactions();
    }

    return () => {
      window.removeEventListener('online', syncPendingTransactions);
    };
  }, []);

  // Fetch Products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      if (!navigator.onLine) {
        throw new Error('Offline (Koneksi Terputus)');
      }
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Gagal memuat data produk');
      const data = await res.json();
      setProducts(data);
      localStorage.setItem('tokobazar_offline_products', JSON.stringify(data));
      setError(null);
    } catch (err: any) {
      // Fallback to offline storage
      const cached = localStorage.getItem('tokobazar_offline_products');
      if (cached) {
        setProducts(JSON.parse(cached));
        setError('Pemberitahuan: Sedang offline. Menggunakan data produk dari cache lokal.');
      } else {
        setError(err.message || 'Terjadi kesalahan');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch Transactions
  const fetchTransactions = async () => {
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
        localStorage.setItem('tokobazar_offline_transactions', JSON.stringify(data));
      }
    } catch (e) {
      console.log('Using offline transactions cache');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchTransactions();
  }, []);

  // Barcode Scanner Setup
  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 150 } },
        false
      );

      scanner.render(
        (decodedText) => {
          handleBarcodeScanned(decodedText);
          scanner.clear().catch(console.error);
          setIsScanning(false);
        },
        (error) => {
          // scanning warnings can be ignored
        }
      );
      scannerRef.current = scanner;

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [isScanning]);

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const res = await fetch(`/api/products?barcode=${encodeURIComponent(barcode)}`);
      if (res.ok) {
        const product: Product = await res.json();
        if (product) {
          addToCart(product);
        } else {
          alert(`Produk dengan barcode "${barcode}" tidak ditemukan di database!`);
        }
      }
    } catch (e) {
      console.error('Error scanning barcode', e);
    }
  };

  // Cart Management
  const addToCart = (product: Product) => {
    setRecentProducts(prev => {
      const filtered = prev.filter(p => p.id !== product.id);
      return [product, ...filtered].slice(0, 5);
    });

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPaidAmount('');
    setDiscountValue('');
  };

  // Calculations
  const subtotalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const numericDiscountInput = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'rp'
    ? Math.min(numericDiscountInput, subtotalAmount)
    : Math.min((subtotalAmount * numericDiscountInput) / 100, subtotalAmount);
  const totalAmount = Math.max(0, subtotalAmount - discountAmount);
  const numericPaid = parseFloat(paidAmount) || 0;
  const changeAmount = numericPaid - totalAmount;

  const quickCashOptions = [5000, 10000, 15000, 20000, 25000, 50000, 75000, 100000, 200000];

  // Checkout Process with Offline Queue
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (numericPaid < totalAmount) {
      alert('Uang pembayaran kurang dari total belanja!');
      return;
    }

    const invoiceNo = `INV/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Math.floor(1000 + Math.random() * 9000)}`;
    const txData: Transaction = {
      id: Date.now(),
      invoice_no: invoiceNo,
      total_amount: totalAmount,
      paid_amount: numericPaid,
      change_amount: changeAmount,
      cashier_name: cashierName,
      created_at: new Date().toISOString(),
      items: cart.map(item => ({
        product_name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        subtotal: item.product.price * item.quantity
      }))
    };

    if (!navigator.onLine) {
      try {
        const existingQueue = JSON.parse(localStorage.getItem('tokobazar_pending_tx_queue') || '[]');
        existingQueue.push(txData);
        localStorage.setItem('tokobazar_pending_tx_queue', JSON.stringify(existingQueue));

        setTransactions(prev => [txData, ...prev]);
        setCompletedTx(txData as any);
        setShowReceiptModal(true);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        clearCart();
        alert('Mode Offline: Transaksi disimpan di antrean lokal (Queue) dan akan otomatis sinkron ke D1 saat online kembali.');
      } catch (err) {
        alert('Gagal menyimpan transaksi offline');
      }
      return;
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txData)
      });

      if (res.ok) {
        const result = await res.json();
        setCompletedTx(result.transaction);
        setShowReceiptModal(true);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        fetchTransactions();
        clearCart();
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal memproses transaksi');
      }
    } catch (e) {
      try {
        const existingQueue = JSON.parse(localStorage.getItem('tokobazar_pending_tx_queue') || '[]');
        existingQueue.push(txData);
        localStorage.setItem('tokobazar_pending_tx_queue', JSON.stringify(existingQueue));

        setTransactions(prev => [txData, ...prev]);
        setCompletedTx(txData as any);
        setShowReceiptModal(true);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        clearCart();
        alert('Koneksi server terputus. Transaksi dimasukkan ke antrean offline dan akan disinkronkan otomatis.');
      } catch (err) {
        alert('Terjadi kesalahan koneksi server');
      }
    }
  };

  // Product Save
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { barcode, name, price } = productForm;
    if (!barcode || !name || !price) {
      alert('Semua field wajib diisi!');
      return;
    }

    try {
      const method = editingProductId ? 'PUT' : 'POST';
      const body = editingProductId
        ? { id: editingProductId, barcode, name, price: parseFloat(price) }
        : { barcode, name, price: parseFloat(price) };

      const res = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        fetchProducts();
        setProductModalOpen(false);
        setProductForm({ barcode: '', name: '', price: '' });
        setEditingProductId(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal menyimpan produk');
      }
    } catch (e) {
      alert('Gagal menyimpan produk');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Yakin ingin menghapus produk ini dari database?')) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchProducts();
      } else {
        alert('Gagal menghapus produk');
      }
    } catch (e) {
      alert('Gagal menghapus produk');
    }
  };

  const openEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setProductForm({ barcode: p.barcode, name: p.name, price: String(p.price) });
    setProductModalOpen(true);
  };

  // Export Products to CSV / Google Sheets backup
  const exportProductsToCSV = () => {
    if (products.length === 0) {
      alert('Tidak ada data produk untuk diexport.');
      return;
    }
    const headers = ['ID', 'Barcode', 'Nama Barang', 'Harga (IDR)'];
    const rows = products.map(p => [p.id, `"${p.barcode}"`, `"${p.name.replace(/"/g, '""')}"`, p.price]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tokobazar-products-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import Products CSV State & Handler
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'append' | 'overwrite'>('append');
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      alert('Pilih file CSV terlebih dahulu!');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          alert('Format CSV tidak valid atau kosong (minimal header + 1 baris data).');
          return;
        }

        const parsedProducts = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
          const cols = line.split(regex).map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 4) {
            const barcode = cols[1];
            const name = cols[2];
            const price = parseFloat(cols[3].replace(/[^0-9.]/g, ''));
            if (barcode && name && !isNaN(price)) {
              parsedProducts.push({ barcode, name, price });
            }
          } else if (cols.length === 3) {
            const barcode = cols[0];
            const name = cols[1];
            const price = parseFloat(cols[2].replace(/[^0-9.]/g, ''));
            if (barcode && name && !isNaN(price)) {
              parsedProducts.push({ barcode, name, price });
            }
          }
        }

        if (parsedProducts.length === 0) {
          alert('Tidak ada data produk valid yang dapat dibaca dari file CSV.');
          return;
        }

        const res = await fetch('/api/products/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: parsedProducts, mode: importMode })
        });

        if (res.ok) {
          const result = await res.json();
          alert(`Berhasil mengimpor! Ditambahkan: ${result.countAdded}, Diperbarui: ${result.countUpdated}`);
          setImportModalOpen(false);
          setImportFile(null);
          fetchProducts();
        } else {
          const err = await res.json();
          alert(err.error || 'Gagal mengimpor data');
        }
      } catch (err) {
        console.error('Import parse error', err);
        alert('Gagal memproses file CSV');
      }
    };
    reader.readAsText(importFile);
  };

  // Download receipt as image via html2canvas
  const downloadReceiptAsImage = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const image = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = image;
      a.download = `Struk-${completedTx?.invoice_no.replace(/\//g, '-')}.png`;
      a.click();
    } catch (err) {
      console.error('Failed to generate receipt image', err);
      alert('Gagal mendownload gambar struk');
    }
  };

  // Send receipt to WhatsApp
  const sendReceiptToWhatsApp = () => {
    if (!completedTx) return;
    const itemsList = completedTx.items
      .map(i => `• ${i.product_name} (${i.quantity}x ${formatRupiah(i.price)}) = *${formatRupiah(i.subtotal)}*`)
      .join('\n');

    const message = `*STRUK BELANJA - TOKO BAZAR*
---------------------------------------
No. Inv : ${completedTx.invoice_no}
Tanggal : ${new Date(completedTx.created_at).toLocaleString('id-ID')}
Kasir   : ${completedTx.cashier_name}
---------------------------------------
*Rincian Belanja:*
${itemsList}
---------------------------------------
*Total Belanja : ${formatRupiah(completedTx.total_amount)}*
Tunai Dibayar  : ${formatRupiah(completedTx.paid_amount)}
Kembalian      : ${formatRupiah(completedTx.change_amount)}
---------------------------------------
Terima kasih telah berbelanja di TokoBazar! 🙏`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Filter products for POS
  const filteredProducts = products.filter(
    p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery)
  );

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  // Daily Sales Summary calculations
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTransactions = transactions.filter(t => t.created_at.slice(0, 10) === todayStr);
  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const todayItemsCount = todayTransactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0);

  // Advanced Report Filtering (7/15/30/60/90 days or specific month, and product search)
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.created_at);
    const now = new Date();
    const diffTime = now.getTime() - txDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    // Period filter
    if (reportPeriod.startsWith('month_')) {
      const monthIdx = parseInt(reportPeriod.split('_')[1], 10);
      if (txDate.getMonth() !== monthIdx || txDate.getFullYear() !== now.getFullYear()) {
        return false;
      }
    } else {
      const days = parseInt(reportPeriod, 10);
      if (diffDays > days) return false;
    }

    // Product filter
    if (selectedReportProduct !== 'all') {
      const hasProduct = tx.items.some(item =>
        item.product_name.toLowerCase().includes(selectedReportProduct.toLowerCase())
      );
      if (!hasProduct) return false;
    }

    return true;
  });

  const periodRevenue = filteredTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const periodItemsCount = filteredTransactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0);

  const specificProductStats = selectedReportProduct !== 'all' ? filteredTransactions.reduce((acc, t) => {
    t.items.forEach(i => {
      if (i.product_name.toLowerCase().includes(selectedReportProduct.toLowerCase())) {
        acc.qty += i.quantity;
        acc.revenue += i.subtotal;
      }
    });
    return acc;
  }, { qty: 0, revenue: 0 }) : null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-rose-600 p-2.5 rounded-xl shadow-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                TokoBazar <span className="text-xs bg-rose-500/35 text-rose-200 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono">POS v2.0</span>
              </h1>
              <p className="text-xs text-slate-400">Kalkulator Belanja , Github + CF D1 , tokobagus.sms@gmail.com</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-base font-bold transition-all shadow-md ${
                activeTab === 'pos'
                  ? 'bg-rose-600 text-white border-2 border-rose-500'
                  : 'bg-slate-950 text-slate-200 border-2 border-slate-700 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Hitung</span>
            </button>

            {/* MENU Dropdown (Barang, Riwayat, ?) */}
            <div className="relative">
              <button
                onClick={() => setMenuDropdownOpen(!menuDropdownOpen)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-base font-bold transition-all shadow-md border-2 ${
                  ['products', 'history', 'cloudflare'].includes(activeTab)
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-slate-950 text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Menu className="w-5 h-5" />
                <span>MENU ▾</span>
              </button>

              {menuDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                  <button
                    onClick={() => { setActiveTab('products'); setMenuDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center space-x-2 transition ${
                      activeTab === 'products' ? 'bg-rose-600 text-white' : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span>Barang</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('history'); setMenuDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center space-x-2 transition ${
                      activeTab === 'history' ? 'bg-rose-600 text-white' : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Riwayat</span>
                  </button>
                  <button
                    onClick={() => { setActiveTab('cloudflare'); setMenuDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center space-x-2 transition border-t border-slate-800 ${
                      activeTab === 'cloudflare' ? 'bg-amber-600 text-white' : 'text-amber-300 hover:bg-amber-950/60'
                    }`}
                  >
                    <Cloud className="w-4 h-4" />
                    <span>? (Bantuan & Info)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <div className={`flex items-center space-x-1.5 px-3 py-2.5 rounded-xl border-2 font-bold text-sm ${
              isOnline ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{isOnline ? 'Online (DB Sinkron)' : 'Offline (DB Offline)'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span>{error}</span>
            </div>
            <button onClick={fetchProducts} className="text-sm underline font-medium hover:text-red-800">Coba Lagi</button>
          </div>
        )}

        {/* TAB 1: KASIR / POS */}
        {activeTab === 'pos' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Product Search & Catalog */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Search className="w-5 h-5 text-rose-600" />
                    <span>Cari Barang</span>
                  </h2>
                  <button
                    onClick={() => setIsScanning(true)}
                    className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Scan Kamera</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama barang atau ketik/scan barcode..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Recent Searches / Scans Feature */}
                {recentProducts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-rose-600" />
                        Pencarian / Scan Terbaru (Max 5)
                      </span>
                      <button
                        onClick={() => setRecentProducts([])}
                        className="text-[10px] text-slate-400 hover:text-rose-600 underline"
                      >
                        Hapus Riwayat
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentProducts.map(rp => (
                        <button
                          key={rp.id}
                          onClick={() => addToCart(rp)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center space-x-1 shadow-2xs"
                        >
                          <span className="truncate max-w-[120px]">{rp.name}</span>
                          <span className="text-[10px] text-rose-500 font-mono">({formatRupiah(rp.price)})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Camera Scanner Modal */}
                {isScanning && (
                  <div className="mt-4 p-4 bg-slate-900 rounded-xl text-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <Barcode className="w-4 h-4 text-rose-400" />
                        Arahkan Kamera ke Barcode / QR Code
                      </span>
                      <button
                        onClick={() => setIsScanning(false)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg"
                      >
                        Tutup Kamera
                      </button>
                    </div>
                    <div id="reader" className="overflow-hidden rounded-lg bg-slate-950"></div>
                  </div>
                )}
              </div>

              {/* Product Catalog Grid */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 text-sm">Datalog Produk ({filteredProducts.length})</h3>
                  <span className="text-xs text-slate-400">Klik produk untuk tambah ke keranjang</span>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
                    <p className="text-sm">Memuat produk dari D1...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p>Tidak ada produk yang cocok dengan pencarian.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="group bg-slate-50 hover:bg-rose-50/60 border border-slate-200 hover:border-rose-300 p-3.5 rounded-xl cursor-pointer transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-slate-800 text-sm group-hover:text-rose-900 line-clamp-2">
                              {product.name}
                            </h4>
                          </div>
                          <p className="text-xs font-mono text-slate-400 mt-1">{product.barcode}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60">
                          <span className="font-bold text-rose-600 text-sm">{formatRupiah(product.price)}</span>
                          <span className="text-xs bg-white text-slate-700 border border-slate-200 group-hover:bg-rose-600 group-hover:text-white px-2 py-1 rounded-lg font-medium transition">
                            + Tambah
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Cart & Payment Calculator */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="w-5 h-5 text-rose-600" />
                    <h2 className="font-semibold text-slate-800">Keranjang Belanja</h2>
                  </div>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Kosongkan</span>
                    </button>
                  )}
                </div>

                {/* Cart Items List */}
                <div className="flex-1 max-h-[260px] overflow-y-auto py-3 space-y-3">
                  {cart.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-slate-200 mb-2" />
                      <p className="text-sm font-medium">Keranjang masih kosong</p>
                      <p className="text-xs text-slate-400 mt-1">Scan barcode atau pilih produk dari katalog</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.product.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-slate-800 truncate">{item.product.name}</h4>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{formatRupiah(item.product.price)}</span>
                            <span>×</span>
                            <span className="font-semibold text-slate-700">{item.quantity}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                            <button
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2.5 text-xs font-semibold text-slate-800">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="font-bold text-sm text-rose-600 min-w-[70px] text-right">
                            {formatRupiah(item.product.price * item.quantity)}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-slate-400 hover:text-red-600 p-1 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Subtotal & Summary with Discount */}
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} item)</span>
                    <span className="font-bold text-slate-800">{formatRupiah(subtotalAmount)}</span>
                  </div>

                  {/* Discount Input Box */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Diskon Potongan Harga</label>
                      <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setDiscountType('rp')}
                          className={`px-2.5 py-0.5 text-xs font-bold rounded transition ${discountType === 'rp' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Rp
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountType('pct')}
                          className={`px-2.5 py-0.5 text-xs font-bold rounded transition ${discountType === 'pct' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          %
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      {discountType === 'rp' && <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>}
                      <input
                        type="number"
                        placeholder={discountType === 'rp' ? "Nominal diskon (Rp)" : "Persentase (0-100%)"}
                        value={discountValue}
                        onChange={e => setDiscountValue(e.target.value)}
                        className={`w-full py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${discountType === 'rp' ? 'pl-9 pr-3' : 'px-3'}`}
                      />
                      {discountType === 'pct' && <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>}
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs font-bold text-emerald-700 pt-0.5">
                        <span>Potongan Diskon:</span>
                        <span>- {formatRupiah(discountAmount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-200">
                    <span className="font-bold text-slate-900 text-base">Total Belanja</span>
                    <span className="text-2xl font-black text-rose-600">{formatRupiah(totalAmount)}</span>
                  </div>
                </div>

                {/* Payment & Change Calculator */}
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-bold text-slate-700">Uang Diterima dari Pelanggan (Rp)</label>
                      <button
                        type="button"
                        onClick={() => setNumpadOpen(true)}
                        className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold px-3 py-1 rounded-lg border border-rose-300 flex items-center gap-1 shadow-xs transition"
                      >
                        ⌨️ Keypad Layar
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-slate-400 font-bold">Rp</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={paidAmount}
                        onChange={e => setPaidAmount(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition text-lg"
                      />
                    </div>
                  </div>

                  {/* Quick cash suggestions */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {quickCashOptions.map(amt => (
                      <button
                        key={amt}
                        onClick={() => setPaidAmount(String(amt))}
                        className="bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs py-1.5 rounded-lg border border-slate-200 font-bold transition"
                      >
                        {amt >= 1000 ? `${amt / 1000}rb` : amt}
                      </button>
                    ))}
                    <button
                      onClick={() => setPaidAmount(String(totalAmount))}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs py-1.5 rounded-lg border border-rose-200 font-bold transition col-span-3 sm:col-span-2"
                    >
                      Uang Pas
                    </button>
                  </div>

                  {/* Change Result */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    changeAmount >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    <div>
                      <span className="text-xs font-medium uppercase tracking-wider block">Kembalian</span>
                      <span className="text-xl font-black">
                        {changeAmount >= 0 ? formatRupiah(changeAmount) : `Kurang ${formatRupiah(Math.abs(changeAmount))}`}
                      </span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button
                    disabled={cart.length === 0 || numericPaid < totalAmount}
                    onClick={handleCheckout}
                    className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg flex items-center justify-center space-x-2 transition ${
                      cart.length === 0 || numericPaid < totalAmount
                        ? 'bg-slate-300 cursor-not-allowed shadow-none'
                        : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Selesaikan Transaksi & Bayar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUK D1 */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Manajemen Produk (Database Cloudflare D1)</h2>
                <p className="text-xs text-slate-500 mt-1">Kelola data barang, harga, dan barcode untuk toko Anda.</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={exportProductsToCSV}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV / Sheets</span>
                </button>
                <button
                  onClick={() => setImportModalOpen(true)}
                  className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import CSV</span>
                </button>
                <button
                  onClick={() => {
                    setEditingProductId(null);
                    setProductForm({ barcode: '', name: '', price: '' });
                    setProductModalOpen(true);
                  }}
                  className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Produk Baru</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
                <p className="text-sm">Memuat data produk...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">#ID</th>
                      <th className="py-3 px-4">Barcode / QR</th>
                      <th className="py-3 px-4">Nama Barang</th>
                      <th className="py-3 px-4">Harga (IDR)</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-mono text-slate-500">{p.id}</td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-700">{p.barcode}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">{p.name}</td>
                        <td className="py-3.5 px-4 font-bold text-rose-600">{formatRupiah(p.price)}</td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditProduct(p)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg transition inline-flex items-center"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition inline-flex items-center"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RIWAYAT & REKAP TRANSAKSI */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Daily Sales Summary Card */}
            <div className="bg-gradient-to-br from-rose-900 to-slate-900 rounded-2xl shadow-md p-6 text-white grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-4">
                <div className="bg-rose-500/20 border border-rose-500/30 p-3.5 rounded-xl">
                  <TrendingUp className="w-7 h-7 text-rose-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-300 font-medium">Pendapatan Hari Ini</p>
                  <h3 className="text-2xl font-black mt-0.5">{formatRupiah(todayRevenue)}</h3>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-rose-500/20 border border-rose-500/30 p-3.5 rounded-xl">
                  <Calendar className="w-7 h-7 text-rose-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-300 font-medium">Total Transaksi Hari Ini</p>
                  <h3 className="text-2xl font-black mt-0.5">{todayTransactions.length} Struk</h3>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-rose-500/20 border border-rose-500/30 p-3.5 rounded-xl">
                  <Package className="w-7 h-7 text-rose-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-300 font-medium">Item Terjual Hari Ini</p>
                  <h3 className="text-2xl font-black mt-0.5">{todayItemsCount} Pcs</h3>
                </div>
              </div>
            </div>

            {/* Filter & Report Analytics Controls */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Filter Laporan & Analisis Penjualan</h2>
                  <p className="text-xs text-slate-500 mt-1">Pilih rentang hari, nama bulan, atau cari produk tertentu untuk melihat rekapitulasi.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200">
                    Periode: {filteredTransactions.length} Struk • {formatRupiah(periodRevenue)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Period Selector (7/15/30/60/90 days or Month name) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rentang Waktu / Bulan Laporan</label>
                  <select
                    value={reportPeriod}
                    onChange={e => setReportPeriod(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="7">7 Hari Terakhir</option>
                    <option value="15">15 Hari Terakhir</option>
                    <option value="30">30 Hari Terakhir</option>
                    <option value="60">60 Hari Terakhir</option>
                    <option value="90">90 Hari Terakhir</option>
                    <optgroup label="Bulan Tahun Ini">
                      {monthNames.map((m, idx) => (
                        <option key={idx} value={`month_${idx}`}>{m} {new Date().getFullYear()}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Product Search Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cari Laporan Per Barang Tertentu</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ketik nama barang (misal: Minyak, Beras)..."
                      value={selectedReportProduct === 'all' ? '' : selectedReportProduct}
                      onChange={e => setSelectedReportProduct(e.target.value.trim() === '' ? 'all' : e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                    {selectedReportProduct !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedReportProduct('all')}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Specific Product Statistics Summary if filtered */}
              {selectedReportProduct !== 'all' && specificProductStats && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-rose-900">
                  <div>
                    <span className="text-xs font-semibold uppercase block text-rose-700">Rekap Barang: "{selectedReportProduct}"</span>
                    <span className="text-sm font-bold mt-0.5 block">Terjual: <span className="text-lg font-black">{specificProductStats.qty} Pcs</span></span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold uppercase block text-rose-700">Total Omset Barang</span>
                    <span className="text-lg font-black text-rose-600">{formatRupiah(specificProductStats.revenue)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Transactions History List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Daftar Struk Transaksi Sesuai Filter</h2>
                  <p className="text-xs text-slate-500 mt-1">Daftar transaksi kasir yang cocok dengan filter tanggal & produk.</p>
                </div>
                <span className="text-xs font-mono bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full font-semibold">
                  Ditampilkan: {filteredTransactions.length} dari {transactions.length} Transaksi
                </span>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <Clock className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="font-medium text-slate-600">Tidak ada transaksi yang cocok dengan filter</p>
                  <p className="text-xs text-slate-400 mt-1">Coba ubah rentang waktu atau kata kunci pencarian produk.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTransactions.map(tx => (
                    <div key={tx.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-rose-600 text-sm">{tx.invoice_no}</span>
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">Sukses</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Waktu: {new Date(tx.created_at).toLocaleString('id-ID')} • Kasir: {tx.cashier_name}
                        </p>
                        <div className="text-xs text-slate-600 mt-2">
                          {tx.items.length} item: {tx.items.map(i => `${i.product_name} (${i.quantity}x)`).join(', ')}
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end space-x-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                        <div className="text-right">
                          <span className="text-xs text-slate-500 block">Total Belanja</span>
                          <span className="text-lg font-black text-slate-900">{formatRupiah(tx.total_amount)}</span>
                        </div>
                        <button
                          onClick={() => {
                            setCompletedTx(tx);
                            setShowReceiptModal(true);
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak Struk</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CLOUDFLARE DEPLOYMENT GUIDE */}
        {activeTab === 'cloudflare' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-amber-500 p-2.5 rounded-xl text-white">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Panduan & Kode Integrasi Cloudflare D1 & Pages</h2>
                  <p className="text-xs text-slate-500">Instruksi lengkap untuk mendeploy TokoBazar ke Cloudflare Pages dengan database Cloudflare D1.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <span className="font-bold text-amber-900 text-sm block mb-1">1. Buat Database D1</span>
                <p className="text-xs text-amber-800 leading-relaxed font-mono">
                  wrangler d1 create tokobazar-db
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <span className="font-bold text-amber-900 text-sm block mb-1">2. Binding di wrangler.toml</span>
                <p className="text-xs text-amber-800 leading-relaxed font-mono">
                  [env.production.d1_databases]<br/>
                  binding = "DB"<br/>
                  database_name = "tokobazar-db"<br/>
                  database_id = "8df1343c-a680-4588..."
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <span className="font-bold text-amber-900 text-sm block mb-1">3. Deploy ke Pages</span>
                <p className="text-xs text-amber-800 leading-relaxed font-mono">
                  npx wrangler pages deploy dist
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-rose-600" />
                <span>File Backend Cloudflare Function: <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-rose-700">functions/api/products.js</code></span>
              </h3>
              <p className="text-xs text-slate-600">
                File ini sudah otomatis dibuat di direktori proyek Anda dan siap menangani operasi D1 (GET, POST, PUT, DELETE) di Cloudflare Pages.
              </p>
              <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-x-auto">
{`export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const search = url.searchParams.get('search') || '';
    const barcode = url.searchParams.get('barcode');

    if (barcode) {
      const { results } = await context.env.DB.prepare(
        "SELECT * FROM products WHERE barcode = ?"
      ).bind(barcode).all();
      return Response.json(results[0] || null);
    }

    const { results } = await context.env.DB.prepare(
      "SELECT * FROM products ORDER BY name ASC"
    ).all();
    return Response.json(results);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}`}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* PRODUCT MODAL (Add / Edit) */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">
                {editingProductId ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h3>
              <button onClick={() => setProductModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kode Barcode / QR Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 8996001321045"
                    value={productForm.barcode}
                    onChange={e => setProductForm({ ...productForm, barcode: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                  <button
                    type="button"
                    onClick={() => setProductForm({ ...productForm, barcode: String(Math.floor(8990000000000 + Math.random() * 900000000000)) })}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-medium transition"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama Barang</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kopi Bubuk Special 200g"
                  value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Harga Jual (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 15000"
                  value={productForm.price}
                  onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 transition"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceiptModal && completedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            {/* Printable Receipt Container */}
            <div ref={receiptRef} id="receipt-print-area" className="bg-white p-2 space-y-3">
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <div className="bg-rose-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-600">
                  <Store className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-slate-900">TOKO BAZAR</h3>
                <p className="text-xs text-slate-500">Struk Pembayaran Belanja Pelanggan</p>
              </div>

              <div className="text-xs space-y-1 font-mono text-slate-600">
                <div className="flex justify-between">
                  <span>No. Inv:</span>
                  <span className="font-bold text-slate-900">{completedTx.invoice_no}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{new Date(completedTx.created_at).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span>{completedTx.cashier_name}</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-2 max-h-[180px] overflow-y-auto">
                {completedTx.items.map((item, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="font-medium text-slate-800">{item.product_name}</div>
                    <div className="flex justify-between text-slate-500">
                      <span>{item.quantity} x {formatRupiah(item.price)}</span>
                      <span className="font-semibold text-slate-800">{formatRupiah(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
                  <span>TOTAL</span>
                  <span className="text-rose-600">{formatRupiah(completedTx.total_amount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tunai Dibayar</span>
                  <span>{formatRupiah(completedTx.paid_amount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Kembalian</span>
                  <span className="font-bold text-emerald-600">{formatRupiah(completedTx.change_amount)}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-xs text-slate-400">
                <p className="font-medium text-slate-600">Terima Kasih Telah Berbelanja!</p>
                <p className="mt-0.5">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={downloadReceiptAsImage}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Gambar</span>
                </button>
                <button
                  onClick={sendReceiptToWhatsApp}
                  className="bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-sm"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Kirim WhatsApp</span>
                </button>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Thermal</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Tutup Struk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT CSV MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <span>Impor Data Produk dari CSV / Google Sheets</span>
              </h3>
              <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCSVImport} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Pilih File CSV (.csv)</label>
                <input
                  type="file"
                  accept=".csv"
                  required
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-200 rounded-xl p-2"
                />
                <p className="text-[11px] text-slate-400 mt-1">Format kolom CSV: Barcode, Nama Barang, Harga (atau ID, Barcode, Nama, Harga).</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Mode Impor</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`border p-3 rounded-xl cursor-pointer transition flex flex-col space-y-1 ${
                    importMode === 'append' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900' : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="text-indigo-600"
                      />
                      <span className="text-xs font-bold">Tambahkan Saja</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Hanya tambah produk baru. Barcode yang sudah ada akan dilewati.</span>
                  </label>

                  <label className={`border p-3 rounded-xl cursor-pointer transition flex flex-col space-y-1 ${
                    importMode === 'overwrite' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900' : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'overwrite'}
                        onChange={() => setImportMode('overwrite')}
                        className="text-indigo-600"
                      />
                      <span className="text-xs font-bold">Timpa / Perbarui</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Perbarui data produk lama jika barcode sama, tambah jika belum ada.</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition"
                >
                  Mulai Impor CSV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIRTUAL NUMPAD MODAL */}
      {numpadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border-2 border-slate-300 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>⌨️ Keypad Layar Angka</span>
              </h3>
              <button
                onClick={() => setNumpadOpen(false)}
                className="text-slate-500 hover:text-slate-800 p-1 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-100 p-3.5 rounded-xl border-2 border-slate-300 text-right">
              <span className="text-xs text-slate-500 block font-semibold uppercase">Nominal Bayar</span>
              <span className="text-2xl font-black text-rose-600 font-mono">
                Rp {paidAmount ? Number(paidAmount).toLocaleString('id-ID') : '0'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'].map(btn => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => handleNumpadPress(btn)}
                  className="bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-900 text-xl font-black py-4 rounded-xl border-2 border-slate-300 shadow-sm transition active:scale-95"
                >
                  {btn}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleNumpadPress('C')}
                className="bg-red-100 hover:bg-red-200 text-red-800 text-base font-bold py-3.5 rounded-xl border-2 border-red-300 transition"
              >
                Reset (C)
              </button>
              <button
                type="button"
                onClick={() => setNumpadOpen(false)}
                className="bg-rose-600 hover:bg-rose-700 text-white text-base font-bold py-3.5 rounded-xl shadow-md transition"
              >
                Selesai (OK)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

