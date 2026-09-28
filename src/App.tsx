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
  Calendar,
  Tag,
  Percent,
  Receipt,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Flame,
  Layers,
  ArrowUpDown,
  Settings,
  Volume2,
  VolumeX,
  Smartphone,
  BookOpen,
  List,
  Eye,
  CheckCircle
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import html2canvas from 'html2canvas';
import confetti from 'canvas-confetti';
import { PWAInstallButton } from './components/PWAInstallButton';

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
  subtotal_amount?: number;
  discount_amount?: number;
  tax_amount?: number;
  tax_type?: 'rp' | 'pct';
  tax_value?: string;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  cashier_name: string;
  created_at: string;
  items: TransactionItem[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'pos' | 'catalog' | 'products' | 'top-selling' | 'history' | 'settings' | 'cloudflare'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // POS & Catalog State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [cashierName, setCashierName] = useState<string>(() => {
    return localStorage.getItem('tokobazar_cashier_name') || 'Kasir Utama';
  });
  const [storeName, setStoreName] = useState<string>(() => {
    return localStorage.getItem('tokobazar_store_name') || 'TokoBazar';
  });
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  // Camera Settings & Scanner References (Default: Smartphone Back / Rear Camera)
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>(() => {
    return (localStorage.getItem('tokobazar_camera_facing') as 'environment' | 'user') || 'environment';
  });
  const [selectedCameraId, setSelectedCameraId] = useState<string>(() => {
    return localStorage.getItem('tokobazar_camera_id') || '';
  });
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('tokobazar_sound_enabled') !== 'false';
  });
  const [seniorFontMode, setSeniorFontMode] = useState<boolean>(() => {
    return localStorage.getItem('tokobazar_senior_mode') === 'true';
  });

  const [scannerStarting, setScannerStarting] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameraTestActive, setCameraTestActive] = useState<boolean>(false);
  const [cameraTestStarting, setCameraTestStarting] = useState<boolean>(false);

  // Eye-director: Visual highlight whenever Total Belanja changes
  const [totalHighlight, setTotalHighlight] = useState<boolean>(false);
  const [itemAddedNotice, setItemAddedNotice] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<any>(null);
  const noticeTimeoutRef = useRef<any>(null);

  const posScannerRef = useRef<Html5Qrcode | null>(null);
  const modalScannerRef = useRef<Html5Qrcode | null>(null);
  const testScannerRef = useRef<Html5Qrcode | null>(null);

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
  const [isModalScanning, setIsModalScanning] = useState<boolean>(false);

  // Virtual Numpad State
  const [numpadOpen, setNumpadOpen] = useState<boolean>(false);
  const [discountType, setDiscountType] = useState<'rp' | 'pct'>('rp');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [showDiscountSection, setShowDiscountSection] = useState<boolean>(false);
  const [taxType, setTaxType] = useState<'rp' | 'pct'>('pct');
  const [taxValue, setTaxValue] = useState<string>('');
  const [showTaxSection, setShowTaxSection] = useState<boolean>(false);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState<boolean>(false);

  // In-app Alert / Toast & Confirm Dialog (avoids window.alert / window.confirm in iframe)
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showAlert = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Report Filter States (Default: 'today_yesterday' for Hari Ini & Kemarin)
  const [reportPeriod, setReportPeriod] = useState<string>('today_yesterday');
  const [selectedReportProduct, setSelectedReportProduct] = useState<string>('all');

  // Top Terjual Filter & Sort States (Default: 'today' for Hari Ini)
  const [topPeriod, setTopPeriod] = useState<'today' | 'yesterday' | 'today_yesterday' | '7days' | '30days' | 'this_month' | 'all'>('today');
  const [topSearch, setTopSearch] = useState<string>('');
  const [topSortBy, setTopSortBy] = useState<'qty' | 'revenue'>('qty');

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

  // Audio Beep Effect on Barcode Scan
  const playBeepSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio context might be restricted before user touch
    }
  };

  // Enumerate available cameras
  const refreshAvailableCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setAvailableCameras(devices);
      }
    } catch (e) {
      console.log('Camera list not available yet:', e);
    }
  };

  useEffect(() => {
    refreshAvailableCameras();
  }, []);

  // Barcode Scanner Setup for POS (Defaults to Back Camera)
  useEffect(() => {
    let qr: Html5Qrcode | null = null;
    let isCancelled = false;

    if (isScanning) {
      setScannerStarting(true);
      setScannerError(null);

      const startCamera = async () => {
        try {
          qr = new Html5Qrcode("pos-camera-viewfinder");
          posScannerRef.current = qr;

          // Camera selection: Default is 'environment' (Back Camera)
          const cameraConfig = selectedCameraId
            ? selectedCameraId
            : { facingMode: cameraFacing };

          await qr.start(
            cameraConfig,
            {
              fps: 15,
              qrbox: (w, h) => {
                const minEdge = Math.min(w, h);
                return {
                  width: Math.floor(minEdge * 0.85),
                  height: Math.floor(minEdge * 0.55)
                };
              },
              aspectRatio: 1.0
            },
            (decodedText) => {
              playBeepSound();
              handleBarcodeScanned(decodedText);
              // Stop after successful scan
              if (posScannerRef.current && posScannerRef.current.isScanning) {
                posScannerRef.current.stop().then(() => {
                  posScannerRef.current?.clear();
                  posScannerRef.current = null;
                }).catch(() => {});
              }
              setIsScanning(false);
            },
            () => {}
          );

          if (!isCancelled) {
            setScannerStarting(false);
            refreshAvailableCameras();
          }
        } catch (err: any) {
          console.warn('Back camera init failed, attempting fallback camera:', err);
          if (qr && !isCancelled) {
            try {
              await qr.start(
                { facingMode: 'user' },
                { fps: 15, qrbox: { width: 250, height: 150 } },
                (decodedText) => {
                  playBeepSound();
                  handleBarcodeScanned(decodedText);
                  if (posScannerRef.current && posScannerRef.current.isScanning) {
                    posScannerRef.current.stop().then(() => {
                      posScannerRef.current?.clear();
                      posScannerRef.current = null;
                    }).catch(() => {});
                  }
                  setIsScanning(false);
                },
                () => {}
              );
              setScannerStarting(false);
              return;
            } catch (fallbackErr) {
              console.error('All camera attempts failed:', fallbackErr);
            }
          }
          if (!isCancelled) {
            setScannerStarting(false);
            setScannerError('Kamera tidak dapat diakses atau izin belum diberikan. Silakan izinkan akses kamera di pengaturan browser HP Anda.');
          }
        }
      };

      startCamera();
    }

    return () => {
      isCancelled = true;
      if (posScannerRef.current) {
        if (posScannerRef.current.isScanning) {
          posScannerRef.current.stop().then(() => {
            posScannerRef.current?.clear();
            posScannerRef.current = null;
          }).catch(() => {});
        } else {
          try {
            posScannerRef.current.clear();
            posScannerRef.current = null;
          } catch {}
        }
      }
    };
  }, [isScanning, cameraFacing, selectedCameraId]);

  // Modal Barcode Scanner Setup (when adding new product - defaults to Back Camera)
  useEffect(() => {
    let modalQr: Html5Qrcode | null = null;
    let isCancelled = false;

    if (isModalScanning) {
      const startModalCamera = async () => {
        try {
          modalQr = new Html5Qrcode("modal-barcode-reader");
          modalScannerRef.current = modalQr;

          const cameraConfig = selectedCameraId ? selectedCameraId : { facingMode: cameraFacing };

          await modalQr.start(
            cameraConfig,
            { fps: 15, qrbox: { width: 250, height: 150 } },
            (decodedText) => {
              playBeepSound();
              setProductForm(prev => ({ ...prev, barcode: decodedText }));
              showAlert(`Barcode berhasil dipindai: ${decodedText}`, 'success');
              if (modalScannerRef.current && modalScannerRef.current.isScanning) {
                modalScannerRef.current.stop().then(() => {
                  modalScannerRef.current?.clear();
                  modalScannerRef.current = null;
                }).catch(() => {});
              }
              setIsModalScanning(false);
            },
            () => {}
          );
        } catch {
          // Fallback to user facing
          if (modalQr && !isCancelled) {
            try {
              await modalQr.start(
                { facingMode: 'user' },
                { fps: 15, qrbox: { width: 250, height: 150 } },
                (decodedText) => {
                  playBeepSound();
                  setProductForm(prev => ({ ...prev, barcode: decodedText }));
                  showAlert(`Barcode berhasil dipindai: ${decodedText}`, 'success');
                  if (modalScannerRef.current && modalScannerRef.current.isScanning) {
                    modalScannerRef.current.stop().then(() => {
                      modalScannerRef.current?.clear();
                      modalScannerRef.current = null;
                    }).catch(() => {});
                  }
                  setIsModalScanning(false);
                },
                () => {}
              );
            } catch {
              showAlert('Gagal membuka kamera. Periksa izin akses kamera di browser Anda.', 'error');
              setIsModalScanning(false);
            }
          }
        }
      };

      startModalCamera();
    }

    return () => {
      isCancelled = true;
      if (modalScannerRef.current) {
        if (modalScannerRef.current.isScanning) {
          modalScannerRef.current.stop().then(() => {
            modalScannerRef.current?.clear();
            modalScannerRef.current = null;
          }).catch(() => {});
        } else {
          try {
            modalScannerRef.current.clear();
            modalScannerRef.current = null;
          } catch {}
        }
      }
    };
  }, [isModalScanning, cameraFacing, selectedCameraId]);

  // Test Camera Setup for SETTING submenu
  useEffect(() => {
    let testQr: Html5Qrcode | null = null;
    if (cameraTestActive) {
      setCameraTestStarting(true);
      const startTest = async () => {
        try {
          testQr = new Html5Qrcode("setting-camera-test-viewfinder");
          testScannerRef.current = testQr;
          const cameraConfig = selectedCameraId ? selectedCameraId : { facingMode: cameraFacing };
          await testQr.start(
            cameraConfig,
            { fps: 15, qrbox: { width: 250, height: 150 } },
            (decodedText) => {
              playBeepSound();
              showAlert(`Berhasil membaca barcode saat tes: ${decodedText}`, 'success');
            },
            () => {}
          );
          setCameraTestStarting(false);
        } catch (e: any) {
          setCameraTestStarting(false);
          showAlert(`Gagal menguji kamera: ${e.message || 'Izin ditolak'}`, 'error');
          setCameraTestActive(false);
        }
      };
      startTest();
    }

    return () => {
      if (testScannerRef.current) {
        if (testScannerRef.current.isScanning) {
          testScannerRef.current.stop().then(() => {
            testScannerRef.current?.clear();
            testScannerRef.current = null;
          }).catch(() => {});
        } else {
          try {
            testScannerRef.current.clear();
            testScannerRef.current = null;
          } catch {}
        }
      }
    };
  }, [cameraTestActive, cameraFacing, selectedCameraId]);

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const res = await fetch(`/api/products?barcode=${encodeURIComponent(barcode)}`);
      if (res.ok) {
        const product: Product = await res.json();
        if (product) {
          addToCart(product);
        } else {
          showAlert(`Produk dengan barcode "${barcode}" tidak ditemukan di database!`, 'error');
        }
      }
    } catch (e) {
      console.error('Error scanning barcode', e);
    }
  };

  // Cart Management
  const triggerTotalHighlight = (noticeText?: string) => {
    setTotalHighlight(false);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);

    // Micro-delay to re-trigger CSS animation
    setTimeout(() => {
      setTotalHighlight(true);
    }, 20);

    highlightTimeoutRef.current = setTimeout(() => {
      setTotalHighlight(false);
    }, 1800);

    if (noticeText) {
      setItemAddedNotice(noticeText);
      noticeTimeoutRef.current = setTimeout(() => {
        setItemAddedNotice(null);
      }, 2500);
    }
  };

  const addToCart = (product: Product) => {
    setRecentProducts(prev => {
      const filtered = prev.filter(p => p.id !== product.id);
      return [product, ...filtered].slice(0, 5);
    });

    let newQty = 1;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        newQty = existing.quantity + 1;
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    triggerTotalHighlight(`+ ${product.name} (Total: ${newQty} pcs)`);
  };

  const updateQuantity = (productId: number, delta: number) => {
    let changedProductName = '';
    let updatedQty = 0;

    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            changedProductName = item.product.name;
            const newQty = item.quantity + delta;
            updatedQty = newQty;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );

    if (delta > 0) {
      triggerTotalHighlight(`+ 1 ${changedProductName || 'barang'} (Total: ${updatedQty} pcs)`);
    } else {
      triggerTotalHighlight(updatedQty > 0 ? `- 1 ${changedProductName || 'barang'} (Sisa: ${updatedQty} pcs)` : `Dihapus: ${changedProductName}`);
    }
  };

  const removeFromCart = (productId: number) => {
    const item = cart.find(i => i.product.id === productId);
    setCart(prev => prev.filter(i => i.product.id !== productId));
    triggerTotalHighlight(`Dihapus: ${item?.product.name || 'Barang'}`);
  };

  const clearCart = () => {
    setCart([]);
    setPaidAmount('');
    setDiscountValue('');
    setTaxValue('');
    setShowDiscountSection(false);
    setShowTaxSection(false);
    triggerTotalHighlight('Keranjang dikosongkan');
  };

  // Calculations
  const subtotalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Discount calculation
  const numericDiscountInput = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'rp'
    ? Math.min(numericDiscountInput, subtotalAmount)
    : Math.min((subtotalAmount * numericDiscountInput) / 100, subtotalAmount);

  // Tax / Biaya Tambahan calculation (from total brutto / subtotal)
  const numericTaxInput = parseFloat(taxValue) || 0;
  const taxAmount = taxType === 'rp'
    ? Math.max(0, numericTaxInput)
    : Math.max(0, (subtotalAmount * numericTaxInput) / 100);

  const totalAmount = Math.max(0, subtotalAmount - discountAmount + taxAmount);
  const numericPaid = parseFloat(paidAmount) || 0;
  const changeAmount = numericPaid - totalAmount;

  const quickCashOptions = [5000, 10000, 15000, 20000, 25000, 50000, 75000, 100000, 200000];

  // Checkout Process with Offline Queue
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (numericPaid < totalAmount) {
      showAlert('Uang pembayaran kurang dari total belanja!', 'error');
      return;
    }

    const invoiceNo = `INV/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Math.floor(1000 + Math.random() * 9000)}`;
    const txData: Transaction = {
      id: Date.now(),
      invoice_no: invoiceNo,
      subtotal_amount: subtotalAmount,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      tax_type: taxType,
      tax_value: taxValue,
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
        showAlert('Mode Offline: Transaksi disimpan di antrean lokal (Queue) dan akan otomatis sinkron ke D1 saat online kembali.', 'info');
      } catch (err) {
        showAlert('Gagal menyimpan transaksi offline', 'error');
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
        showAlert(err.error || 'Gagal memproses transaksi', 'error');
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
        showAlert('Koneksi server terputus. Transaksi dimasukkan ke antrean offline dan akan disinkronkan otomatis.', 'info');
      } catch (err) {
        showAlert('Terjadi kesalahan koneksi server', 'error');
      }
    }
  };

  // Product Save
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { barcode, name, price } = productForm;
    if (!barcode || !name || !price) {
      showAlert('Semua field wajib diisi!', 'error');
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
        showAlert('Produk berhasil disimpan!', 'success');
      } else {
        const err = await res.json();
        showAlert(err.error || 'Gagal menyimpan produk', 'error');
      }
    } catch (e) {
      showAlert('Gagal menyimpan produk', 'error');
    }
  };

  const handleDeleteProduct = (id: number) => {
    setConfirmDialog({
      message: 'Yakin ingin menghapus produk ini dari database?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchProducts();
            showAlert('Produk berhasil dihapus', 'success');
          } else {
            showAlert('Gagal menghapus produk', 'error');
          }
        } catch (e) {
          showAlert('Gagal menghapus produk', 'error');
        }
      }
    });
  };

  const openEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setProductForm({ barcode: p.barcode, name: p.name, price: String(p.price) });
    setProductModalOpen(true);
  };

  // Export Products to CSV / Google Sheets backup
  const exportProductsToCSV = () => {
    if (products.length === 0) {
      showAlert('Tidak ada data produk untuk diexport.', 'info');
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
    showAlert('File CSV produk berhasil diunduh', 'success');
  };

  // Import Products CSV State & Handler
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'append' | 'overwrite'>('append');
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      showAlert('Pilih file CSV terlebih dahulu!', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          showAlert('Format CSV tidak valid atau kosong (minimal header + 1 baris data).', 'error');
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
          showAlert('Tidak ada data produk valid yang dapat dibaca dari file CSV.', 'error');
          return;
        }

        const res = await fetch('/api/products/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ products: parsedProducts, mode: importMode })
        });

        if (res.ok) {
          const result = await res.json();
          showAlert(`Berhasil mengimpor! Ditambahkan: ${result.countAdded}, Diperbarui: ${result.countUpdated}`, 'success');
          setImportModalOpen(false);
          setImportFile(null);
          fetchProducts();
        } else {
          const err = await res.json();
          showAlert(err.error || 'Gagal mengimpor data', 'error');
        }
      } catch (err) {
        console.error('Import parse error', err);
        showAlert('Gagal memproses file CSV', 'error');
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
      showAlert('Gagal mendownload gambar struk', 'error');
    }
  };

  // Send receipt to WhatsApp
  const sendReceiptToWhatsApp = () => {
    if (!completedTx) return;
    const itemsList = completedTx.items
      .map(i => `• ${i.product_name} (${i.quantity}x ${formatRupiah(i.price)}) = *${formatRupiah(i.subtotal)}*`)
      .join('\n');

    const subtotalText = (completedTx.discount_amount || completedTx.tax_amount)
      ? `Subtotal       : ${formatRupiah(completedTx.subtotal_amount || completedTx.total_amount)}\n`
      : '';
    const discountText = completedTx.discount_amount && completedTx.discount_amount > 0
      ? `Diskon         : -${formatRupiah(completedTx.discount_amount)}\n`
      : '';
    const taxText = completedTx.tax_amount && completedTx.tax_amount > 0
      ? `Pajak / Biaya  : +${formatRupiah(completedTx.tax_amount)} (${completedTx.tax_type === 'pct' ? `${completedTx.tax_value}%` : 'Rp'})\n`
      : '';

    const message = `*STRUK BELANJA - TOKO BAZAR*
---------------------------------------
No. Inv : ${completedTx.invoice_no}
Tanggal : ${new Date(completedTx.created_at).toLocaleString('id-ID')}
Kasir   : ${completedTx.cashier_name}
---------------------------------------
*Rincian Belanja:*
${itemsList}
---------------------------------------
${subtotalText}${discountText}${taxText}*Total Belanja : ${formatRupiah(completedTx.total_amount)}*
Tunai Dibayar  : ${formatRupiah(completedTx.paid_amount)}
Kembalian      : ${formatRupiah(completedTx.change_amount)}
---------------------------------------
Terima kasih telah berbelanja di TokoBazar! 🙏`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  // Filter products for POS
  const filteredProducts = products.filter(
    p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery)
  );

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  // Local Date Helper (YYYY-MM-DD)
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();
  const todayDateStr = getLocalDateString(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDateStr = getLocalDateString(yesterday);

  // Daily Sales Summary calculations (Hari Ini)
  const todayTransactions = transactions.filter(t => getLocalDateString(new Date(t.created_at)) === todayDateStr);
  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const todayItemsCount = todayTransactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0);

  // Advanced Report Filtering (Default: Hari Ini & Kemarin)
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.created_at);
    const txDateStr = getLocalDateString(txDate);
    const diffTime = now.getTime() - txDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    // Period filter
    if (reportPeriod === 'today_yesterday') {
      if (txDateStr !== todayDateStr && txDateStr !== yesterdayDateStr) return false;
    } else if (reportPeriod === 'today') {
      if (txDateStr !== todayDateStr) return false;
    } else if (reportPeriod === 'yesterday') {
      if (txDateStr !== yesterdayDateStr) return false;
    } else if (reportPeriod === 'all') {
      // all pass
    } else if (reportPeriod.startsWith('month_')) {
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

  // TOP TERJUAL CALCULATIONS (Per selected period, Default: 'today')
  const topSoldTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.created_at);
    const txDateStr = getLocalDateString(txDate);
    const diffTime = now.getTime() - txDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    if (topPeriod === 'today') {
      return txDateStr === todayDateStr;
    } else if (topPeriod === 'yesterday') {
      return txDateStr === yesterdayDateStr;
    } else if (topPeriod === 'today_yesterday') {
      return txDateStr === todayDateStr || txDateStr === yesterdayDateStr;
    } else if (topPeriod === '7days') {
      return diffDays <= 7;
    } else if (topPeriod === '30days') {
      return diffDays <= 30;
    } else if (topPeriod === 'this_month') {
      return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    }
    return true; // 'all'
  });

  const topItemMap = new Map<string, { name: string; barcode?: string; price: number; qty: number; revenue: number; txCount: number }>();

  topSoldTransactions.forEach(tx => {
    tx.items.forEach(item => {
      const prod = products.find(p => p.name.toLowerCase() === item.product_name.toLowerCase());
      const existing = topItemMap.get(item.product_name);
      if (existing) {
        existing.qty += item.quantity;
        existing.revenue += item.subtotal;
        existing.txCount += 1;
      } else {
        topItemMap.set(item.product_name, {
          name: item.product_name,
          barcode: prod?.barcode,
          price: item.price,
          qty: item.quantity,
          revenue: item.subtotal,
          txCount: 1
        });
      }
    });
  });

  const topProductsList = Array.from(topItemMap.values())
    .filter(p => p.name.toLowerCase().includes(topSearch.toLowerCase()) || (p.barcode && p.barcode.includes(topSearch)))
    .sort((a, b) => topSortBy === 'qty' ? b.qty - a.qty : b.revenue - a.revenue);

  const topTotalUnits = Array.from(topItemMap.values()).reduce((sum, p) => sum + p.qty, 0);
  const topTotalRevenue = Array.from(topItemMap.values()).reduce((sum, p) => sum + p.revenue, 0);
  const maxTopQty = topProductsList.length > 0 ? Math.max(...topProductsList.map(p => p.qty)) : 1;

  // Export Top Sold Products to CSV
  const exportTopSoldToCSV = () => {
    if (topProductsList.length === 0) {
      showAlert('Tidak ada data produk terjual untuk diexport pada periode ini.', 'info');
      return;
    }
    const headers = ['Peringkat', 'Nama Barang', 'Kode Barcode', 'Harga Satuan (IDR)', 'Kuantitas Terjual (Pcs)', 'Total Omzet (IDR)', 'Jumlah Transaksi'];
    const rows = topProductsList.map((p, idx) => [
      `#${idx + 1}`,
      `"${p.name.replace(/"/g, '""')}"`,
      `'${p.barcode || '-'}'`,
      p.price,
      p.qty,
      p.revenue,
      p.txCount
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `top_terjual_${topPeriod}_${todayDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('Data Top Terjual berhasil diunduh sebagai CSV', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-slate-950 text-white shadow-lg sticky top-0 z-30 w-full overflow-x-hidden border-b-2 border-slate-800">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
          {/* Store Name: Icon hidden on smartphone vertical (<sm) to save space, 2-line layout on mobile, high contrast white text */}
          <div className="flex items-center space-x-2 min-w-0">
            <div className="hidden sm:flex bg-rose-600 p-2 sm:p-2.5 rounded-xl shadow-md items-center justify-center shrink-0">
              <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 leading-tight">
                <h1 className="text-sm sm:text-lg md:text-xl font-black tracking-tight text-white truncate max-w-[130px] xs:max-w-[170px] sm:max-w-none">
                  {storeName}
                </h1>
                <span className="text-[9px] sm:text-[10px] bg-rose-600 text-white px-1.5 py-0.2 rounded-md font-mono font-bold tracking-wider shrink-0">
                  POS
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-semibold truncate leading-tight">
                Kalkulator Kasir
              </p>
            </div>
          </div>

          {/* Navigation Controls: Hitung (with total items) and MENU */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-base font-extrabold transition-all shadow-sm border-2 ${
                activeTab === 'pos'
                  ? 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-500/40'
                  : 'bg-slate-900 text-white border-slate-700 hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
              <span>Hitung</span>
              {cart.length > 0 && (
                <span className={`bg-amber-400 text-slate-950 text-xs px-2 py-0.5 rounded-full font-black ${totalHighlight ? 'animate-badge-pop ring-2 ring-white' : ''}`}>
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>

            {/* MENU Button */}
            <button
              onClick={() => setMenuDropdownOpen(!menuDropdownOpen)}
              className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-base font-extrabold transition-all shadow-sm border-2 ${
                menuDropdownOpen || activeTab !== 'pos'
                  ? 'bg-slate-900 text-white border-rose-500 ring-2 ring-rose-500/40'
                  : 'bg-slate-900 text-white border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
              <span>MENU ▾</span>
            </button>
          </div>
        </div>

        {/* Senior-Friendly MENU Drawer / Modal Overlay */}
        {menuDropdownOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-start justify-end sm:justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs"
            onClick={() => setMenuDropdownOpen(false)}
          >
            <div 
              className="bg-slate-900 border-2 border-slate-700 text-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-4 sm:p-5 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Store className="w-5 h-5 text-rose-500" />
                  <span className="font-bold text-base text-slate-100">Menu Utama Toko</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuDropdownOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-sm font-bold border border-slate-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  <span>Tutup</span>
                </button>
              </div>

              {/* Submenus with large legible touch targets for 60+ users */}
              <div className="space-y-2">
                {/* 1. Lihat Katalog Produk (Request 2) */}
                <button
                  onClick={() => { setActiveTab('catalog'); setMenuDropdownOpen(false); }}
                  className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border-2 ${
                    activeTab === 'catalog'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
                      <Package className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                      <div className="font-bold text-base">Lihat Katalog Produk</div>
                      <div className="text-xs text-slate-400">Daftar semua barang & harga ({products.length} item)</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>

                {/* 2. Top Terjual (Request 3: strictly submenu of MENU) */}
                <button
                  onClick={() => { setActiveTab('top-selling'); setMenuDropdownOpen(false); }}
                  className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border-2 ${
                    activeTab === 'top-selling'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                      <TrendingUp className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="font-bold text-base flex items-center gap-1.5">
                        <span>Top Terjual</span>
                        <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded-full font-bold">Laris</span>
                      </div>
                      <div className="text-xs text-slate-400">Peringkat barang paling laku per periode</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>

                {/* 3. Kelola Barang */}
                <button
                  onClick={() => { setActiveTab('products'); setMenuDropdownOpen(false); }}
                  className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border-2 ${
                    activeTab === 'products'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
                      <Barcode className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-bold text-base">Kelola Barang</div>
                      <div className="text-xs text-slate-400">Tambah baru, ubah harga, hapus, import CSV</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>

                {/* 4. Riwayat Transaksi */}
                <button
                  onClick={() => { setActiveTab('history'); setMenuDropdownOpen(false); }}
                  className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border-2 ${
                    activeTab === 'history'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                      <Clock className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-bold text-base">Riwayat Transaksi</div>
                      <div className="text-xs text-slate-400">Struk penjualan hari ini, kemarin, & laporan</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>

                {/* 5. Pengaturan (Setting) (Request 4) */}
                <button
                  onClick={() => { setActiveTab('settings'); setMenuDropdownOpen(false); }}
                  className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border-2 ${
                    activeTab === 'settings'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl">
                      <Settings className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="font-bold text-base">Pengaturan (Setting)</div>
                      <div className="text-xs text-slate-400">Kamera default belakang/depan, nama kasir, suara</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>

                {/* 6. Bantuan & Database D1 */}
                <button
                  onClick={() => { setActiveTab('cloudflare'); setMenuDropdownOpen(false); }}
                  className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border-2 ${
                    activeTab === 'cloudflare'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl">
                      <Cloud className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-bold text-base">? (Bantuan & D1)</div>
                      <div className="text-xs text-slate-400">Panduan offline & sinkronisasi database</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Status & PWA Install in Menu */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-2.5 rounded-xl">
                  <span>Kasir Aktif: <strong className="text-slate-200">{cashierName}</strong></span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                    isOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                  }`}>
                    {isOnline ? '● Online' : '○ Offline'}
                  </span>
                </div>
                <div className="flex justify-center">
                  <PWAInstallButton className="w-full justify-center" />
                </div>
              </div>
            </div>
          </div>
        )}
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
          <div className="space-y-4">
            {/* MOBILE QUICK TOTAL BAR (Visible on small screens <lg) - Directs senior cashier eyes directly to current Total Belanja */}
            <div
              className={`lg:hidden rounded-2xl p-3.5 transition-all duration-300 border-2 shadow-md ${
                totalHighlight
                  ? 'bg-amber-300 text-slate-950 border-amber-500 ring-4 ring-amber-400/50 scale-101 animate-total-change'
                  : 'bg-slate-950 text-white border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      totalHighlight ? 'bg-slate-950 text-amber-300' : 'bg-rose-600 text-white'
                    }`}>
                      {totalHighlight ? '⚡ BERUBAH' : 'TOTAL BELANJA'}
                    </span>
                    <span className={`text-xs font-bold ${totalHighlight ? 'text-slate-900' : 'text-slate-300'}`}>
                      ({cart.reduce((s, i) => s + i.quantity, 0)} Pcs)
                    </span>
                  </div>
                  <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight mt-0.5 ${
                    totalHighlight ? 'text-slate-950 underline decoration-slate-950' : 'text-amber-300'
                  }`}>
                    {formatRupiah(totalAmount)}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('pos-cart-calculator-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-black shadow-sm transition flex items-center gap-1 ${
                      totalHighlight
                        ? 'bg-slate-950 text-amber-300 hover:bg-slate-900'
                        : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Ke Bayar ↓</span>
                  </button>
                </div>
              </div>

              {itemAddedNotice && (
                <div className={`mt-2 pt-1 border-t text-xs font-bold flex items-center justify-between ${
                  totalHighlight ? 'border-slate-950/20 text-slate-950' : 'border-slate-800 text-amber-300'
                }`}>
                  <span className="truncate">👉 {itemAddedNotice}</span>
                  <span className="text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded shrink-0 ml-1">Total Baru</span>
                </div>
              )}
            </div>

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

                {/* Camera Scanner Container (Auto Back Camera with Flip & Close controls) */}
                {isScanning && (
                  <div className="mt-4 p-4 bg-slate-900 rounded-2xl text-white shadow-xl border border-slate-700 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center space-x-2">
                        <Camera className="w-5 h-5 text-rose-500 animate-pulse" />
                        <span className="text-sm font-bold text-slate-100">
                          {cameraFacing === 'environment' ? '📷 Kamera Belakang (Utama)' : '🤳 Kamera Depan'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const next = cameraFacing === 'environment' ? 'user' : 'environment';
                            setCameraFacing(next);
                            setSelectedCameraId('');
                            localStorage.setItem('tokobazar_camera_facing', next);
                            localStorage.removeItem('tokobazar_camera_id');
                          }}
                          className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 transition"
                          title="Balik kamera belakang / depan"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Balik Kamera</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsScanning(false)}
                          className="flex items-center space-x-1 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <X className="w-4 h-4" />
                          <span>Tutup</span>
                        </button>
                      </div>
                    </div>

                    {scannerStarting && (
                      <div className="py-8 text-center text-slate-400 flex flex-col items-center space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
                        <p className="text-sm font-medium">Membuka kamera belakang smartphone...</p>
                      </div>
                    )}

                    {scannerError && (
                      <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs space-y-2">
                        <p className="font-bold flex items-center gap-1.5 text-red-300">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <span>{scannerError}</span>
                        </p>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => { setScannerError(null); setScannerStarting(true); setIsScanning(true); }}
                            className="bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold"
                          >
                            Coba Lagi
                          </button>
                          <button
                            type="button"
                            onClick={() => { setActiveTab('settings'); setIsScanning(false); }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg font-bold"
                          >
                            Pengaturan Kamera
                          </button>
                        </div>
                      </div>
                    )}

                    <div id="pos-camera-viewfinder" className="overflow-hidden rounded-xl bg-black min-h-[220px]"></div>
                    <p className="text-center text-xs text-slate-400">
                      Arahkan kotak pemindai ke garis barcode barang. Bunyi 'bip' akan berbunyi saat barcode terbaca.
                    </p>
                  </div>
                )}
              </div>

              {/* Product Catalog / Search View */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex-1 flex flex-col min-h-[360px]">
                {searchQuery.trim() === '' ? (
                  <div className="py-12 px-4 text-center flex flex-col items-center justify-center my-auto space-y-3">
                    <div className="w-14 h-14 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center shadow-inner mx-auto">
                      <ShoppingCart className="w-7 h-7 text-rose-600" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <p className="font-bold text-slate-800 text-base">Kalkulator Kasir Siap</p>
                      <p className="text-xs text-slate-500">
                        Ketik nama barang di kotak pencarian di atas atau tekan tombol <strong>Scan Kamera</strong> untuk memasukkan belanjaan ke keranjang.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-800 text-sm">
                        Hasil Pencarian ({filteredProducts.length})
                      </h3>
                      <span className="text-xs text-slate-400">Klik produk untuk tambah ke keranjang</span>
                    </div>

                    {loading ? (
                      <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
                        <p className="text-sm">Memuat produk...</p>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-medium text-slate-600">Tidak ada produk yang cocok dengan pencarian.</p>
                        <p className="text-xs text-slate-400 mt-1">Periksa kembali ejaan nama atau kode barcode.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                        {filteredProducts.map(product => (
                          <div
                            key={product.id}
                            onClick={() => addToCart(product)}
                            className="group bg-white hover:bg-rose-50/70 border-2 border-slate-300 hover:border-rose-600 p-3.5 rounded-xl cursor-pointer transition flex flex-col justify-between shadow-2xs hover:shadow-md"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-slate-950 text-sm sm:text-base group-hover:text-rose-950 line-clamp-2">
                                  {product.name}
                                </h4>
                              </div>
                              <p className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded inline-block mt-1.5 border border-slate-200">
                                {product.barcode}
                              </p>
                            </div>
                            <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-200">
                              <span className="font-black text-rose-700 text-base sm:text-lg font-mono">{formatRupiah(product.price)}</span>
                              <span className="text-xs bg-rose-600 text-white group-hover:bg-rose-700 px-3 py-1.5 rounded-lg font-bold shadow-2xs transition">
                                + Tambah
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Cart & Payment Calculator */}
            <div id="pos-cart-calculator-section" className="lg:col-span-5 flex flex-col space-y-4">
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
                      <div key={item.product.id} className="bg-white p-3 sm:p-3.5 rounded-xl border-2 border-slate-300 shadow-xs flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-slate-950 truncate">{item.product.name}</h4>
                          <div className="text-xs sm:text-sm text-slate-700 flex items-center gap-2 mt-0.5 font-bold">
                            <span className="text-slate-900">{formatRupiah(item.product.price)}</span>
                            <span>×</span>
                            <span className="bg-slate-100 text-slate-950 px-1.5 py-0.2 rounded border border-slate-300">{item.quantity}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center bg-white border-2 border-slate-400 rounded-xl overflow-hidden shadow-xs">
                            <button
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-950 font-black text-sm transition"
                              title="Kurangi 1"
                            >
                              <Minus className="w-4 h-4 stroke-[3]" />
                            </button>
                            <span className="px-2.5 text-sm font-black text-slate-950 font-mono">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="w-8 h-8 flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white font-black text-sm transition"
                              title="Tambah 1"
                            >
                              <Plus className="w-4 h-4 stroke-[3]" />
                            </button>
                          </div>
                          <span className="font-black text-sm sm:text-base text-rose-700 min-w-[75px] text-right font-mono">
                            {formatRupiah(item.product.price * item.quantity)}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-slate-400 hover:text-red-700 p-1.5 transition"
                            title="Hapus barang dari keranjang"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Subtotal & Summary with Diskon & Pajak (Default Hidden inside Buttons) */}
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Subtotal Brutto ({cart.reduce((sum, item) => sum + item.quantity, 0)} item)</span>
                    <span className="font-bold text-slate-800">{formatRupiah(subtotalAmount)}</span>
                  </div>

                  {/* Toggle Buttons: Diskon & Pajak */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDiscountSection(!showDiscountSection)}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border shadow-2xs ${
                        discountAmount > 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30'
                          : showDiscountSection
                          ? 'bg-slate-800 text-white border-slate-700'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{discountAmount > 0 ? `Diskon: -${formatRupiah(discountAmount)}` : 'Diskon'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDiscountSection ? 'rotate-180' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTaxSection(!showTaxSection)}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border shadow-2xs ${
                        taxAmount > 0
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-300 ring-1 ring-indigo-400/30'
                          : showTaxSection
                          ? 'bg-slate-800 text-white border-slate-700'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{taxAmount > 0 ? `Pajak: +${formatRupiah(taxAmount)}` : 'Pajak'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTaxSection ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Discount Box (Default Hidden, opened via 'Diskon' button) */}
                  {showDiscountSection && (
                    <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Atur Diskon Potongan Harga</span>
                        </label>
                        <div className="flex items-center space-x-1 bg-white border border-emerald-200 rounded-lg p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setDiscountType('rp')}
                            className={`px-2.5 py-0.5 text-xs font-bold rounded transition ${
                              discountType === 'rp' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Rp
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountType('pct')}
                            className={`px-2.5 py-0.5 text-xs font-bold rounded transition ${
                              discountType === 'pct' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
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
                          className={`w-full py-2 bg-white border border-emerald-300 rounded-lg text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                            discountType === 'rp' ? 'pl-9 pr-3' : 'px-3'
                          }`}
                        />
                        {discountType === 'pct' && <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>}
                      </div>
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        {discountAmount > 0 ? (
                          <span className="font-bold text-emerald-700">Potongan: - {formatRupiah(discountAmount)}</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Ketik nominal atau persen diskon</span>
                        )}
                        <div className="flex gap-2">
                          {discountValue && (
                            <button
                              type="button"
                              onClick={() => setDiscountValue('')}
                              className="text-rose-600 hover:underline font-semibold text-[11px]"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowDiscountSection(false)}
                            className="text-slate-600 hover:text-slate-900 font-semibold text-[11px]"
                          >
                            Tutup
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tax Box (Default Hidden, opened via 'Pajak' button) */}
                  {showTaxSection && (
                    <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Biaya / Pajak (dari total brutto)</span>
                        </label>
                        <div className="flex items-center space-x-1 bg-white border border-indigo-200 rounded-lg p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setTaxType('pct')}
                            className={`px-2.5 py-0.5 text-xs font-bold rounded transition ${
                              taxType === 'pct' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaxType('rp')}
                            className={`px-2.5 py-0.5 text-xs font-bold rounded transition ${
                              taxType === 'rp' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Rp
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        {taxType === 'rp' && <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>}
                        <input
                          type="number"
                          placeholder={taxType === 'pct' ? "Persentase pajak (misal 11 untuk PPN 11%)" : "Nominal biaya/pajak (Rp)"}
                          value={taxValue}
                          onChange={e => setTaxValue(e.target.value)}
                          className={`w-full py-2 bg-white border border-indigo-300 rounded-lg text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                            taxType === 'rp' ? 'pl-9 pr-3' : 'px-3'
                          }`}
                        />
                        {taxType === 'pct' && <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>}
                      </div>
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">Preset:</span>
                          <button
                            type="button"
                            onClick={() => { setTaxType('pct'); setTaxValue('11'); }}
                            className="px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-700 text-[11px] font-bold hover:bg-indigo-100"
                          >
                            PPN 11%
                          </button>
                          <button
                            type="button"
                            onClick={() => { setTaxType('pct'); setTaxValue('10'); }}
                            className="px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-700 text-[11px] font-bold hover:bg-indigo-100"
                          >
                            10%
                          </button>
                        </div>
                        <div className="flex gap-2">
                          {taxValue && (
                            <button
                              type="button"
                              onClick={() => setTaxValue('')}
                              className="text-rose-600 hover:underline font-semibold text-[11px]"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowTaxSection(false)}
                            className="text-slate-600 hover:text-slate-900 font-semibold text-[11px]"
                          >
                            Tutup
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Active Discount / Tax line items in summary */}
                  {discountAmount > 0 && !showDiscountSection && (
                    <div className="flex justify-between text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-800" />
                        <span>Diskon ({discountType === 'pct' ? `${discountValue}%` : 'Rp'}):</span>
                      </span>
                      <span className="font-black text-emerald-950">- {formatRupiah(discountAmount)}</span>
                    </div>
                  )}

                  {taxAmount > 0 && !showTaxSection && (
                    <div className="flex justify-between text-xs font-bold text-indigo-900 bg-indigo-100 border border-indigo-300 px-3 py-1.5 rounded-lg">
                      <span className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-indigo-900" />
                        <span>Pajak ({taxType === 'pct' ? `${taxValue}%` : 'Rp'}):</span>
                      </span>
                      <span className="font-black text-indigo-950">+ {formatRupiah(taxAmount)}</span>
                    </div>
                  )}

                  {/* ULTRA HIGH CONTRAST TOTAL BELANJA DISPLAY WITH EYE-FOCUS ANIMATION */}
                  <div
                    className={`rounded-2xl p-4 transition-all duration-300 border-2 ${
                      totalHighlight
                        ? 'bg-amber-300 text-slate-950 border-amber-500 shadow-xl scale-102 ring-4 ring-amber-400/50 animate-total-change'
                        : 'bg-slate-950 text-white border-slate-900 shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          totalHighlight ? 'bg-slate-950 text-amber-300' : 'bg-rose-600 text-white'
                        }`}>
                          {totalHighlight ? '⚡ ANGKA BERUBAH' : 'TOTAL HARUS DIBAYAR'}
                        </span>
                      </div>
                      <span className={`text-xs font-bold ${totalHighlight ? 'text-slate-950' : 'text-slate-200'}`}>
                        {cart.reduce((s, i) => s + i.quantity, 0)} Pcs
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className={`font-black text-sm sm:text-base ${totalHighlight ? 'text-slate-950' : 'text-white'}`}>
                        TOTAL BELANJA
                      </span>
                      <span className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${
                        totalHighlight ? 'text-slate-950 underline decoration-slate-950 decoration-3' : 'text-amber-300'
                      }`}>
                        {formatRupiah(totalAmount)}
                      </span>
                    </div>

                    {/* Eye focus subtitle notice */}
                    {itemAddedNotice && (
                      <div className={`mt-2 pt-1.5 border-t text-xs font-bold flex items-center justify-between ${
                        totalHighlight ? 'border-slate-950/30 text-slate-950' : 'border-slate-800 text-amber-300'
                      }`}>
                        <span className="truncate">👉 {itemAddedNotice}</span>
                        <span className="text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded shrink-0 ml-1">Total Baru</span>
                      </div>
                    )}
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
        </div>
      )}

      {/* SUBMENU: LIHAT KATALOG PRODUK */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-slate-900 rounded-2xl shadow-md p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold mb-2 text-rose-200">
                  <Package className="w-3.5 h-3.5" />
                  <span>Katalog Penjualan</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Katalog Produk Toko</h2>
                <p className="text-xs text-rose-100 mt-1 max-w-xl">
                  Daftar seluruh barang yang terdaftar ({products.length} produk). Ketuk '+ Tambah' untuk langsung memasukkan ke keranjang belanja kasir.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('pos')}
                  className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Kembali ke Kasir ({cart.reduce((s, i) => s + i.quantity, 0)} Item)</span>
                </button>
              </div>
            </div>

            {/* Search Box in Catalog */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama barang atau barcode di katalog..."
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-base font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
                />
                {catalogSearch && (
                  <button
                    onClick={() => setCatalogSearch('')}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Product Grid (Large touch-friendly cards for 60+ users) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {products
                .filter(p => p.name.toLowerCase().includes(catalogSearch.toLowerCase()) || p.barcode.includes(catalogSearch))
                .map(product => {
                  const cartItem = cart.find(ci => ci.product.id === product.id);
                  return (
                    <div
                      key={product.id}
                      className="bg-white border-2 border-slate-300 hover:border-rose-600 rounded-2xl p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-950 text-base sm:text-lg leading-snug">
                            {product.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
                            {product.barcode}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t-2 border-slate-200 space-y-2.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-slate-700">Harga Jual:</span>
                          <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
                            {formatRupiah(product.price)}
                          </span>
                        </div>

                        {cartItem ? (
                          <div className="flex items-center justify-between bg-emerald-50 border-2 border-emerald-500 rounded-xl p-2">
                            <span className="text-xs sm:text-sm font-black text-emerald-950 pl-1">
                              Di Keranjang: {cartItem.quantity} pcs
                            </span>
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(product.id, -1)}
                                className="w-8 h-8 flex items-center justify-center bg-white hover:bg-emerald-100 text-emerald-950 font-black rounded-lg border-2 border-emerald-400 transition"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  updateQuantity(product.id, 1);
                                  playBeepSound();
                                }}
                                className="w-8 h-8 flex items-center justify-center bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-black transition shadow-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              addToCart(product);
                              playBeepSound();
                              showAlert(`${product.name} dimasukkan ke keranjang`, 'success');
                            }}
                            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-black shadow-md flex items-center justify-center space-x-1.5 transition active:scale-98"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>+ Tambah ke Keranjang</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                    setIsModalScanning(false);
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

        {/* TAB: TOP TERJUAL PER PERIODE (Default: Hari Ini) */}
        {activeTab === 'top-selling' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-slate-900 rounded-2xl shadow-md p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold mb-2 text-amber-200">
                  <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Statistik Produk Terlaris</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight">Top Terjual Per Periode</h2>
                <p className="text-xs text-rose-100 mt-1 max-w-xl">
                  Peringkat produk paling diminati pelanggan untuk analisis omzet dan evaluasi stok toko Anda.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={exportTopSoldToCSV}
                  className="flex items-center space-x-2 bg-white text-slate-900 hover:bg-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Export CSV Top Terjual</span>
                </button>
              </div>
            </div>

            {/* Period Filter Pills (Default: 'today') */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-rose-600" />
                  <span>Pilih Rentang Waktu (Default: Hari Ini):</span>
                </label>
                <span className="text-xs font-medium text-slate-500">
                  Periode Aktif: <strong className="text-slate-800">{
                    topPeriod === 'today' ? `Hari Ini (${todayDateStr})` :
                    topPeriod === 'yesterday' ? `Kemarin (${yesterdayDateStr})` :
                    topPeriod === 'today_yesterday' ? 'Hari Ini & Kemarin' :
                    topPeriod === '7days' ? '7 Hari Terakhir' :
                    topPeriod === '30days' ? '30 Hari Terakhir' :
                    topPeriod === 'this_month' ? `Bulan ${monthNames[now.getMonth()]}` : 'Semua Waktu'
                  }</strong>
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'today', label: 'Hari Ini (Default)' },
                  { id: 'yesterday', label: 'Kemarin' },
                  { id: 'today_yesterday', label: 'Hari Ini & Kemarin' },
                  { id: '7days', label: '7 Hari Terakhir' },
                  { id: '30days', label: '30 Hari Terakhir' },
                  { id: 'this_month', label: 'Bulan Ini' },
                  { id: 'all', label: 'Semua Waktu' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTopPeriod(p.id as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
                      topPeriod === p.id
                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Item Terjual</span>
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mt-2">{topTotalUnits} Pcs</h3>
                <p className="text-xs text-slate-400 mt-1">Total unit barang terjual</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Omzet Barang</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mt-2">{formatRupiah(topTotalRevenue)}</h3>
                <p className="text-xs text-slate-400 mt-1">Nilai bruto penjualan produk</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Juara 1 Terlaris</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-2 truncate">
                  {topProductsList[0]?.name || '-'}
                </h3>
                <p className="text-xs text-amber-700 font-bold mt-1">
                  {topProductsList[0] ? `${topProductsList[0].qty} Pcs (${formatRupiah(topProductsList[0].revenue)})` : 'Belum ada data'}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Varian Produk</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mt-2">{topProductsList.length} Produk</h3>
                <p className="text-xs text-slate-400 mt-1">Jumlah produk laku di periode ini</p>
              </div>
            </div>

            {/* Search & Sort Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau barcode..."
                  value={topSearch}
                  onChange={e => setTopSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                {topSearch && (
                  <button
                    onClick={() => setTopSearch('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <span className="text-xs text-slate-500 font-medium">Urutkan:</span>
                <button
                  type="button"
                  onClick={() => setTopSortBy('qty')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    topSortBy === 'qty' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>Paling Banyak (Pcs)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTopSortBy('revenue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    topSortBy === 'revenue' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>Omzet Tertinggi (Rp)</span>
                </button>
              </div>
            </div>

            {/* Top Products Leaderboard */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {topProductsList.length === 0 ? (
                <div className="py-20 text-center text-slate-400 space-y-2">
                  <Award className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700 text-base">Belum Ada Transaksi Produk Terjual Pada Periode Ini</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Transaksi penjualan kasir yang tercatat pada rentang waktu yang dipilih akan otomatis diperingkatkan di sini.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {topProductsList.map((item, index) => {
                    const pct = topTotalUnits > 0 ? (item.qty / topTotalUnits) * 100 : 0;
                    const barPct = maxTopQty > 0 ? (item.qty / maxTopQty) * 100 : 0;
                    const matchingProd = products.find(p => p.name.toLowerCase() === item.name.toLowerCase());

                    return (
                      <div key={item.name} className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                          {/* Rank Badge */}
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                            index === 0
                              ? 'bg-amber-100 text-amber-800 border-2 border-amber-300'
                              : index === 1
                              ? 'bg-slate-200 text-slate-700 border-2 border-slate-300'
                              : index === 2
                              ? 'bg-orange-100 text-orange-800 border-2 border-orange-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : `#${index + 1}`}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">{item.name}</h4>
                              {index === 0 && (
                                <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Best Seller
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                              {item.barcode && <span className="font-mono text-slate-400">Barcode: {item.barcode}</span>}
                              <span>Harga: <strong className="text-slate-700">{formatRupiah(item.price)}</strong></span>
                              <span>Dipesan di <strong>{item.txCount}</strong> struk</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-2.5 max-w-md">
                              <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                                <span>Pangsa Terjual: {pct.toFixed(1)}% dari total item</span>
                                <span>{item.qty} Pcs</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-500' : index === 2 ? 'bg-orange-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.max(5, barPct)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Metrics & Quick Add to Cart */}
                        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                          <div className="text-left md:text-right">
                            <span className="text-xs text-slate-400 font-medium block">Total Omzet</span>
                            <span className="font-black text-rose-600 text-base sm:text-lg block">
                              {formatRupiah(item.revenue)}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              {item.qty} Pcs Terjual
                            </span>
                          </div>

                          {matchingProd && (
                            <button
                              type="button"
                              onClick={() => {
                                addToCart(matchingProd);
                                showAlert(`"${matchingProd.name}" ditambahkan ke keranjang`, 'success');
                              }}
                              className="flex items-center space-x-1.5 bg-slate-900 hover:bg-rose-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
                              title="Tambah ke Keranjang Kasir"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Keranjang</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
                {/* Period Selector (Hari Ini & Kemarin default, 7/15/30/60/90 days or Month name) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rentang Waktu / Bulan Laporan</label>
                  <select
                    value={reportPeriod}
                    onChange={e => setReportPeriod(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="today_yesterday">Hari Ini & Kemarin (Default)</option>
                    <option value="today">Hari Ini Saja ({todayDateStr})</option>
                    <option value="yesterday">Kemarin Saja ({yesterdayDateStr})</option>
                    <option value="7">7 Hari Terakhir</option>
                    <option value="15">15 Hari Terakhir</option>
                    <option value="30">30 Hari Terakhir</option>
                    <option value="60">60 Hari Terakhir</option>
                    <option value="90">90 Hari Terakhir</option>
                    <option value="all">Semua Waktu Transaksi</option>
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

        {/* SUBMENU: PENGATURAN (SETTING) */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-800 to-slate-900 rounded-2xl shadow-md p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold mb-2 text-purple-200">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Konfigurasi Aplikasi</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Pengaturan (Setting) Kasir</h2>
                <p className="text-xs text-purple-100 mt-1">
                  Atur kamera default smartphone (belakang/depan), uji coba kamera langsung, suara bip, dan nama kasir.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className="flex items-center space-x-2 bg-white hover:bg-slate-100 text-slate-900 px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition"
              >
                <ShoppingCart className="w-4 h-4 text-rose-600" />
                <span>Kembali ke Kasir</span>
              </button>
            </div>

            {/* 1. Kamera Pemindai Barcode (Default: Belakang) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-purple-600" />
                  <span>Kamera Pemindai Barcode (Default: Belakang)</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Secara default sistem otomatis mengarahkan ke <strong>kamera belakang smartphone</strong> agar mudah mengarahkan ke kemasan produk. Anda dapat mengubah preferensi secara manual di sini:
                </p>
              </div>

              {/* Facing Mode Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div
                  onClick={() => {
                    setCameraFacing('environment');
                    setSelectedCameraId('');
                    localStorage.setItem('tokobazar_camera_facing', 'environment');
                    localStorage.removeItem('tokobazar_camera_id');
                    showAlert('Kamera belakang smartphone aktif sebagai default', 'success');
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start space-x-3 ${
                    cameraFacing === 'environment' && !selectedCameraId
                      ? 'border-purple-600 bg-purple-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cameraFacingSetting"
                    checked={cameraFacing === 'environment' && !selectedCameraId}
                    onChange={() => {}}
                    className="mt-1 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-1.5">
                      <span>📷 Kamera Belakang (Utama)</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Rekomendasi</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Menghadap ke belakang smartphone. Sangat praktis untuk mengarahkan ke kemasan barang saat kasir melayani pembeli.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setCameraFacing('user');
                    setSelectedCameraId('');
                    localStorage.setItem('tokobazar_camera_facing', 'user');
                    localStorage.removeItem('tokobazar_camera_id');
                    showAlert('Kamera depan aktif sebagai default', 'info');
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start space-x-3 ${
                    cameraFacing === 'user' && !selectedCameraId
                      ? 'border-purple-600 bg-purple-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cameraFacingSetting"
                    checked={cameraFacing === 'user' && !selectedCameraId}
                    onChange={() => {}}
                    className="mt-1 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-bold text-sm sm:text-base text-slate-900">
                      🤳 Kamera Depan (Selfie)
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Menghadap ke layar HP. Digunakan jika HP dipasang tegak pada docking/stand meja kasir.
                    </p>
                  </div>
                </div>
              </div>

              {/* Hardware Device Selection (if multiple lenses found) */}
              {availableCameras.length > 0 && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Pilih Lensa Kamera Tertentu (Opsional jika HP memiliki banyak lensa):
                  </label>
                  <select
                    value={selectedCameraId}
                    onChange={e => {
                      const id = e.target.value;
                      setSelectedCameraId(id);
                      if (id) {
                        localStorage.setItem('tokobazar_camera_id', id);
                      } else {
                        localStorage.removeItem('tokobazar_camera_id');
                      }
                      showAlert('Pengaturan lensa kamera berhasil disimpan', 'success');
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm font-medium focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="">Otomatis (Sesuai Pilihan di Atas)</option>
                    {availableCameras.map((cam, idx) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Lensa Kamera #${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Live Camera Test Preview */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm text-slate-800 block">Uji Coba Kamera Langsung</span>
                    <span className="text-xs text-slate-500">Pastikan kamera belakang HP Anda menyala dengan jernih.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCameraTestActive(!cameraTestActive)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1.5 ${
                      cameraTestActive
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>{cameraTestActive ? '⏹️ Matikan Uji Coba' : '▶️ Uji Coba Kamera Sekarang'}</span>
                  </button>
                </div>

                {cameraTestActive && (
                  <div className="p-4 bg-slate-900 rounded-xl text-white space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Kamera Aktif: <strong>{cameraFacing === 'environment' ? 'Belakang (Environment)' : 'Depan (User)'}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = cameraFacing === 'environment' ? 'user' : 'environment';
                          setCameraFacing(next);
                          setSelectedCameraId('');
                          localStorage.setItem('tokobazar_camera_facing', next);
                          localStorage.removeItem('tokobazar_camera_id');
                        }}
                        className="bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 text-amber-400 font-bold"
                      >
                        🔄 Balik Kamera
                      </button>
                    </div>

                    {cameraTestStarting && (
                      <div className="py-6 text-center text-slate-400 flex items-center justify-center space-x-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                        <span className="text-xs">Mengaktifkan kamera...</span>
                      </div>
                    )}

                    <div id="setting-camera-test-viewfinder" className="overflow-hidden rounded-lg bg-black min-h-[200px]"></div>
                    <p className="text-xs text-emerald-400 text-center font-medium">
                      ✓ Kamera menyala. Anda dapat mengarahkan barcode produk untuk tes deteksi.
                    </p>
                  </div>
                )}
              </div>

              {/* Camera Permissions Guide */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-blue-950">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Petunjuk Izin Kamera Smartphone:</span>
                </span>
                <p className="text-blue-800 leading-relaxed">
                  Peramban (Chrome / Safari / Edge) akan otomatis menampilkan popup izin saat Anda menekan tombol Scan. Cukup pilih <strong>"Izinkan" (Allow)</strong>. Jika tidak sengaja tertekan 'Blokir', klik ikon gembok 🔒 di sebelah alamat web browser Anda lalu ubah Izin Kamera menjadi <strong>'Izinkan'</strong>.
                </p>
              </div>
            </div>

            {/* 2. Suara Pemindai Barcode (Beep Audio) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-emerald-600" />
                  <span>Suara Pemindai Barcode (Audio Bip)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Memberikan konfirmasi bunyi 'bip' instan setiap kali barcode berhasil dibaca oleh kamera smartphone.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={e => {
                      const val = e.target.checked;
                      setSoundEnabled(val);
                      localStorage.setItem('tokobazar_sound_enabled', String(val));
                      if (val) playBeepSound();
                      showAlert(`Suara scan barcode ${val ? 'diaktifkan' : 'dinonaktifkan'}`, 'info');
                    }}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="font-bold text-sm text-slate-800">
                    Aktifkan Bunyi Bip saat Barcode Terbaca
                  </span>
                </label>

                <button
                  type="button"
                  onClick={playBeepSound}
                  className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition self-start sm:self-auto"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>🔊 Tes Bunyi Bip</span>
                </button>
              </div>
            </div>

            {/* 3. Identitas Kasir & Toko */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-rose-600" />
                <span>Identitas Toko & Nama Kasir</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Toko (Tampil di Header & Struk)</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={e => {
                      setStoreName(e.target.value);
                      localStorage.setItem('tokobazar_store_name', e.target.value);
                    }}
                    placeholder="Contoh: Toko Berkah"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kasir Bertugas</label>
                  <input
                    type="text"
                    value={cashierName}
                    onChange={e => {
                      setCashierName(e.target.value);
                      localStorage.setItem('tokobazar_cashier_name', e.target.value);
                    }}
                    placeholder="Contoh: Kasir 1"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Finish Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  showAlert('Pengaturan kasir berhasil disimpan', 'success');
                  setActiveTab('pos');
                }}
                className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-base font-bold shadow-lg shadow-rose-200 transition flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Simpan & Kembali ke Kasir (Hitung)</span>
              </button>
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
                    onClick={() => setIsModalScanning(!isModalScanning)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                      isModalScanning
                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                    title="Scan barcode produk dengan kamera"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{isModalScanning ? 'Tutup' : 'Scan'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductForm({ ...productForm, barcode: String(Math.floor(8990000000000 + Math.random() * 900000000000)) })}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl text-xs font-medium transition"
                    title="Generate barcode acak"
                  >
                    🎲 Acak
                  </button>
                </div>

                {/* Live Camera Scanner within Modal (Auto Back Camera with Flip & Close controls) */}
                {isModalScanning && (
                  <div className="p-3.5 bg-slate-900 rounded-xl text-white space-y-2 mt-2.5 shadow-lg border border-slate-700">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-rose-400">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{cameraFacing === 'environment' ? '📷 Kamera Belakang' : '🤳 Kamera Depan'}</span>
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const next = cameraFacing === 'environment' ? 'user' : 'environment';
                            setCameraFacing(next);
                            setSelectedCameraId('');
                            localStorage.setItem('tokobazar_camera_facing', next);
                            localStorage.removeItem('tokobazar_camera_id');
                          }}
                          className="text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-2 py-0.5 rounded-md border border-slate-700 transition"
                          title="Balik kamera belakang / depan"
                        >
                          🔄 Balik
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsModalScanning(false)}
                          className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded-md transition"
                        >
                          ✕ Tutup
                        </button>
                      </div>
                    </div>
                    <div id="modal-barcode-reader" className="overflow-hidden rounded-lg bg-black min-h-[160px]"></div>
                    <p className="text-[11px] text-slate-400 text-center">
                      Arahkan kamera ke barcode kemasan barang baru. Barcode akan otomatis terisi dan berbunyi 'bip'.
                    </p>
                  </div>
                )}
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
                  onClick={() => {
                    setProductModalOpen(false);
                    setIsModalScanning(false);
                  }}
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
                {(completedTx.subtotal_amount && (completedTx.discount_amount || completedTx.tax_amount)) ? (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Brutto</span>
                    <span>{formatRupiah(completedTx.subtotal_amount)}</span>
                  </div>
                ) : null}
                {completedTx.discount_amount !== undefined && completedTx.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Diskon</span>
                    <span>- {formatRupiah(completedTx.discount_amount)}</span>
                  </div>
                )}
                {completedTx.tax_amount !== undefined && completedTx.tax_amount > 0 && (
                  <div className="flex justify-between text-indigo-700 font-medium">
                    <span>Pajak / Biaya ({completedTx.tax_type === 'pct' ? `${completedTx.tax_value}%` : 'Rp'})</span>
                    <span>+ {formatRupiah(completedTx.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
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

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4 pointer-events-auto">
          <div className={`p-4 rounded-xl shadow-xl border flex items-center justify-between gap-3 text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-indigo-50 border-indigo-300 text-indigo-800'
          }`}>
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 rounded-md hover:bg-black/5 text-current opacity-70 hover:opacity-100 transition"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION DIALOG */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-base">Konfirmasi Aksi</h3>
            <p className="text-sm text-slate-600">{confirmDialog.message}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  action();
                }}
                className="px-4 py-2 text-sm text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-medium transition shadow-sm"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

