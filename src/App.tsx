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
  Database,
  Zap,
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
  Battery,
  BatteryCharging,
  BatteryLow,
  BatteryWarning,
  List,
  Eye,
  CheckCircle,
  Lock,
  Unlock,
  User,
  UserPlus,
  Users,
  Key,
  LogOut,
  ShieldAlert,
  EyeOff,
  QrCode,
  Banknote,
  Wallet,
  Coins,
  Coffee,
  Lightbulb,
  HeartHandshake,
  TrendingDown
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
  admin_fee_amount?: number;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  cashier_name: string;
  payment_method?: 'TUNAI' | 'QRIS' | string;
  notes?: string;
  created_at: string;
  items: TransactionItem[];
}

interface Expense {
  id: number;
  cashier_name: string;
  category: string;
  amount: number;
  notes: string;
  created_at: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'pos' | 'catalog' | 'products' | 'top-selling' | 'history' | 'expenses' | 'settings' | 'cloudflare'>('pos');
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
  const [thermalPaperWidth, setThermalPaperWidth] = useState<'58mm' | '80mm'>(() => {
    return (localStorage.getItem('tokobazar_thermal_paper_width') as '58mm' | '80mm') || '58mm';
  });
  const DEFAULT_BANK_CHIPS = 'Transfer BCA, Transfer BRI, Transfer Mandiri, QRIS GoPay, QRIS ShopeePay, QRIS DANA';
  const [showBankQuickChips, setShowBankQuickChips] = useState<boolean>(() => {
    return localStorage.getItem('tokobazar_show_quick_chips') !== 'false';
  });
  const [bankQuickChipsList, setBankQuickChipsList] = useState<string>(() => {
    return localStorage.getItem('tokobazar_bank_chips_list') || DEFAULT_BANK_CHIPS;
  });
  const [mobileMarginMode, setMobileMarginMode] = useState<'default' | 'max_width'>(() => {
    return (localStorage.getItem('tokobazar_mobile_margin_mode') as 'default' | 'max_width') || 'default';
  });

  // Mobile POS Battery Monitor State
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [batterySupported, setBatterySupported] = useState<boolean>(false);
  const [dismissBatteryWarning, setDismissBatteryWarning] = useState<boolean>(false);

  // Battery Status API Listener
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatterySupported(true);
        const updateBattery = () => {
          const level = Math.round(battery.level * 100);
          setBatteryLevel(level);
          setIsCharging(battery.charging);
        };
        updateBattery();

        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);

        return () => {
          battery.removeEventListener('levelchange', updateBattery);
          battery.removeEventListener('chargingchange', updateBattery);
        };
      }).catch((err: any) => {
        console.warn('Battery status API not supported or blocked:', err);
      });
    }
  }, []);

  const [scannerStarting, setScannerStarting] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameraTestActive, setCameraTestActive] = useState<boolean>(false);
  const [cameraTestStarting, setCameraTestStarting] = useState<boolean>(false);

  // Eye-director: Visual highlight whenever Total Belanja changes
  const [totalHighlight, setTotalHighlight] = useState<boolean>(false);
  const [itemAddedNotice, setItemAddedNotice] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<any>(null);
  const noticeTimeoutRef = useRef<any>(null);
  const totalBelanjaRef = useRef<HTMLDivElement | null>(null);
  const totalBelanjaMobileRef = useRef<HTMLDivElement | null>(null);

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
  const [productSearch, setProductSearch] = useState<string>('');

  // Payment Method & Notes State (Cash vs QRIS)
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'QRIS'>('TUNAI');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Admin Fee State (Biaya Admin QRIS / Transfer Bank / Titipan - Pendapatan Toko, Tanpa Kembalian Pelanggan)
  const [adminFeeAmount, setAdminFeeAmount] = useState<number>(0);

  // Store Cash Expenses State (Pengeluaran Kas Toko: Sampah, Listrik, Makan, Donasi, Prive, dll)
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseModalOpen, setExpenseModalOpen] = useState<boolean>(false);
  const [expenseCategory, setExpenseCategory] = useState<string>('Uang Sampah');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseNotes, setExpenseNotes] = useState<string>('');
  const [expenseSubmitting, setExpenseSubmitting] = useState<boolean>(false);
  const [expensePeriodFilter, setExpensePeriodFilter] = useState<string>('today_yesterday');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
  const [expenseSearch, setExpenseSearch] = useState<string>('');

  // Virtual Numpad State
  const [numpadOpen, setNumpadOpen] = useState<boolean>(false);
  const [discountType, setDiscountType] = useState<'rp' | 'pct'>('rp');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [showDiscountSection, setShowDiscountSection] = useState<boolean>(false);
  const [taxType, setTaxType] = useState<'rp' | 'pct'>('pct');
  const [taxValue, setTaxValue] = useState<string>('');
  const [showTaxSection, setShowTaxSection] = useState<boolean>(false);
  const [menuDropdownOpen, setMenuDropdownOpen] = useState<boolean>(false);

  // Unregistered Item Prompt State & Immediate Cart Addition
  const [unregisteredItemPrompt, setUnregisteredItemPrompt] = useState<{ barcode: string; name: string } | null>(null);
  const [addCreatedToCartOnSave, setAddCreatedToCartOnSave] = useState<boolean>(false);

  // User Auth & Protection State (Session: 8 Hours / 480 Minutes)
  const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 480 Menit

  interface AuthUser {
    id: number;
    username: string;
    name: string;
    role: 'KASIR' | 'ADMIN';
    loginTime?: number;
  }

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const savedStr = localStorage.getItem('tokobazar_auth_user');
      if (!savedStr) return null;
      const saved: AuthUser = JSON.parse(savedStr);
      if (saved.loginTime && Date.now() - saved.loginTime > SESSION_DURATION_MS) {
        localStorage.removeItem('tokobazar_auth_user');
        return null;
      }
      return saved;
    } catch {
      return null;
    }
  });

  const [loginUsername, setLoginUsername] = useState<string>('kasir');
  const [loginPassword, setLoginPassword] = useState<string>('kasir1234');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Brute-force Protection State
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState<number>(0);

  // User Management State (ADMIN only)
  const [userModalOpen, setUserModalOpen] = useState<boolean>(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userLoading, setUserLoading] = useState<boolean>(false);
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', name: '', role: 'KASIR' as 'KASIR' | 'ADMIN' });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', role: 'KASIR' as 'KASIR' | 'ADMIN', password: '' });

  // Lockout Countdown Timer Effect
  useEffect(() => {
    if (lockoutUntil > Date.now()) {
      const interval = setInterval(() => {
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        if (remaining <= 0) {
          setLockoutSecondsLeft(0);
          setLockoutUntil(0);
          setFailedAttempts(0);
          clearInterval(interval);
        } else {
          setLockoutSecondsLeft(remaining);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutUntil]);

  // Handle Tab Switch with RBAC protection for KASIR
  const handleTabChange = (tab: string) => {
    if (currentUser?.role === 'KASIR' && ['top-selling', 'settings', 'cloudflare'].includes(tab)) {
      showAlert('🔒 AKSES DIBATASI KHUSUS ADMIN!\nKasir dapat mengakses Hitung Kasir, Katalog, Atur Barang/Jasa, Riwayat Transaksi, dan Pengeluaran Kas Toko.', 'error');
      return;
    }
    setActiveTab(tab as any);
    setMenuDropdownOpen(false);
  };

  // Login Handler
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (lockoutSecondsLeft > 0) {
      showAlert(`⚠️ Login terkunci! Silakan tunggu ${lockoutSecondsLeft} detik lagi.`, 'error');
      return;
    }
    if (!loginUsername.trim() || !loginPassword.trim()) {
      showAlert('Username dan Password wajib diisi!', 'error');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        const authData = { ...data.user, loginTime: Date.now() };
        setCurrentUser(authData);
        localStorage.setItem('tokobazar_auth_user', JSON.stringify(authData));
        setCashierName(data.user.name);
        localStorage.setItem('tokobazar_cashier_name', data.user.name);
        setFailedAttempts(0);
        showAlert(`✅ Login Berhasil! Selamat bekerja, ${data.user.name} (${data.user.role})`, 'success');
      } else {
        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);
        if (newFailed >= 5) {
          const lockTime = Date.now() + 60000;
          setLockoutUntil(lockTime);
          setLockoutSecondsLeft(60);
          showAlert('⚠️ 5x SALAH PASSWORD! Login dikunci selama 60 detik untuk mencegah percobaan tidak sah.', 'error');
        } else {
          showAlert(`⚠️ ${data.error || 'Username atau Password salah!'} (Percobaan gagal ${newFailed}/5)`, 'error');
        }
      }
    } catch (err: any) {
      // Offline fallback for default credentials
      const u = loginUsername.trim().toLowerCase();
      const p = loginPassword.trim();
      if (u === 'kasir' && p === 'kasir1234') {
        const localUser: AuthUser = { id: 1, username: 'kasir', name: 'Kasir Utama', role: 'KASIR', loginTime: Date.now() };
        setCurrentUser(localUser);
        localStorage.setItem('tokobazar_auth_user', JSON.stringify(localUser));
        setCashierName('Kasir Utama');
        setFailedAttempts(0);
        showAlert('✅ Login Kasir Utama Berhasil (Offline)', 'success');
      } else if (u === 'admin' && p === 'admin1234') {
        const localUser: AuthUser = { id: 2, username: 'admin', name: 'Administrator', role: 'ADMIN', loginTime: Date.now() };
        setCurrentUser(localUser);
        localStorage.setItem('tokobazar_auth_user', JSON.stringify(localUser));
        setCashierName('Administrator');
        setFailedAttempts(0);
        showAlert('✅ Login Administrator Berhasil (Offline)', 'success');
      } else {
        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);
        if (newFailed >= 5) {
          setLockoutUntil(Date.now() + 60000);
          setLockoutSecondsLeft(60);
          showAlert('⚠️ 5x SALAH PASSWORD! Login dikunci selama 60 detik.', 'error');
        } else {
          showAlert(`⚠️ Username atau Password salah! (Gagal ${newFailed}/5)`, 'error');
        }
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    setConfirmDialog({
      message: 'Apakah Anda yakin ingin keluar / logout dari aplikasi kasir ini?',
      onConfirm: () => {
        setCurrentUser(null);
        localStorage.removeItem('tokobazar_auth_user');
        setMenuDropdownOpen(false);
        showAlert('Anda telah berhasil keluar / logout.', 'info');
      }
    });
  };

  // Fetch Users List for ADMIN User Management
  const fetchUsersList = async () => {
    setUserLoading(true);
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setUserLoading(false);
    }
  };

  // Create User Handler (ADMIN)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username.trim() || !newUserForm.password.trim() || !newUserForm.name.trim()) {
      showAlert('Username, Password, dan Nama Wajib Diisi!', 'error');
      return;
    }
    try {
      const res = await fetch('/api/auth?action=create_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      });
      const data = await res.json();
      if (res.ok) {
        showAlert(`✅ User baru "${newUserForm.name}" (${newUserForm.role}) berhasil dibuat!`, 'success');
        setNewUserForm({ username: '', password: '', name: '', role: 'KASIR' });
        fetchUsersList();
      } else {
        showAlert(data.error || 'Gagal menambahkan user', 'error');
      }
    } catch (err: any) {
      showAlert(err.message || 'Gagal menambahkan user', 'error');
    }
  };

  // Update / Reset Password User Handler (ADMIN)
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    try {
      const res = await fetch('/api/auth?action=update_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingUserId, ...editUserForm })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('✅ Data user & reset password berhasil disimpan!', 'success');
        setEditingUserId(null);
        fetchUsersList();
      } else {
        showAlert(data.error || 'Gagal memperbarui data user', 'error');
      }
    } catch (err: any) {
      showAlert('Gagal memperbarui data user', 'error');
    }
  };

  // Delete User Handler (ADMIN)
  const handleDeleteUser = (id: number, username: string) => {
    if (currentUser && currentUser.username === username) {
      showAlert('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!', 'error');
      return;
    }
    setConfirmDialog({
      message: `Yakin ingin menghapus akun user "${username}" dari database?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/auth?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            showAlert(`User "${username}" telah berhasil dihapus.`, 'success');
            fetchUsersList();
          } else {
            showAlert('Gagal menghapus user', 'error');
          }
        } catch (err) {
          showAlert('Gagal menghapus user', 'error');
        }
      }
    });
  };

  // In-app Alert / Toast & Confirm Dialog (avoids window.alert / window.confirm in iframe)
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const sanitizeErrorMessage = (rawMessage: string): string => {
    if (!rawMessage) return '⚠️ Terjadi kendala pada sistem. Silakan coba muat ulang halaman.';
    const str = String(rawMessage);

    // 1. Duplicate Barcode Error
    if (
      str.includes('UNIQUE constraint failed: products.barcode') ||
      (str.includes('products') && str.includes('barcode') && (str.includes('UNIQUE') || str.includes('CONSTRAINT'))) ||
      str.includes('Barcode sudah terdaftar') ||
      str.includes('Barcode sudah digunakan')
    ) {
      return '⚠️ KODE BARCODE SUDAH DIPAKAI!\n\nNomor barcode ini sudah terdaftar untuk barang lain. Silakan gunakan nomor barcode yang berbeda atau edit barang yang sudah ada.';
    }

    // 2. Duplicate Invoice Error
    if (
      str.includes('UNIQUE constraint failed: transactions.invoice_no') ||
      (str.includes('transactions') && str.includes('invoice_no'))
    ) {
      return '⚠️ NOMOR NOTA TRANSAKSI TERDAPAT DUPLIKAT!\n\nSistem akan secara otomatis memperbarui nomor nota baru untuk transaksi berikutnya.';
    }

    // 3. Missing Table Error (Database not bootstrapped yet)
    if (
      str.includes('no such table') ||
      str.includes('table products') ||
      str.includes('table transactions') ||
      str.includes('table transaction_items')
    ) {
      return '⚠️ TABEL DATABASE D1 BELUM SIAP!\n\nTabel database Cloudflare D1 belum terbuat. Silakan buka menu "? (Petunjuk PWA & Bantuan)" di atas lalu tekan tombol "⚡ Bootstrap Database D1 Sekarang" untuk menyiapkan tabel otomatis.';
    }

    // 4. Missing Column / Schema Mismatch
    if (str.includes('no such column') || str.includes('has no column')) {
      return '⚠️ STRUKTUR KOLOM DATABASE PERLU DIPERBARUI!\n\nSilakan buka menu "? (Petunjuk PWA & Bantuan)" lalu tekan tombol "⚡ Bootstrap Database D1 Sekarang" untuk memperbarui struktur tabel.';
    }

    // 5. Cloudflare D1 Binding / Connection Error
    if (
      str.includes('D1 binding') ||
      str.includes('env.DB') ||
      str.includes('binding') ||
      str.includes('D1_BINDING_NOT_FOUND')
    ) {
      return '⚠️ KONEKSI CLOUDFLARE D1 BELUM TERHUBUNG!\n\nAplikasi belum terhubung dengan database Cloudflare D1. Silakan periksa konfigurasi D1 (env.DB) Anda di Cloudflare Dashboard.';
    }

    // 6. Network / Offline Error
    if (
      str.includes('Failed to fetch') ||
      str.includes('NetworkError') ||
      str.includes('Network request failed') ||
      str.includes('Load failed') ||
      str.includes('Offline')
    ) {
      return '📡 INTERNET TERPUTUS ATAU SERVER TIDAK MERESPON!\n\nJangan khawatir, data transaksi Anda disimpan otomatis di penyimpanan lokal HP/PC Anda dan akan disinkronkan saat internet terhubung kembali.';
    }

    // 7. Not Null / Datatype mismatch Error
    if (
      str.includes('NOT NULL constraint failed') ||
      str.includes('datatype mismatch')
    ) {
      return '⚠️ MOHON LENGKAPI SELURUH ISIAN!\n\nPastikan nama barang, barcode, dan angka harga telah terisi dengan benar (berupa angka tanpa huruf).';
    }

    return str;
  };

  const showAlert = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const finalMsg = type === 'error' ? sanitizeErrorMessage(message) : message;
    setToast({ message: finalMsg, type });
  };

  useEffect(() => {
    if (toast) {
      const displayDuration = toast.type === 'error' ? 8000 : 4000;
      const timer = setTimeout(() => setToast(null), displayDuration);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Report Filter States (Default: 'today_yesterday' for Hari Ini & Kemarin)
  const [reportPeriod, setReportPeriod] = useState<string>('today_yesterday');
  const [selectedReportProduct, setSelectedReportProduct] = useState<string>('all');
  const [reportPaymentFilter, setReportPaymentFilter] = useState<'all' | 'TUNAI' | 'QRIS'>('all');

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

  // Offline Sync Queue States
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(() => {
    try {
      const q = localStorage.getItem('tokobazar_pending_tx_queue');
      return q ? JSON.parse(q).length : 0;
    } catch { return 0; }
  });
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingTransactions();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Offline Transaction Queue Auto-Sync Function
  const syncPendingTransactions = async () => {
    try {
      const pendingQueueStr = localStorage.getItem('tokobazar_pending_tx_queue');
      if (!pendingQueueStr) {
        setPendingQueueCount(0);
        return;
      }
      const queue: any[] = JSON.parse(pendingQueueStr);
      setPendingQueueCount(queue.length);
      if (queue.length === 0) return;

      if (!navigator.onLine) {
        console.log(`Currently offline. ${queue.length} transactions waiting in queue.`);
        return;
      }

      setIsSyncingQueue(true);
      console.log(`Auto-syncing ${queue.length} pending offline transactions to Cloudflare D1...`);
      const remainingQueue = [];
      let successCount = 0;

      for (const tx of queue) {
        try {
          const res = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tx)
          });
          if (res.ok) {
            successCount++;
          } else {
            remainingQueue.push(tx);
          }
        } catch {
          remainingQueue.push(tx);
        }
      }

      localStorage.setItem('tokobazar_pending_tx_queue', JSON.stringify(remainingQueue));
      setPendingQueueCount(remainingQueue.length);

      if (successCount > 0) {
        fetchTransactions();
        showAlert(`✅ ${successCount} transaksi offline berhasil disinkronkan ke Cloudflare D1!`, 'success');
      }
    } catch (e) {
      console.error('Failed to sync offline queue', e);
    } finally {
      setIsSyncingQueue(false);
    }
  };

  useEffect(() => {
    window.addEventListener('online', syncPendingTransactions);
    if (navigator.onLine) {
      syncPendingTransactions();
    }

    return () => {
      window.removeEventListener('online', syncPendingTransactions);
    };
  }, []);

  // D1 Bootstrap State
  const [bootstrappingD1, setBootstrappingD1] = useState<boolean>(false);
  const [bootstrapMessage, setBootstrapMessage] = useState<string | null>(null);

  const handleBootstrapD1 = async () => {
    setBootstrappingD1(true);
    setBootstrapMessage(null);
    try {
      const res = await fetch('/api/bootstrap', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBootstrapMessage(data.message || 'Database Cloudflare D1 berhasil di-bootstrap!');
        fetchProducts();
      } else {
        setBootstrapMessage(`Gagal: ${data.error || 'Terjadi kesalahan saat bootstrap D1'}`);
      }
    } catch (err: any) {
      setBootstrapMessage(`Error koneksi: ${err.message || 'Jaringan bermasalah'}`);
    } finally {
      setBootstrappingD1(false);
    }
  };

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

  // Fetch Cash Expenses (Pengeluaran Kas Toko)
  const fetchExpenses = async () => {
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
        localStorage.setItem('tokobazar_offline_expenses', JSON.stringify(data));
      }
    } catch {
      const cached = localStorage.getItem('tokobazar_offline_expenses');
      if (cached) {
        try { setExpenses(JSON.parse(cached)); } catch {}
      }
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchTransactions();
    fetchExpenses();
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
          setUnregisteredItemPrompt({ barcode, name: '' });
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

    // Auto-scroll cashier view directly to Total Belanja (Request 1)
    if (window.innerWidth < 1024 && totalBelanjaMobileRef.current) {
      totalBelanjaMobileRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (totalBelanjaRef.current) {
      totalBelanjaRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    setPaymentMethod('TUNAI');
    setPaymentNotes('');
    setShowDiscountSection(false);
    setShowTaxSection(false);
    setAdminFeeAmount(0);
    triggerTotalHighlight('Keranjang dikosongkan');
  };

  // Calculations
  const subtotalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Discount calculation (Biaya Diskon: Mengurangi Pemasukan Toko)
  const numericDiscountInput = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'rp'
    ? Math.min(numericDiscountInput, subtotalAmount)
    : Math.min((subtotalAmount * numericDiscountInput) / 100, subtotalAmount);

  // Tax / Biaya Tambahan calculation (Pemasukan Pemungutan Pajak: Menambah Pendapatan Toko)
  const numericTaxInput = parseFloat(taxValue) || 0;
  const taxAmount = taxType === 'rp'
    ? Math.max(0, numericTaxInput)
    : Math.max(0, (subtotalAmount * numericTaxInput) / 100);

  // Total Belanja sebelum Biaya Admin
  const netItemsAmount = Math.max(0, subtotalAmount - discountAmount + taxAmount);

  // Biaya Admin:
  // MOHON DIINGAT: TIDAK MENYEBABKAN ADANYA KEMBALIAN PELANGGAN.
  // Biaya Admin direlakan customer untuk toko, dicatat sebagai akun Pemasukan Biaya Admin di database.
  const numericPaid = parseFloat(paidAmount) || 0;
  const effectiveAdminFee = adminFeeAmount > 0
    ? adminFeeAmount
    : (paymentMethod === 'QRIS' && numericPaid > netItemsAmount ? (numericPaid - netItemsAmount) : 0);

  const totalAmount = Math.max(0, netItemsAmount + effectiveAdminFee);

  // Kembalian Pelanggan:
  // Untuk QRIS / Transfer: SELALU 0 (Non-Tunai).
  // Untuk Tunai: numericPaid - totalAmount.
  // Karena totalAmount sudah mencakup Biaya Admin, pembayaran pas (misal 10.000 + admin 500 = 10.500 dibayar 10.500)
  // TIDAK MENYEBABKAN KEMBALIAN (kembalian = 0)!
  const changeAmount = paymentMethod === 'QRIS'
    ? 0
    : (numericPaid >= totalAmount ? numericPaid - totalAmount : numericPaid - totalAmount);

  // Auto-fill paid amount when initially switching to QRIS or total changes
  const prevPaymentMethodRef = useRef<'TUNAI' | 'QRIS'>(paymentMethod);
  useEffect(() => {
    if (paymentMethod === 'QRIS') {
      if (prevPaymentMethodRef.current !== 'QRIS' || !paidAmount || Number(paidAmount) < totalAmount) {
        setPaidAmount(String(totalAmount));
      }
    }
    prevPaymentMethodRef.current = paymentMethod;
  }, [paymentMethod, totalAmount]);

  const handleSelectPaymentMethod = (method: 'TUNAI' | 'QRIS') => {
    setPaymentMethod(method);
    if (method === 'QRIS') {
      if (!paidAmount || Number(paidAmount) === 0 || Number(paidAmount) < totalAmount) {
        setPaidAmount(String(totalAmount));
      }
    }
  };

  const handleAddAdminFee = (fee: number) => {
    const newFee = adminFeeAmount + fee;
    setAdminFeeAmount(newFee);
    const feeStr = `Rp ${newFee.toLocaleString('id-ID')}`;
    const feeNotice = `(Admin ${feeStr})`;
    if (!paymentNotes || paymentNotes.trim() === '') {
      setPaymentNotes(feeNotice);
    } else if (paymentNotes.includes('(Admin Rp')) {
      setPaymentNotes(paymentNotes.replace(/\(Admin Rp [^\)]+\)/, feeNotice));
    } else {
      setPaymentNotes(`${paymentNotes} ${feeNotice}`);
    }
    const newTotal = Math.max(0, netItemsAmount + newFee);
    setPaidAmount(String(newTotal));
    showAlert(`⚡ Biaya Admin Rp ${fee.toLocaleString('id-ID')} ditambahkan (Pendapatan Toko, Tanpa Kembalian Pelanggan)`, 'info');
  };

  const handleResetAdminFee = () => {
    setAdminFeeAmount(0);
    const newTotal = Math.max(0, netItemsAmount);
    setPaidAmount(String(newTotal));
    if (paymentNotes) {
      setPaymentNotes(paymentNotes.replace(/\(Admin Rp [^\)]+\)/, '').trim());
    }
    showAlert('Biaya Admin direset ke Rp 0', 'info');
  };

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
      admin_fee_amount: effectiveAdminFee,
      tax_type: taxType,
      tax_value: taxValue,
      total_amount: totalAmount,
      paid_amount: numericPaid,
      change_amount: changeAmount,
      cashier_name: currentUser?.name || cashierName,
      payment_method: paymentMethod,
      notes: paymentNotes,
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
        setPendingQueueCount(existingQueue.length);

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
        setPendingQueueCount(existingQueue.length);

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

  // Cash Expenses Handlers (Pengeluaran Kas Toko: Sampah, Listrik, Makan, Donasi, Prive, dll)
  const handleSaveExpense = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanAmt = parseFloat(expenseAmount.replace(/[^0-9]/g, '')) || 0;
    if (cleanAmt <= 0) {
      showAlert('Nominal pengeluaran wajib diisi lebih dari Rp 0!', 'error');
      return;
    }
    if (!expenseCategory || expenseCategory.trim() === '') {
      showAlert('Pilih kategori pengeluaran kas!', 'error');
      return;
    }

    setExpenseSubmitting(true);
    const activeCashier = currentUser?.name || cashierName || 'Kasir Utama';
    const payload = {
      cashier_name: activeCashier,
      category: expenseCategory,
      amount: cleanAmt,
      notes: expenseNotes.trim()
    };

    try {
      if (!navigator.onLine) {
        const offlineExp: Expense = {
          id: Date.now(),
          cashier_name: activeCashier,
          category: expenseCategory,
          amount: cleanAmt,
          notes: expenseNotes.trim(),
          created_at: new Date().toISOString()
        };
        const updated = [offlineExp, ...expenses];
        setExpenses(updated);
        localStorage.setItem('tokobazar_offline_expenses', JSON.stringify(updated));
        showAlert(`✅ Pengeluaran kas ${formatRupiah(cleanAmt)} dicatat (Mode Offline)!`, 'success');
        setExpenseAmount('');
        setExpenseNotes('');
        setExpenseModalOpen(false);
        return;
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = [data.expense, ...expenses];
        setExpenses(updated);
        localStorage.setItem('tokobazar_offline_expenses', JSON.stringify(updated));
        showAlert(`✅ Pengeluaran kas ${formatRupiah(cleanAmt)} (${expenseCategory}) berhasil dicatat oleh ${activeCashier}!`, 'success');
        setExpenseAmount('');
        setExpenseNotes('');
        setExpenseModalOpen(false);
      } else {
        throw new Error(data.error || 'Gagal mencatat pengeluaran kas');
      }
    } catch (err: any) {
      showAlert(`Gagal menyimpan pengeluaran: ${err.message}`, 'error');
    } finally {
      setExpenseSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('Yakin ingin membatalkan/menghapus catatan pengeluaran kas ini?')) return;
    try {
      if (navigator.onLine) {
        await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      }
      const updated = expenses.filter(e => e.id !== id);
      setExpenses(updated);
      localStorage.setItem('tokobazar_offline_expenses', JSON.stringify(updated));
      showAlert('Catatan pengeluaran kas berhasil dihapus.', 'info');
    } catch (err: any) {
      showAlert('Gagal menghapus pengeluaran: ' + err.message, 'error');
    }
  };

  const exportExpensesToCSV = () => {
    if (expenses.length === 0) {
      showAlert('Tidak ada data pengeluaran kas untuk diexport.', 'info');
      return;
    }
    const headers = ['ID', 'Tanggal & Waktu', 'Kasir Bertugas', 'Kategori Pengeluaran', 'Nominal (Rp)', 'Keterangan'];
    const rows = expenses.map(e => [
      e.id,
      `"${new Date(e.created_at).toLocaleString('id-ID')}"`,
      `"${e.cashier_name}"`,
      `"${e.category}"`,
      e.amount,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `pengeluaran_kas_${todayDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('✅ File CSV Pengeluaran Kas berhasil didownload!', 'success');
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
        const savedData = await res.json();
        const savedProd: Product = savedData.product || {
          id: savedData.id || Date.now(),
          barcode,
          name,
          price: parseFloat(price)
        };

        fetchProducts();
        setProductModalOpen(false);
        setProductForm({ barcode: '', name: '', price: '' });
        setEditingProductId(null);

        if (addCreatedToCartOnSave) {
          addToCart(savedProd);
          setAddCreatedToCartOnSave(false);
          showAlert(`✅ Barang / Jasa "${savedProd.name}" berhasil disimpan & langsung dimasukkan ke keranjang!`, 'success');
        } else {
          showAlert('✅ Data barang / jasa berhasil disimpan ke database!', 'success');
        }
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

  // Helper to generate a crisp native Canvas receipt if html2canvas fails or is blocked
  const generateNativeReceiptCanvas = (tx: Transaction): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const width = 500;
    const baseHeight = 410;
    const itemHeight = 44 * tx.items.length;
    const height = baseHeight + itemHeight;

    canvas.width = width * 2; // High DPI (2x)
    canvas.height = height * 2;

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.scale(2, 2);

    // White Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Title & Header
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TOKO BAZAR', width / 2, 42);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Struk Pembayaran Belanja Pelanggan', width / 2, 65);

    // Dashed Separator
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(25, 80);
    ctx.lineTo(width - 25, 80);
    ctx.stroke();

    // Invoice Info
    ctx.setLineDash([]);
    ctx.textAlign = 'left';
    ctx.font = '13px monospace';
    ctx.fillStyle = '#334155';
    let y = 105;

    ctx.fillText(`No. Inv : ${tx.invoice_no}`, 25, y);
    y += 22;
    ctx.fillText(`Tanggal : ${new Date(tx.created_at).toLocaleString('id-ID')}`, 25, y);
    y += 22;
    ctx.fillText(`Kasir   : ${tx.cashier_name}`, 25, y);
    y += 18;

    // Dashed Separator
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(25, y);
    ctx.lineTo(width - 25, y);
    ctx.stroke();
    y += 24;

    // Items List
    ctx.setLineDash([]);
    tx.items.forEach(item => {
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(item.product_name, 25, y);
      y += 20;

      ctx.font = '13px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${item.quantity} x ${formatRupiah(item.price)}`, 35, y);

      ctx.textAlign = 'right';
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(formatRupiah(item.subtotal), width - 25, y);
      ctx.textAlign = 'left';

      y += 24;
    });

    // Dashed Separator
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(25, y);
    ctx.lineTo(width - 25, y);
    ctx.stroke();
    y += 24;

    // Subtotal & Extras
    ctx.setLineDash([]);
    if (tx.subtotal_amount && (tx.discount_amount || tx.tax_amount)) {
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Subtotal Brutto', 25, y);
      ctx.textAlign = 'right';
      ctx.fillText(formatRupiah(tx.subtotal_amount), width - 25, y);
      ctx.textAlign = 'left';
      y += 20;
    }

    if (tx.discount_amount && tx.discount_amount > 0) {
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#15803d';
      ctx.fillText('Diskon', 25, y);
      ctx.textAlign = 'right';
      ctx.fillText(`-${formatRupiah(tx.discount_amount)}`, width - 25, y);
      ctx.textAlign = 'left';
      y += 20;
    }

    if (tx.tax_amount && tx.tax_amount > 0) {
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#4338ca';
      ctx.fillText(`Pajak / Biaya`, 25, y);
      ctx.textAlign = 'right';
      ctx.fillText(`+${formatRupiah(tx.tax_amount)}`, width - 25, y);
      ctx.textAlign = 'left';
      y += 20;
    }

    if (tx.admin_fee_amount && tx.admin_fee_amount > 0) {
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#b45309';
      ctx.fillText(`Biaya Admin Toko`, 25, y);
      ctx.textAlign = 'right';
      ctx.fillText(`+${formatRupiah(tx.admin_fee_amount)}`, width - 25, y);
      ctx.textAlign = 'left';
      y += 20;
    }

    // TOTAL
    ctx.font = 'bold 17px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('TOTAL', 25, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e11d48';
    ctx.fillText(formatRupiah(tx.total_amount), width - 25, y);
    ctx.textAlign = 'left';
    y += 24;

    if ((tx.payment_method || '').toUpperCase() === 'QRIS') {
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#0284c7';
      ctx.fillText('Metode: QRIS / Transfer Bank', 25, y);
      ctx.textAlign = 'right';
      ctx.fillText(formatRupiah(tx.paid_amount), width - 25, y);
      ctx.textAlign = 'left';
      y += 20;

      if (tx.paid_amount > tx.total_amount) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#b45309';
        ctx.fillText('Biaya Admin / Transfer', 25, y);
        ctx.textAlign = 'right';
        ctx.fillText(`+${formatRupiah(tx.paid_amount - tx.total_amount)}`, width - 25, y);
        ctx.textAlign = 'left';
        y += 20;
      }

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#16a34a';
      ctx.fillText(tx.paid_amount > tx.total_amount ? 'Status: Lunas (+Admin)' : 'Status: Lunas Pas', 25, y);
      ctx.textAlign = 'right';
      ctx.fillText('Kembalian: Rp 0', width - 25, y);
      ctx.textAlign = 'left';
      y += 20;

      if (tx.notes && tx.notes.trim() !== '') {
        ctx.font = 'italic 11px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`Ref / Catatan: ${tx.notes.slice(0, 36)}`, 25, y);
        y += 18;
      }
    } else {
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Metode: Uang Tunai (Fisik)', 25, y);
      ctx.textAlign = 'right';
      ctx.fillText(formatRupiah(tx.paid_amount), width - 25, y);
      ctx.textAlign = 'left';
      y += 20;

      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Kembalian', 25, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#16a34a';
      ctx.fillText(formatRupiah(tx.change_amount), width - 25, y);
      ctx.textAlign = 'left';
      y += 20;

      if (tx.notes && tx.notes.trim() !== '') {
        ctx.font = 'italic 11px sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`Catatan: ${tx.notes.slice(0, 36)}`, 25, y);
        y += 18;
      }
    }

    // Bottom Dashed
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(25, y);
    ctx.lineTo(width - 25, y);
    ctx.stroke();
    y += 24;

    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Terima Kasih Telah Berbelanja!', width / 2, y);

    return canvas;
  };

  // Download receipt as image with dual strategy
  const downloadReceiptAsImage = async () => {
    if (!completedTx) {
      showAlert('Tidak ada data transaksi struk untuk diunduh', 'error');
      return;
    }

    try {
      let dataUrl: string | null = null;

      // 1. Try html2canvas with un-truncated container cloning
      if (receiptRef.current) {
        try {
          const canvas = await html2canvas(receiptRef.current, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: true,
            logging: false,
            onclone: (clonedDoc) => {
              const el = clonedDoc.getElementById('receipt-print-area');
              if (el) {
                el.style.maxHeight = 'none';
                el.style.overflow = 'visible';
              }
              const scrollableItems = clonedDoc.querySelectorAll('#receipt-print-area div');
              scrollableItems.forEach((item: any) => {
                if (item.style) {
                  item.style.maxHeight = 'none';
                  item.style.overflow = 'visible';
                }
              });
            }
          });
          dataUrl = canvas.toDataURL('image/png');
        } catch (e) {
          console.warn('html2canvas failed, using native canvas fallback', e);
        }
      }

      // 2. Fallback: Generate crisp native HTML5 canvas
      if (!dataUrl || dataUrl.length < 100) {
        const fallbackCanvas = generateNativeReceiptCanvas(completedTx);
        dataUrl = fallbackCanvas.toDataURL('image/png');
      }

      // 3. Trigger Download via Blob + ObjectURL for universal mobile/iframe support
      const fetchRes = await fetch(dataUrl);
      const blob = await fetchRes.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      const safeInvoice = (completedTx.invoice_no || 'struk').replace(/[\/\\]/g, '-');
      link.download = `Struk-${safeInvoice}.png`;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 500);

      showAlert('✅ Gambar struk berhasil diunduh ke galeri / penyimpanan!', 'success');
    } catch (err) {
      console.error('Failed to generate receipt image', err);
      showAlert('Gagal mendownload gambar struk. Silakan coba lagi.', 'error');
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

  // Direct Bluetooth Thermal Printer (ESC/POS) & System Print Fallback
  const printThermalReceipt = async (targetTx?: Transaction) => {
    const tx = targetTx || completedTx;
    if (!tx) {
      showAlert('Tidak ada data transaksi untuk dicetak', 'error');
      return;
    }

    const is80mm = thermalPaperWidth === '80mm';
    const divider = is80mm
      ? '------------------------------------------------\n'
      : '--------------------------------\n';

    // Attempt Web Bluetooth direct print if supported
    if ('bluetooth' in navigator && (navigator as any).bluetooth) {
      try {
        showAlert(`🔍 Mencari Printer Thermal Bluetooth (${thermalPaperWidth})... Silakan pilih printer Anda.`, 'info');
        const device = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '000018f0-0000-1000-8000-00805f9b34fb',
            '0000ff00-0000-1000-8000-00805f9b34fb',
            '49535343-fe7d-4ae5-8fa9-9fafd205e455',
            '00001101-0000-1000-8000-00805f9b34fb'
          ]
        });

        if (device && device.gatt) {
          const server = await device.gatt.connect();
          let service: any;
          try {
            service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
          } catch {
            const services = await server.getPrimaryServices();
            if (services.length > 0) service = services[0];
          }

          if (service) {
            const characteristics = await service.getCharacteristics();
            const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
            if (writeChar) {
              const encoder = new TextEncoder();
              let escpos = '\x1B\x40'; // Initialize printer
              escpos += '\x1B\x61\x01'; // Center alignment
              escpos += `${(storeName || 'TOKO BAZAR').toUpperCase()}\n`;
              escpos += 'Struk Pembayaran Belanja\n';
              escpos += divider;
              escpos += '\x1B\x61\x00'; // Left alignment
              escpos += `No. Inv : ${tx.invoice_no}\n`;
              escpos += `Tanggal : ${new Date(tx.created_at).toLocaleString('id-ID')}\n`;
              escpos += `Kasir   : ${tx.cashier_name}\n`;
              escpos += divider;
              tx.items.forEach(i => {
                escpos += `${i.product_name}\n`;
                escpos += ` ${i.quantity} x ${formatRupiah(i.price)} = ${formatRupiah(i.subtotal)}\n`;
              });
              escpos += divider;
              if (tx.subtotal_amount && (tx.discount_amount || tx.tax_amount || tx.admin_fee_amount)) {
                escpos += `Subtotal : ${formatRupiah(tx.subtotal_amount)}\n`;
              }
              if (tx.discount_amount) escpos += `Diskon   : -${formatRupiah(tx.discount_amount)}\n`;
              if (tx.tax_amount) escpos += `Pajak    : +${formatRupiah(tx.tax_amount)}\n`;
              if (tx.admin_fee_amount) escpos += `Biaya Adm: +${formatRupiah(tx.admin_fee_amount)}\n`;
              escpos += `TOTAL    : ${formatRupiah(tx.total_amount)}\n`;
              if ((tx.payment_method || '').toUpperCase() === 'QRIS') {
                escpos += `Metode   : QRIS/Transfer Bank\n`;
                escpos += `Diterima : ${formatRupiah(tx.paid_amount)}\n`;
                if (tx.paid_amount > tx.total_amount) {
                  escpos += `Biaya Adm: +${formatRupiah(tx.paid_amount - tx.total_amount)}\n`;
                }
                escpos += `Kembali  : Rp 0 (Non-Tunai)\n`;
              } else {
                escpos += `Metode   : Uang Tunai (Fisik)\n`;
                escpos += `Tunai    : ${formatRupiah(tx.paid_amount)}\n`;
                escpos += `Kembali  : ${formatRupiah(tx.change_amount)}\n`;
              }
              if (tx.notes && tx.notes.trim() !== '') {
                escpos += `Ref/Note : ${tx.notes}\n`;
              }
              escpos += divider;
              escpos += '\x1B\x61\x01'; // Center alignment
              escpos += 'Terima Kasih Telah Berbelanja!\n\n\n\n';
              escpos += '\x1D\x56\x41\x03'; // Paper cut

              const data = encoder.encode(escpos);
              await writeChar.writeValue(data);
              showAlert(`✅ Berhasil mengirim struk (${thermalPaperWidth}) ke Printer Thermal Bluetooth!`, 'success');
              return;
            }
          }
        }
      } catch (err: any) {
        console.warn('Bluetooth print skipped/failed, opening standard print dialog:', err);
      }
    }

    // Standard Print Dialog Fallback (Formatted via @media print for 58mm/80mm thermal paper)
    window.print();
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

  // Daily Sales & Expenses calculations (Hari Ini)
  const todayTransactions = transactions.filter(t => getLocalDateString(new Date(t.created_at)) === todayDateStr);
  const todayExpenses = expenses.filter(e => getLocalDateString(new Date(e.created_at)) === todayDateStr);
  const todayTotalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const todaySubtotal = todayTransactions.reduce((sum, t) => sum + (t.subtotal_amount || t.items.reduce((s, i) => s + i.subtotal, 0)), 0);
  const todayDiscounts = todayTransactions.reduce((sum, t) => sum + (t.discount_amount || 0), 0);
  const todayTaxes = todayTransactions.reduce((sum, t) => sum + (t.tax_amount || 0), 0);
  const todayAdminFees = todayTransactions.reduce((sum, t) => sum + (t.admin_fee_amount || (t.paid_amount > t.total_amount ? t.paid_amount - t.total_amount : 0)), 0);
  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const todayItemsCount = todayTransactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0);
  const todayCashTransactions = todayTransactions.filter(t => (t.payment_method || 'TUNAI').toUpperCase() !== 'QRIS');
  const todayQrisTransactions = todayTransactions.filter(t => (t.payment_method || '').toUpperCase() === 'QRIS');
  const todayCashRevenue = todayCashTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const todayQrisRevenue = todayQrisTransactions.reduce((sum, t) => sum + (t.paid_amount || t.total_amount), 0);
  const todayNetRevenue = todayRevenue - todayTotalExpenses;
  const todayCashInDrawer = todayCashRevenue - todayTotalExpenses;

  // Advanced Report Filtering (Default: Hari Ini & Kemarin)
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // Base transactions matching the date range and product filter
  const basePeriodTransactions = transactions.filter(tx => {
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

  // Period Expenses matching the date filter
  const periodExpenses = expenses.filter(e => {
    const eDate = new Date(e.created_at);
    const eDateStr = getLocalDateString(eDate);
    const diffTime = now.getTime() - eDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    if (reportPeriod === 'today_yesterday') {
      return eDateStr === todayDateStr || eDateStr === yesterdayDateStr;
    } else if (reportPeriod === 'today') {
      return eDateStr === todayDateStr;
    } else if (reportPeriod === 'yesterday') {
      return eDateStr === yesterdayDateStr;
    } else if (reportPeriod === 'all') {
      return true;
    } else if (reportPeriod.startsWith('month_')) {
      const monthIdx = parseInt(reportPeriod.split('_')[1], 10);
      return eDate.getMonth() === monthIdx && eDate.getFullYear() === now.getFullYear();
    } else {
      const days = parseInt(reportPeriod, 10);
      return diffDays <= days;
    }
  });

  const periodTotalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

  const periodSubtotal = basePeriodTransactions.reduce((sum, t) => sum + (t.subtotal_amount || t.items.reduce((s, i) => s + i.subtotal, 0)), 0);
  const periodDiscounts = basePeriodTransactions.reduce((sum, t) => sum + (t.discount_amount || 0), 0);
  const periodTaxes = basePeriodTransactions.reduce((sum, t) => sum + (t.tax_amount || 0), 0);
  const periodAdminFees = basePeriodTransactions.reduce((sum, t) => sum + (t.admin_fee_amount || (t.paid_amount > t.total_amount ? t.paid_amount - t.total_amount : 0)), 0);

  // Period Cash vs QRIS Revenue Breakdown (including any admin fee paid to bank account)
  const periodCashTransactions = basePeriodTransactions.filter(
    t => (t.payment_method || 'TUNAI').toUpperCase() !== 'QRIS'
  );
  const periodQrisTransactions = basePeriodTransactions.filter(
    t => (t.payment_method || '').toUpperCase() === 'QRIS'
  );

  const periodRevenue = basePeriodTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const periodCashRevenue = periodCashTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const periodQrisRevenue = periodQrisTransactions.reduce((sum, t) => sum + (t.paid_amount || t.total_amount), 0);
  const periodItemsCount = basePeriodTransactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0);

  // Pemasukan Bersih Toko (Net Income = Total Omset - Total Pengeluaran Kas Toko)
  const periodNetRevenue = periodRevenue - periodTotalExpenses;

  // Sisa Saldo Uang Fisik di Laci Kasir (Cash in Drawer = Uang Tunai Masuk - Total Pengeluaran Kas Tunai)
  const periodCashInDrawer = periodCashRevenue - periodTotalExpenses;

  // Filtered transactions for the list view with optional payment method sub-filter
  const filteredTransactions = basePeriodTransactions.filter(tx => {
    if (reportPaymentFilter === 'TUNAI') {
      return (tx.payment_method || 'TUNAI').toUpperCase() !== 'QRIS';
    }
    if (reportPaymentFilter === 'QRIS') {
      return (tx.payment_method || '').toUpperCase() === 'QRIS';
    }
    return true;
  });

  const getReportPeriodLabel = () => {
    if (reportPeriod === 'today_yesterday') return 'Hari Ini & Kemarin';
    if (reportPeriod === 'today') return `Hari Ini (${todayDateStr})`;
    if (reportPeriod === 'yesterday') return `Kemarin (${yesterdayDateStr})`;
    if (reportPeriod === 'all') return 'Semua Waktu';
    if (reportPeriod.startsWith('month_')) {
      const idx = parseInt(reportPeriod.split('_')[1], 10);
      return `Bulan ${monthNames[idx]} ${now.getFullYear()}`;
    }
    return `${reportPeriod} Hari Terakhir`;
  };

  const specificProductStats = selectedReportProduct !== 'all' ? basePeriodTransactions.reduce((acc, t) => {
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

  // Filtered Expenses for the dedicated Expenses Tab
  const filteredExpensesList = expenses.filter(e => {
    const eDate = new Date(e.created_at);
    const eDateStr = getLocalDateString(eDate);
    const diffTime = now.getTime() - eDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    if (expensePeriodFilter === 'today_yesterday') {
      if (eDateStr !== todayDateStr && eDateStr !== yesterdayDateStr) return false;
    } else if (expensePeriodFilter === 'today') {
      if (eDateStr !== todayDateStr) return false;
    } else if (expensePeriodFilter === 'yesterday') {
      if (eDateStr !== yesterdayDateStr) return false;
    } else if (expensePeriodFilter === '7') {
      if (diffDays > 7) return false;
    } else if (expensePeriodFilter === '30') {
      if (diffDays > 30) return false;
    } else if (expensePeriodFilter === 'all') {
      // all pass
    }

    if (expenseCategoryFilter !== 'all' && e.category !== expenseCategoryFilter) {
      return false;
    }

    if (expenseSearch.trim()) {
      const q = expenseSearch.toLowerCase();
      const matchNotes = (e.notes || '').toLowerCase().includes(q);
      const matchCashier = (e.cashier_name || '').toLowerCase().includes(q);
      const matchCategory = (e.category || '').toLowerCase().includes(q);
      if (!matchNotes && !matchCashier && !matchCategory) return false;
    }

    return true;
  });

  const filteredExpensesTotal = filteredExpensesList.reduce((sum, e) => sum + e.amount, 0);

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

  // Render Full Screen Login if not authenticated or accessing /login-999
  if (!currentUser || window.location.pathname === '/login-999') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 font-sans relative overflow-x-hidden">
        {/* Background Decorative Gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-900/30 via-slate-950 to-slate-950 pointer-events-none" />

        <div className="relative z-10 w-full max-w-md space-y-5">
          {/* Top Brand Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 bg-rose-600 text-white rounded-2xl shadow-xl ring-4 ring-rose-500/30">
              <Store className="w-10 h-10" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {storeName}
            </h1>
            <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3.5 py-1 rounded-full text-xs font-bold text-rose-300">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Akses Terproteksi Login Kasir & Admin</span>
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Silakan login terlebih dahulu untuk mengakses sistem kalkulator kasir dan kelola toko.
            </p>
          </div>

          {/* Brute Force Lockout Banner */}
          {lockoutSecondsLeft > 0 && (
            <div className="bg-red-950 border-2 border-red-500 text-white p-4 rounded-2xl space-y-1 text-center shadow-xl animate-bounce">
              <div className="flex items-center justify-center gap-2 font-black text-sm text-amber-300">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <span>AKSES LOGIN DIKUNCI SEMENTARA!</span>
              </div>
              <p className="text-xs text-slate-200">
                Terlalu banyak percobaan login yang gagal (5/5). Silakan tunggu:
              </p>
              <div className="text-2xl font-black font-mono text-amber-300 pt-1">
                ⏱️ {lockoutSecondsLeft} Detik
              </div>
            </div>
          )}

          {/* Login Card Form */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                  Username Akun
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ketik username (misal: kasir atau admin)"
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    disabled={lockoutSecondsLeft > 0}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border-2 border-slate-700 rounded-xl text-white font-bold text-base placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    placeholder="Masukkan password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    disabled={lockoutSecondsLeft > 0}
                    className="w-full pl-11 pr-11 py-3 bg-slate-950 border-2 border-slate-700 rounded-xl text-white font-bold text-base placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                  >
                    {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading || lockoutSecondsLeft > 0}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white font-black text-base rounded-xl shadow-lg transition border-2 border-rose-400/50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Memeriksa Akses...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-5 h-5 text-amber-300" />
                    <span>MASUK KASIR / ADMIN</span>
                  </>
                )}
              </button>
            </form>

            {/* Default Credentials Helper Card */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="text-center">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  🔐 Akun Default Aplikasi Toko:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Kasir Utama Button */}
                <button
                  type="button"
                  onClick={() => {
                    setLoginUsername('kasir');
                    setLoginPassword('kasir1234');
                  }}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-left transition space-y-1"
                >
                  <div className="flex items-center justify-between text-amber-300 font-black">
                    <span>🔑 Kasir Utama</span>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">KASIR</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono">
                    User: <strong>kasir</strong><br/>
                    Pass: <strong>kasir1234</strong>
                  </div>
                </button>

                {/* Administrator Button */}
                <button
                  type="button"
                  onClick={() => {
                    setLoginUsername('admin');
                    setLoginPassword('admin1234');
                  }}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-left transition space-y-1"
                >
                  <div className="flex items-center justify-between text-rose-400 font-black">
                    <span>👑 Administrator</span>
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-mono">ADMIN</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono">
                    User: <strong>admin</strong><br/>
                    Pass: <strong>admin1234</strong>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-500 font-medium">
            TokoBazar POS • Kasir & Manajemen Toko Digital
          </div>
        </div>

        {/* TOAST & CONFIRM MODAL ALSO RENDERABLE ON LOGIN SCREEN */}
        {toast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4 pointer-events-auto">
            <div className={`p-4 rounded-2xl shadow-2xl border-3 flex items-start justify-between gap-3 text-base font-black ${
              toast.type === 'error'
                ? 'bg-rose-950 border-rose-500 text-white'
                : toast.type === 'success'
                ? 'bg-emerald-950 border-emerald-400 text-white'
                : 'bg-slate-900 border-amber-400 text-white'
            }`}>
              <div className="flex items-start gap-2.5">
                <span className="text-xl shrink-0">
                  {toast.type === 'error' ? '🚫' : toast.type === 'success' ? '✅' : 'ℹ️'}
                </span>
                <div className="whitespace-pre-line text-sm font-extrabold leading-relaxed">
                  {toast.message}
                </div>
              </div>
              <button
                onClick={() => setToast(null)}
                className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-slate-950 text-white shadow-lg sticky top-0 z-30 w-full overflow-x-hidden border-b-2 border-slate-800">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
          {/* Store Name & Active User Badge */}
          <div className="flex items-center space-x-2 min-w-0">
            <div className="hidden sm:flex bg-rose-600 p-2 sm:p-2.5 rounded-xl shadow-md items-center justify-center shrink-0">
              <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 leading-tight">
                <h1 className="text-sm sm:text-lg md:text-xl font-black tracking-tight text-white truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none">
                  {storeName}
                </h1>
                <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-md font-mono font-bold tracking-wider shrink-0 ${
                  currentUser.role === 'ADMIN' ? 'bg-amber-400 text-slate-950' : 'bg-rose-600 text-white'
                }`}>
                  {currentUser.role}
                </span>

                {/* Battery Status Badge */}
                {batteryLevel !== null && (
                  <div
                    title={`Baterai Kasir: ${batteryLevel}% ${isCharging ? '(Sedang Diisi Daya / Charging)' : ''}`}
                    className={`hidden xs:flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border transition ${
                      isCharging
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                        : batteryLevel <= 15
                        ? 'bg-red-600 text-white border-red-400 animate-pulse font-black'
                        : batteryLevel <= 30
                        ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}
                  >
                    {isCharging ? (
                      <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    ) : batteryLevel <= 15 ? (
                      <BatteryLow className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Battery className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span className="font-mono">{batteryLevel}%</span>
                    {isCharging && <span className="text-[9px] text-emerald-400">⚡</span>}
                  </div>
                )}

                {/* Offline Sync Status Badge (Cloudflare D1 Queue Indicator) */}
                {(pendingQueueCount > 0 || isSyncingQueue) && (
                  <button
                    type="button"
                    onClick={syncPendingTransactions}
                    title={
                      isSyncingQueue
                        ? `Sedang mengunggah ${pendingQueueCount} transaksi offline ke Cloudflare D1...`
                        : !isOnline
                        ? `${pendingQueueCount} transaksi tersimpan di memori HP. Otomatis dikirim saat online (Klik untuk coba sinkronkan)`
                        : `${pendingQueueCount} transaksi dalam antrean offline. Klik untuk sinkronkan ke Cloudflare D1 sekarang`
                    }
                    className={`flex items-center space-x-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-black shadow-lg border transition-all cursor-pointer shrink-0 ${
                      isSyncingQueue
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-400 ring-2 ring-cyan-400/60 animate-pulse'
                        : !isOnline
                        ? 'bg-amber-950 text-amber-300 border-amber-400 hover:bg-amber-900'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-400 hover:bg-emerald-900'
                    }`}
                  >
                    {isSyncingQueue ? (
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-300 animate-spin shrink-0" />
                    ) : (
                      <Cloud className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="font-mono tracking-tight">
                      {isSyncingQueue
                        ? `Syncing D1... (${pendingQueueCount})`
                        : !isOnline
                        ? `⚡ ${pendingQueueCount} Antrean`
                        : `☁️ Kirim ${pendingQueueCount} D1`}
                    </span>
                  </button>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-semibold truncate leading-tight flex items-center gap-1">
                <span>👤 {currentUser.name}</span>
              </p>
            </div>
          </div>

          {/* Navigation Controls: Hitung (with total items) and MENU */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              onClick={() => handleTabChange('pos')}
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
                {/* 1. Lihat Katalog Barang / Jasa */}
                <button
                  onClick={() => handleTabChange('catalog')}
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
                      <div className="font-bold text-base">Lihat Katalog Barang / Jasa</div>
                      <div className="text-xs text-slate-400">Daftar semua barang, jasa & harga ({products.length} item)</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>

                {/* 2. Atur Barang / Jasa (Dapat Diakses KASIR & ADMIN) */}
                <button
                  onClick={() => handleTabChange('products')}
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
                      <div className="font-bold text-base flex items-center gap-1.5">
                        <span>Atur Barang / Jasa</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-bold">Kasir & Admin</span>
                      </div>
                      <div className="text-xs text-slate-400">Tambah item baru, ubah harga, hapus, import CSV</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>

                {/* 3. Top Terjual (Blocked for KASIR) */}
                <button
                  onClick={() => handleTabChange('top-selling')}
                  className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border-2 ${
                    activeTab === 'top-selling'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                      : currentUser?.role === 'KASIR'
                      ? 'bg-slate-900/60 text-slate-500 border-slate-800 opacity-60'
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
                        {currentUser?.role === 'KASIR' ? (
                          <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded font-mono">🔒 ADMIN</span>
                        ) : (
                          <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded-full font-bold">Laris</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">Peringkat barang paling laku per periode</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>

                {/* 4. Riwayat Transaksi */}
                <button
                  onClick={() => handleTabChange('history')}
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

                {/* 5. Pengeluaran Kas Toko (Beban Operasional - DAPAT DIAKSES KASIR & ADMIN) */}
                <button
                  onClick={() => handleTabChange('expenses')}
                  className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border-2 ${
                    activeTab === 'expenses'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
                      <Wallet className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                      <div className="font-bold text-base flex items-center gap-1.5">
                        <span>Pengeluaran Kas Toko</span>
                        <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded-full font-bold">Beban Kas</span>
                      </div>
                      <div className="text-xs text-slate-400">Sampah, listrik, makan, donasi, prive (Mengurangi kas)</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>

                {/* 6. Pengaturan (Setting) (Blocked for KASIR) */}
                <button
                  onClick={() => handleTabChange('settings')}
                  className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border-2 ${
                    activeTab === 'settings'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                      : currentUser?.role === 'KASIR'
                      ? 'bg-slate-900/60 text-slate-500 border-slate-800 opacity-60'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl">
                      <Settings className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="font-bold text-base flex items-center gap-1.5">
                        <span>Pengaturan (Setting)</span>
                        {currentUser?.role === 'KASIR' && (
                          <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded font-mono">🔒 ADMIN</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">Kamera default, nama kasir, suara</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>

                {/* 6. Bantuan & Database D1 (Blocked for KASIR) */}
                <button
                  onClick={() => handleTabChange('cloudflare')}
                  className={`w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border-2 ${
                    activeTab === 'cloudflare'
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                      : currentUser?.role === 'KASIR'
                      ? 'bg-slate-900/60 text-slate-500 border-slate-800 opacity-60'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-100 border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl">
                      <Cloud className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-bold text-base flex items-center gap-1.5">
                        <span>? (Petunjuk PWA & Bantuan)</span>
                        {currentUser?.role === 'KASIR' && (
                          <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded font-mono">🔒 ADMIN</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">Petunjuk install PWA, offline & D1</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>

                {/* 7. Kelola User & Password (ADMIN ONLY) */}
                {currentUser?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setUserModalOpen(true);
                      setMenuDropdownOpen(false);
                      fetchUsersList();
                    }}
                    className="w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border-2 bg-gradient-to-r from-amber-950 to-slate-900 border-amber-500 text-amber-200 hover:bg-slate-800 shadow-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-xl">
                        <Users className="w-5 h-5 text-amber-300" />
                      </div>
                      <div>
                        <div className="font-bold text-base text-amber-300 flex items-center gap-1.5">
                          <span>Kelola User & Password</span>
                          <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black">ADMIN</span>
                        </div>
                        <div className="text-xs text-slate-300">Tambah user baru, reset password, ubah role</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-amber-300" />
                  </button>
                )}
              </div>

              {/* Status & Logout Button */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                {/* Offline Queue Indicator Card in Drawer */}
                {(pendingQueueCount > 0 || isSyncingQueue) && (
                  <div className="bg-slate-950 border-2 border-cyan-500/60 rounded-xl p-3 text-xs space-y-2 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-bold text-cyan-300">
                        {isSyncingQueue ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                        ) : (
                          <Cloud className="w-4 h-4 text-amber-400" />
                        )}
                        <span>Antrean Offline Cloudflare D1</span>
                      </div>
                      <span className="font-mono text-xs font-black text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/40">
                        {pendingQueueCount} Transaksi
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {isSyncingQueue
                        ? '🔄 Sedang mengunggah antrean transaksi lokal ke database Cloudflare D1...'
                        : !isOnline
                        ? '⚡ Perangkat offline. Transaksi tersimpan aman di memori HP dan akan disinkronkan otomatis saat ada koneksi.'
                        : '☁️ Ada data offline belum terkirim. Ketuk tombol di bawah untuk menyinkronkan sekarang.'}
                    </p>
                    {isOnline && !isSyncingQueue && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuDropdownOpen(false);
                          syncPendingTransactions();
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-lg text-xs transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Kirim {pendingQueueCount} Data Ke Cloudflare D1 Sekarang</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-amber-400" />
                    <span>
                      User: <strong>{currentUser.name}</strong> ({currentUser.role})
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                    isOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                  }`}>
                    {isOnline ? '● Online' : '○ Offline'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-3 bg-red-950/80 hover:bg-red-900 text-red-200 font-black text-sm rounded-xl border border-red-700/60 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-300" />
                  <span>Keluar / Logout Akun</span>
                </button>

                <div className="flex justify-center pt-1">
                  <PWAInstallButton className="w-full justify-center" />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className={`flex-1 max-w-7xl w-full mx-auto transition-all ${mobileMarginMode === 'max_width' ? 'px-0 py-1 sm:px-2 py-2 md:p-6' : 'p-3.5 sm:p-4 md:p-6'}`}>
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
            {/* CRITICAL LOW BATTERY RED WARNING BANNER (<15%) */}
            {batteryLevel !== null && batteryLevel <= 15 && !isCharging && !dismissBatteryWarning && (
              <div className="bg-red-600 text-white rounded-2xl p-4 shadow-xl border-2 border-red-400 animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-red-950/80 p-2.5 rounded-xl shrink-0 border border-red-500/50 mt-0.5">
                    <BatteryWarning className="w-6 h-6 text-amber-300 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-red-950 font-black text-amber-300 text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider border border-red-800">
                        ⚠️ PERINGATAN BATERAI LEMAH ({batteryLevel}%)
                      </span>
                      <span className="text-xs text-red-100 font-bold hidden sm:inline">Perhatian Kasir Mobile</span>
                    </div>
                    <h4 className="text-sm sm:text-base font-black text-white mt-1">
                      Baterai HP / Mesin Kasir Tinggal {batteryLevel}%! Segera Colokkan Charger.
                    </h4>
                    <p className="text-xs text-red-100 mt-0.5 leading-relaxed font-medium">
                      Harap sambungkan pengisi daya untuk mencegah perangkat mati mendadak saat melayani transaksi kasir di jam sibuk toko.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setDismissBatteryWarning(true)}
                    className="bg-red-950 hover:bg-red-900 text-red-100 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-red-800 cursor-pointer shadow-sm"
                  >
                    <X className="w-4 h-4" />
                    <span>Sembunyikan Warning</span>
                  </button>
                </div>
              </div>
            )}
            {/* MOBILE QUICK TOTAL BAR (Visible on small screens <lg) - Directs senior cashier eyes directly to current Total Belanja */}
            <div
              ref={totalBelanjaMobileRef}
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
              <div className="bg-pink-100 rounded-2xl shadow-sm border-2 border-pink-400 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-black text-pink-950 flex items-center gap-2">
                    <Search className="w-5 h-5 text-rose-700" />
                    <span>Cari Barang</span>
                  </h2>
                  <button
                    onClick={() => setIsScanning(true)}
                    className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Scan Kamera</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-700 font-bold" />
                  <input
                    type="text"
                    placeholder="Cari nama barang atau ketik/scan barcode..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border-2 border-pink-500 rounded-xl text-slate-950 font-extrabold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-600 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-3.5 text-slate-600 hover:text-slate-950"
                    >
                      <X className="w-5 h-5 stroke-[2.5]" />
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
                      <div className="py-10 px-3 text-center bg-amber-50 border-2 border-amber-400/80 rounded-2xl my-2 space-y-3 shadow-sm">
                        <AlertCircle className="w-10 h-10 mx-auto text-amber-600" />
                        <div>
                          <p className="font-black text-slate-900 text-sm sm:text-base">
                            Barang / Jasa "{searchQuery}" belum terdaftar di database!
                          </p>
                          <p className="text-xs text-slate-700 mt-1 font-medium">
                            Kasir dapat langsung menambahkan item ini ke database sekarang tanpa menunggu admin.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const isNumeric = /^[0-9A-Z_]+$/i.test(searchQuery.trim());
                            setUnregisteredItemPrompt({
                              barcode: isNumeric ? searchQuery.trim() : '',
                              name: isNumeric ? '' : searchQuery.trim()
                            });
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition inline-flex items-center gap-2 cursor-pointer active:scale-98"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Tambah Barang / Jasa Baru Ini Sekarang</span>
                        </button>
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
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="w-5 h-5 text-rose-600" />
                    <h2 className="font-extrabold text-slate-950 text-base">Keranjang Belanja Kasir</h2>
                  </div>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs text-red-600 hover:text-red-800 font-extrabold flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Kosongkan</span>
                    </button>
                  )}
                </div>

                {/* Cart Items Box with Yellow Background & Pitch Black Text */}
                <div className="rounded-2xl border-4 border-slate-950 bg-amber-200 p-2.5 sm:p-3 shadow-md my-2.5">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-slate-950">
                    <span className="text-xs sm:text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                      <List className="w-4 h-4 text-rose-700 stroke-[2.5]" />
                      Daftar Belanjaan ({cart.reduce((sum, item) => sum + item.quantity, 0)} item)
                    </span>
                    {cart.length > 0 && (
                      <span className="text-xs font-black text-slate-950 bg-white px-2 py-0.5 rounded border-2 border-slate-950">
                        {cart.length} Jenis
                      </span>
                    )}
                  </div>

                  <div className="flex-1 max-h-[280px] overflow-y-auto space-y-2.5 pr-0.5">
                    {cart.length === 0 ? (
                      <div className="py-10 text-center text-slate-950 flex flex-col items-center justify-center">
                        <ShoppingCart className="w-12 h-12 text-slate-950 mb-2 stroke-[2.5]" />
                        <p className="text-base font-black text-slate-950">Keranjang masih kosong</p>
                        <p className="text-xs font-black text-slate-950 mt-1">Scan barcode atau pilih produk dari katalog</p>
                      </div>
                    ) : (
                      cart.map(item => (
                        <div key={item.product.id} className="bg-white p-3 rounded-xl border-2 border-slate-800 shadow-xs flex flex-col space-y-2 animate-cart-item-enter">
                          {/* Line 1: Full Nama Barang without being overlapped by quantity/price (Request 6) */}
                          <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-1.5">
                            <h4 className="text-sm sm:text-base font-black text-slate-950 leading-snug break-words flex-1">
                              {item.product.name}
                            </h4>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-slate-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition shrink-0"
                              title="Hapus barang"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>

                          {/* Line 2: Unit Price, Quantity Buttons, and Subtotal */}
                          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap pt-0.5">
                            <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                              <span className="text-slate-600 text-[11px] block sm:inline">Harga: </span>
                              <span>{formatRupiah(item.product.price)}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <div className="flex items-center bg-slate-100 border-2 border-slate-800 rounded-lg overflow-hidden shadow-2xs">
                                <button
                                  onClick={() => updateQuantity(item.product.id, -1)}
                                  className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-950 font-black text-sm transition"
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

                              <div className="text-right min-w-[80px]">
                                <span className="text-[10px] text-slate-600 block uppercase font-black">Subtotal</span>
                                <span className="font-black text-sm sm:text-base text-rose-700 font-mono">
                                  {formatRupiah(item.product.price * item.quantity)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Subtotal & Summary with Diskon & Pajak (Default Hidden inside Buttons) */}
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-800 font-bold">Subtotal Brutto ({cart.reduce((sum, item) => sum + item.quantity, 0)} item)</span>
                    <span className="font-black text-slate-950">{formatRupiah(subtotalAmount)}</span>
                  </div>

                  {/* Toggle Buttons: Diskon & Pajak */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDiscountSection(!showDiscountSection)}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 border shadow-2xs ${
                        discountAmount > 0
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-400 ring-1 ring-emerald-400/30'
                          : showDiscountSection
                          ? 'bg-slate-900 text-white border-slate-800'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{discountAmount > 0 ? `Diskon: -${formatRupiah(discountAmount)}` : 'Diskon'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDiscountSection ? 'rotate-180' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTaxSection(!showTaxSection)}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 border shadow-2xs ${
                        taxAmount > 0
                          ? 'bg-indigo-100 text-indigo-950 border-indigo-400 ring-1 ring-indigo-400/30'
                          : showTaxSection
                          ? 'bg-slate-900 text-white border-slate-800'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{taxAmount > 0 ? `Pajak: +${formatRupiah(taxAmount)}` : 'Pajak'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTaxSection ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Discount Box (Default Hidden, opened via 'Diskon' button) */}
                  {showDiscountSection && (
                    <div className="bg-emerald-50/90 p-3 rounded-xl border-2 border-emerald-300 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Atur Diskon Potongan Harga</span>
                        </label>
                        <div className="flex items-center space-x-1 bg-white border border-emerald-300 rounded-lg p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setDiscountType('rp')}
                            className={`px-2.5 py-0.5 text-xs font-bold rounded transition ${
                              discountType === 'rp' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-950'
                            }`}
                          >
                            Rp
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountType('pct')}
                            className={`px-2.5 py-0.5 text-xs font-bold rounded transition ${
                              discountType === 'pct' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-950'
                            }`}
                          >
                            %
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        {discountType === 'rp' && <span className="absolute left-3 top-2.5 text-xs font-extrabold text-slate-600">Rp</span>}
                        <input
                          type="number"
                          placeholder={discountType === 'rp' ? "Nominal diskon (Rp)" : "Persentase (0-100%)"}
                          value={discountValue}
                          onChange={e => setDiscountValue(e.target.value)}
                          className={`w-full py-2 bg-white border-2 border-emerald-400 rounded-lg text-slate-950 font-black text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                            discountType === 'rp' ? 'pl-9 pr-3' : 'px-3'
                          }`}
                        />
                        {discountType === 'pct' && <span className="absolute right-3 top-2.5 text-xs font-extrabold text-slate-600">%</span>}
                      </div>
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        {discountAmount > 0 ? (
                          <span className="font-extrabold text-emerald-800">Potongan: - {formatRupiah(discountAmount)}</span>
                        ) : (
                          <span className="text-slate-600 text-[11px] font-bold">Ketik nominal atau persen diskon</span>
                        )}
                        <div className="flex gap-2">
                          {discountValue && (
                            <button
                              type="button"
                              onClick={() => setDiscountValue('')}
                              className="text-rose-700 hover:underline font-extrabold text-[11px]"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowDiscountSection(false)}
                            className="text-slate-800 hover:text-slate-950 font-extrabold text-[11px]"
                          >
                            Tutup
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tax Box (Default Hidden, opened via 'Pajak' button) */}
                  {showTaxSection && (
                    <div className="bg-indigo-50/90 p-3 rounded-xl border-2 border-indigo-300 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Biaya / Pajak (dari total brutto)</span>
                        </label>
                        <div className="flex items-center space-x-1 bg-white border border-indigo-300 rounded-lg p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setTaxType('pct')}
                            className={`px-2.5 py-0.5 text-xs font-bold rounded transition ${
                              taxType === 'pct' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-950'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaxType('rp')}
                            className={`px-2.5 py-0.5 text-xs font-bold rounded transition ${
                              taxType === 'rp' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-950'
                            }`}
                          >
                            Rp
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        {taxType === 'rp' && <span className="absolute left-3 top-2.5 text-xs font-extrabold text-slate-600">Rp</span>}
                        <input
                          type="number"
                          placeholder={taxType === 'pct' ? "Persentase pajak (misal 11 untuk PPN 11%)" : "Nominal biaya/pajak (Rp)"}
                          value={taxValue}
                          onChange={e => setTaxValue(e.target.value)}
                          className={`w-full py-2 bg-white border-2 border-indigo-400 rounded-lg text-slate-950 font-black text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                            taxType === 'rp' ? 'pl-9 pr-3' : 'px-3'
                          }`}
                        />
                        {taxType === 'pct' && <span className="absolute right-3 top-2.5 text-xs font-extrabold text-slate-600">%</span>}
                      </div>
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-600 font-bold">Preset:</span>
                          <button
                            type="button"
                            onClick={() => { setTaxType('pct'); setTaxValue('11'); }}
                            className="px-2 py-0.5 rounded bg-white border border-indigo-300 text-indigo-900 text-[11px] font-black hover:bg-indigo-100"
                          >
                            PPN 11%
                          </button>
                          <button
                            type="button"
                            onClick={() => { setTaxType('pct'); setTaxValue('10'); }}
                            className="px-2 py-0.5 rounded bg-white border border-indigo-300 text-indigo-900 text-[11px] font-black hover:bg-indigo-100"
                          >
                            10%
                          </button>
                        </div>
                        <div className="flex gap-2">
                          {taxValue && (
                            <button
                              type="button"
                              onClick={() => setTaxValue('')}
                              className="text-rose-700 hover:underline font-extrabold text-[11px]"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowTaxSection(false)}
                            className="text-slate-800 hover:text-slate-950 font-extrabold text-[11px]"
                          >
                            Tutup
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Active Discount / Tax line items in summary */}
                  {discountAmount > 0 && !showDiscountSection && (
                    <div className="flex justify-between text-xs font-extrabold text-emerald-950 bg-emerald-100 border border-emerald-400 px-3 py-1.5 rounded-lg">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-800" />
                        <span>Diskon ({discountType === 'pct' ? `${discountValue}%` : 'Rp'}):</span>
                      </span>
                      <span className="font-black text-emerald-950">- {formatRupiah(discountAmount)}</span>
                    </div>
                  )}

                  {taxAmount > 0 && !showTaxSection && (
                    <div className="flex justify-between text-xs font-extrabold text-indigo-950 bg-indigo-100 border border-indigo-400 px-3 py-1.5 rounded-lg">
                      <span className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-indigo-900" />
                        <span>Pajak ({taxType === 'pct' ? `${taxValue}%` : 'Rp'}):</span>
                      </span>
                      <span className="font-black text-indigo-950">+ {formatRupiah(taxAmount)}</span>
                    </div>
                  )}

                  {/* ULTRA HIGH CONTRAST TOTAL BELANJA DISPLAY WITH EYE-FOCUS ANIMATION & AUTO-SCROLL REF (Request 1) */}
                  <div
                    ref={totalBelanjaRef}
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

                {/* Payment & Change Calculator with 1cm Vertical Gap & Dark Violet Box */}
                <div
                  style={{ marginTop: '1cm', backgroundColor: '#3b0764', borderColor: '#7e22ce' }}
                  className="p-4 rounded-2xl border-4 shadow-2xl space-y-3 text-white"
                >
                  {/* Payment Method Selector & Centang QRIS / Transfer */}
                  <div className="space-y-3 pb-3 border-b border-purple-800">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black uppercase tracking-wider text-amber-300">
                        Pilihan Metode Pembayaran
                      </label>
                      <span className={`text-[11px] font-black px-3 py-1 rounded-full border shadow-xs ${
                        paymentMethod === 'QRIS'
                          ? 'bg-sky-400 text-slate-950 border-sky-300 ring-2 ring-sky-300/60'
                          : 'bg-emerald-500 text-slate-950 border-emerald-300 ring-2 ring-emerald-300/60'
                      }`}>
                        {paymentMethod === 'QRIS' ? '📱 QRIS / TRANSFER BANK' : '💵 UANG TUNAI (FISIK)'}
                      </span>
                    </div>

                    {/* Centang QRIS / Transfer Checkbox Card */}
                    <label className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition cursor-pointer select-none ${
                      paymentMethod === 'QRIS'
                        ? 'bg-slate-900 border-sky-400 ring-2 ring-sky-400/50 text-sky-100 shadow-md'
                        : 'bg-purple-950/70 border-purple-700 hover:bg-purple-900/80 text-purple-200'
                    }`}>
                      <input
                        type="checkbox"
                        checked={paymentMethod === 'QRIS'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleSelectPaymentMethod('QRIS');
                          } else {
                            handleSelectPaymentMethod('TUNAI');
                          }
                        }}
                        className="w-5 h-5 mt-0.5 accent-sky-400 cursor-pointer shrink-0 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-white">
                          <QrCode className="w-4 h-4 text-sky-400 shrink-0" />
                          <span>Centang jika Dilunasi dengan QRIS / Transfer Bank (Non-Tunai)</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                          Untuk pembayaran QRIS toko maupun transfer langsung ke rekening bank (BCA, Mandiri, BRI, dll).
                        </p>
                      </div>
                    </label>

                    {/* Dua Tombol Metode Pembayaran dengan Warna Background Berbeda Jelas */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* 1. Tombol Uang Tunai (Fisik) - DEFAULT: Emerald Green Theme */}
                      <button
                        type="button"
                        onClick={() => handleSelectPaymentMethod('TUNAI')}
                        className={`py-3 px-3 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
                          paymentMethod === 'TUNAI'
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300 ring-4 ring-emerald-400/50 scale-101'
                            : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700/80'
                        }`}
                      >
                        <Banknote className="w-4 h-4 shrink-0" />
                        <span className="truncate">💵 Uang Tunai (Fisik)</span>
                      </button>

                      {/* 2. Tombol QRIS / Transfer (Non-Tunai) - Sky / Ocean Blue Theme */}
                      <button
                        type="button"
                        onClick={() => handleSelectPaymentMethod('QRIS')}
                        className={`py-3 px-3 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
                          paymentMethod === 'QRIS'
                            ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 border-sky-200 ring-4 ring-sky-400/50 scale-101'
                            : 'bg-sky-950/80 hover:bg-sky-900 text-sky-300 border-sky-700/80'
                        }`}
                      >
                        <QrCode className="w-4 h-4 shrink-0" />
                        <span className="truncate">📱 QRIS / Transfer Bank</span>
                      </button>
                    </div>
                  </div>

                  {/* KOTAK STATUS QRIS / TRANSFER BANK: Deep Slate Charcoal + Sky Blue Border (Bukan Ungu) */}
                  {paymentMethod === 'QRIS' ? (
                    <div className="bg-slate-900 border-3 border-sky-400 p-4 rounded-xl space-y-3 text-white shadow-2xl animate-modal-pop">
                      {/* Header with High-Contrast LUNAS PAS wording */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-sky-500/20 p-1.5 rounded-lg border border-sky-400/40 text-sky-300">
                            <QrCode className="w-4 h-4 animate-pulse" />
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-black text-sky-300 block">
                              Status: Pembayaran Lunas via QRIS / Transfer
                            </span>
                            <span className="text-[11px] text-slate-300 font-medium">
                              Dana masuk rekening bank / saldo QRIS toko
                            </span>
                          </div>
                        </div>

                        {/* High-Contrast "LUNAS PAS" / "LUNAS (+BIAYA)" Wording */}
                        <div className="shrink-0 self-start sm:self-auto">
                          {numericPaid > totalAmount ? (
                            <span className="bg-amber-300 text-slate-950 text-xs font-black px-3 py-1.5 rounded-lg border-2 border-amber-400 shadow-md tracking-wider inline-flex items-center gap-1">
                              ✓ LUNAS (+ADMIN {formatRupiah(numericPaid - totalAmount)})
                            </span>
                          ) : numericPaid === totalAmount ? (
                            <span className="bg-amber-300 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-lg border-2 border-amber-400 shadow-md tracking-wider inline-flex items-center gap-1">
                              ✓ LUNAS PAS
                            </span>
                          ) : (
                            <span className="bg-rose-500 text-white text-xs font-black px-3 py-1.5 rounded-lg border-2 border-rose-300 shadow-md tracking-wider inline-flex items-center gap-1">
                              ⚠️ KURANG {formatRupiah(totalAmount - numericPaid)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Manual Editable Input: Nominal QRIS Diterima */}
                      <div className="bg-slate-950 p-3.5 rounded-xl border-2 border-sky-500/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-black text-sky-300 uppercase tracking-wide">
                            Nominal QRIS / Transfer Diterima (Rp)
                          </label>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Total Belanja: <strong className="text-amber-300">{formatRupiah(totalAmount)}</strong>
                          </span>
                        </div>

                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-slate-950 font-black text-lg">Rp</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={paidAmount}
                            onChange={e => setPaidAmount(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border-3 border-sky-400 rounded-xl text-slate-950 font-black focus:outline-none focus:ring-4 focus:ring-sky-400/50 transition text-xl shadow-inner placeholder:text-slate-400"
                          />
                        </div>

                        {/* Quick Action Suggestion Buttons: Uang Pas & Biaya Admin */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setPaidAmount(String(totalAmount))}
                            className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-black px-2.5 py-1.5 rounded-lg border border-sky-400 transition cursor-pointer"
                          >
                            ⚡ Uang Pas ({formatRupiah(totalAmount)})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddAdminFee(500)}
                            className="text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 py-1.5 rounded-lg border border-amber-300 transition cursor-pointer shadow-xs"
                          >
                            + Rp 500 (Biaya Admin)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddAdminFee(1000)}
                            className="text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 py-1.5 rounded-lg border border-amber-300 transition cursor-pointer shadow-xs"
                          >
                            + Rp 1.000
                          </button>
                          {adminFeeAmount > 0 && (
                            <button
                              type="button"
                              onClick={handleResetAdminFee}
                              className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold px-2 py-1.5 rounded-lg border border-rose-400 transition cursor-pointer"
                              title="Batal Biaya Admin"
                            >
                              ✕ Reset Admin
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setNumpadOpen(true)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-sky-200 font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 transition ml-auto cursor-pointer"
                          >
                            Keypad
                          </button>
                        </div>
                      </div>

                      {/* Notifikasi Pemasukan Biaya Admin Toko (Tanpa Kembalian Pelanggan) */}
                      {effectiveAdminFee > 0 && (
                        <div className="bg-amber-950/90 border-2 border-amber-400 p-2.5 rounded-xl space-y-1 text-white shadow-md animate-modal-pop">
                          <div className="flex items-center justify-between text-xs font-black text-amber-300">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Pemasukan Biaya Admin Toko:</span>
                            </span>
                            <span className="font-mono text-amber-300 font-black text-sm">
                              +{formatRupiah(effectiveAdminFee)}
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-100/90 leading-tight">
                            ✓ Biaya Admin direlakan pelanggan untuk toko, dicatat sebagai akun <strong>Pemasukan Biaya Admin</strong> (<strong>TIDAK MENYEBABKAN ADANYA KEMBALIAN PELANGGAN</strong>).
                          </p>
                        </div>
                      )}

                      {/* Input Catatan / No. Referensi / Nama Bank */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-sky-200">
                            Catatan / Nama Bank / No. Ref Transfer (Opsional)
                          </label>
                          <span className="text-[10px] text-slate-400">Contoh: Transfer BCA, BRI, ShopeePay</span>
                        </div>
                        <input
                          type="text"
                          placeholder="Contoh: Transfer BCA #12345 / QRIS GoPay / Mandiri Livin / Ref #xxxx"
                          value={paymentNotes}
                          onChange={e => setPaymentNotes(e.target.value)}
                          className="w-full px-3 py-2 bg-white text-slate-950 rounded-lg text-xs font-bold border-2 border-sky-300 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
                        />
                        {/* Quick Chips for Bank & E-Wallet Notes (Customized via Admin Setting) */}
                        {showBankQuickChips && bankQuickChipsList.trim() && (
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            {bankQuickChipsList
                              .split(',')
                              .map(s => s.trim())
                              .filter(Boolean)
                              .map((chip, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (!paymentNotes) setPaymentNotes(chip);
                                    else if (!paymentNotes.includes(chip)) setPaymentNotes(`${chip} - ${paymentNotes}`);
                                  }}
                                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-sky-200 px-2 py-0.5 rounded border border-slate-700 transition cursor-pointer"
                                >
                                  + {chip}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-sm sm:text-base font-black text-amber-300">Uang Diterima dari Pelanggan (Rp)</label>
                          <button
                            type="button"
                            onClick={() => setNumpadOpen(true)}
                            className="text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3 py-1 rounded-lg border-2 border-amber-300 flex items-center gap-1 shadow-xs transition cursor-pointer"
                          >
                            Keypad
                          </button>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-slate-950 font-black text-base">Rp</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={paidAmount}
                            onChange={e => setPaidAmount(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border-4 border-amber-400 rounded-xl text-slate-950 font-black focus:outline-none focus:ring-4 focus:ring-amber-400/50 transition text-xl shadow-inner"
                          />
                        </div>
                      </div>

                      {/* Quick cash suggestions */}
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {quickCashOptions.map(amt => (
                          <button
                            key={amt}
                            onClick={() => setPaidAmount(String(amt))}
                            style={{ backgroundColor: '#581c87', borderColor: '#7e22ce' }}
                            className="hover:bg-amber-400 hover:text-slate-950 text-white text-xs py-1.5 rounded-lg border-2 font-black transition cursor-pointer"
                          >
                            {amt >= 1000 ? `${amt / 1000}rb` : amt}
                          </button>
                        ))}
                        <button
                          onClick={() => setPaidAmount(String(totalAmount))}
                          className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs py-1.5 rounded-lg border-2 border-amber-300 font-black transition col-span-3 sm:col-span-2 cursor-pointer"
                        >
                          Uang Pas
                        </button>
                      </div>

                      {/* Tombol Biaya Admin & Beban Kas Toko untuk Pembayaran Tunai */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[11px] font-bold text-amber-300">Biaya Admin:</span>
                        <button
                          type="button"
                          onClick={() => handleAddAdminFee(500)}
                          className="text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 py-1 rounded-lg border border-amber-300 transition cursor-pointer"
                        >
                          + Rp 500 (Admin)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddAdminFee(1000)}
                          className="text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 py-1 rounded-lg border border-amber-300 transition cursor-pointer"
                        >
                          + Rp 1.000
                        </button>
                        {adminFeeAmount > 0 && (
                          <button
                            type="button"
                            onClick={handleResetAdminFee}
                            className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold px-2 py-1 rounded-lg border border-rose-400 transition cursor-pointer"
                          >
                            ✕ Reset
                          </button>
                        )}
                      </div>

                      {effectiveAdminFee > 0 && (
                        <div className="bg-amber-950/80 border border-amber-400/80 p-2 rounded-lg text-[11px] text-amber-200 font-bold flex items-center justify-between">
                          <span>✓ Biaya Admin: +{formatRupiah(effectiveAdminFee)} (Dicatat Pendapatan Toko, Tanpa Kembalian)</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-amber-200 mb-1">Catatan Transaksi Tunai (Opsional)</label>
                        <input
                          type="text"
                          placeholder="Contoh: Uang pas / Titip kembalian / Uang pecahan 100rb"
                          value={paymentNotes}
                          onChange={e => setPaymentNotes(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white text-slate-950 rounded-lg text-xs font-bold border border-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
                        />
                      </div>
                    </>
                  )}

                  {/* Change Result - Ultra High Contrast Bright Yellow Text (No Black Font) */}
                  <div className={`p-3.5 rounded-xl border-4 flex items-center justify-between shadow-xl ${
                    changeAmount >= 0
                      ? 'bg-slate-950 border-emerald-400 text-white'
                      : 'bg-slate-950 border-rose-500 text-white'
                  }`}>
                    <div>
                      <span className={`text-xs font-black uppercase tracking-wider block ${
                        changeAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {changeAmount >= 0 ? 'Kembalian Pelanggan' : 'Uang Kurang'}
                      </span>
                      <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                        changeAmount >= 0 ? 'text-amber-300' : 'text-rose-300'
                      }`}>
                        {changeAmount >= 0 ? formatRupiah(changeAmount) : `Kurang ${formatRupiah(Math.abs(changeAmount))}`}
                      </span>
                    </div>
                    {changeAmount >= 0 && (
                      <span className="bg-emerald-600 text-white text-xs sm:text-sm font-black px-3 py-1 rounded-lg border-2 border-emerald-300 shrink-0 shadow-sm">
                        LUNAS
                      </span>
                    )}
                  </div>
                </div>

                  {/* Checkout Button with 1cm gap above & bright eye-catching colors */}
                  <button
                    disabled={cart.length === 0 || numericPaid < totalAmount}
                    onClick={handleCheckout}
                    style={{ marginTop: '1cm' }}
                    className={`w-full py-4 sm:py-4.5 px-4 rounded-2xl font-black text-lg sm:text-xl shadow-2xl flex items-center justify-center space-x-2.5 transition-all border-4 ${
                      cart.length === 0 || numericPaid < totalAmount
                        ? 'bg-slate-300 text-slate-700 border-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-amber-300 ring-4 ring-emerald-400/60 shadow-emerald-500/50 cursor-pointer active:scale-98 tracking-wide animate-bounce'
                    }`}
                  >
                    <CheckCircle2 className="w-7 h-7 stroke-[3] text-slate-950 shrink-0" />
                    <span>Bayar dan Transaksi Selesai</span>
                  </button>
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
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Barcode className="w-6 h-6 text-rose-600" />
                  <span>Atur Barang / Jasa</span>
                </h2>
                <p className="text-xs text-slate-700 mt-0.5 font-bold">
                  Atur data barang & jasa toko, ubah harga, hapus, serta ekspor & impor file CSV.
                </p>
              </div>

              {/* Action Buttons: 1. Big "Tambah Barang / Jasa Baru", 2. Export CSV & Import CSV side by side */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto max-w-full overflow-hidden">
                <button
                  onClick={() => {
                    setEditingProductId(null);
                    setProductForm({ barcode: '', name: '', price: '' });
                    setIsModalScanning(false);
                    setProductModalOpen(true);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-xl font-black text-sm sm:text-base shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                  <span>Tambah Barang / Jasa Baru</span>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={exportProductsToCSV}
                    className="flex-1 sm:flex-none bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={() => setImportModalOpen(true)}
                    className="flex-1 sm:flex-none bg-indigo-700 hover:bg-indigo-800 text-white px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-white" />
                    <span>Import CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter / Search Bar (Ketik Huruf) */}
            <div className="bg-pink-100 border-2 border-pink-400 rounded-2xl p-4 mb-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-pink-950 flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-pink-700" />
                  <span>Saring & Filter Barang / Jasa (Ketik Nama / Barcode):</span>
                </label>
                {productSearch && (
                  <button
                    onClick={() => setProductSearch('')}
                    className="text-xs font-black text-rose-700 hover:underline"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-700 font-bold" />
                <input
                  type="text"
                  placeholder="Ketik huruf nama barang / jasa atau angka barcode untuk menyaring..."
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-white border-2 border-pink-500 rounded-xl text-slate-950 font-black text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
                {productSearch && (
                  <button
                    onClick={() => setProductSearch('')}
                    className="absolute right-3.5 top-3.5 text-slate-600 hover:text-slate-950 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="text-xs font-bold text-slate-800 pt-0.5">
                {productSearch.trim() ? (
                  <span>
                    Menampilkan <strong>{products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.barcode.toLowerCase().includes(productSearch.toLowerCase())).length}</strong> barang / jasa hasil saringan dari total {products.length} barang / jasa.
                  </span>
                ) : (
                  <span>
                    Menampilkan seluruh <strong>{products.length}</strong> barang / jasa. Ketik huruf nama barang / jasa di atas untuk menyaring.
                  </span>
                )}
              </p>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
                <p className="text-sm">Memuat data produk...</p>
              </div>
            ) : (() => {
              const displayProducts = products.filter(p =>
                p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                p.barcode.toLowerCase().includes(productSearch.toLowerCase())
              );

              if (displayProducts.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-6">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800 text-base">Tidak ada produk yang cocok dengan pencarian "{productSearch}"</p>
                    <p className="text-xs text-slate-500 mt-1">Coba ketik kata kunci huruf lain atau tekan tombol Reset Filter di atas.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Smartphone Layout (Vertical Cards - No Horizontal Scroll) */}
                  <div className="block md:hidden space-y-3">
                    {displayProducts.map(p => (
                      <div key={p.id} className="bg-white border-2 border-slate-300 rounded-2xl p-3.5 shadow-xs flex flex-col space-y-2.5">
                        {/* Line 1: Nama Barang */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Baris 1: Nama Barang</span>
                          <h3 className="font-black text-slate-950 text-base sm:text-lg leading-snug break-words">
                            {p.name}
                          </h3>
                        </div>

                        {/* Line 2: Barcode */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Baris 2: Barcode</span>
                          <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300 inline-block">
                            {p.barcode}
                          </span>
                        </div>

                        {/* Line 3: Harga */}
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Baris 3: Harga Jual</span>
                          <span className="text-lg font-black text-rose-700 font-mono">
                            {formatRupiah(p.price)}
                          </span>
                        </div>

                        {/* Line 4: Tombol Edit & Hapus */}
                        <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                          <button
                            onClick={() => openEditProduct(p)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition"
                          >
                            <Edit className="w-4 h-4 text-slate-700" />
                            <span>Edit Barang</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-red-200 transition"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                          <th className="py-3 px-4">#ID</th>
                          <th className="py-3 px-4">Barcode / QR</th>
                          <th className="py-3 px-4">Nama Barang</th>
                          <th className="py-3 px-4">Harga (IDR)</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {displayProducts.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 font-mono text-slate-500">{p.id}</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{p.barcode}</td>
                            <td className="py-3.5 px-4 font-black text-slate-950">{p.name}</td>
                            <td className="py-3.5 px-4 font-black text-rose-700 font-mono">{formatRupiah(p.price)}</td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              <button
                                onClick={() => openEditProduct(p)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 p-2 rounded-lg transition inline-flex items-center border border-slate-300"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition inline-flex items-center border border-red-200"
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
                </div>
              );
            })()}
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
            {/* Daily Sales Summary Card with Explicit Cash vs QRIS Split */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 rounded-2xl shadow-xl p-5 sm:p-6 text-white border-2 border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-300 px-3 py-0.5 rounded-full text-xs font-black border border-rose-500/30 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Laporan Kas Masuk Hari Ini ({todayDateStr})</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">Ringkasan Penjualan Hari Ini</h2>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400 block font-semibold">Total Omset Masuk Hari Ini</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">{formatRupiah(todayRevenue)}</span>
                  <span className="text-xs text-slate-400 block mt-0.5 font-medium">({todayTransactions.length} Struk • {todayItemsCount} Pcs barang)</span>
                </div>
              </div>

              {/* 2 Big Highlight Cards: Uang Fisik Kasir vs QRIS Masuk Kasir */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Uang Fisik Masuk Kasir */}
                <div className="bg-emerald-950/80 p-4 rounded-xl border-2 border-emerald-500 shadow-md flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-400">
                        <Banknote className="w-5 h-5" />
                      </span>
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-300 block">
                          Uang Fisik Masuk Kasir (Tunai)
                        </span>
                        <span className="text-[11px] text-emerald-200/80 font-medium">Wajib ada di laci uang kasir</span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <h4 className="text-2xl font-black text-emerald-300 font-mono tracking-tight">
                        {formatRupiah(todayCashRevenue)}
                      </h4>
                      <p className="text-xs text-emerald-200 mt-1 font-semibold">
                        {todayCashTransactions.length} Struk Tunai • {todayRevenue > 0 ? Math.round((todayCashRevenue / todayRevenue) * 100) : 0}% dari total omset
                      </p>
                    </div>
                  </div>
                  <span className="bg-emerald-400 text-slate-950 font-black text-[11px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs shrink-0">
                    💵 Uang Fisik
                  </span>
                </div>

                {/* 2. QRIS & Transfer Bank Masuk Kasir */}
                <div className="bg-slate-900 p-4 rounded-xl border-2 border-sky-400 shadow-md flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-2 bg-sky-500/20 border border-sky-500/40 rounded-lg text-sky-300">
                        <QrCode className="w-5 h-5" />
                      </span>
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-sky-300 block">
                          QRIS & Transfer Bank (Non-Tunai)
                        </span>
                        <span className="text-[11px] text-sky-200/80 font-medium">Masuk rekening bank / e-wallet toko</span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <h4 className="text-2xl font-black text-amber-300 font-mono tracking-tight">
                        {formatRupiah(todayQrisRevenue)}
                      </h4>
                      <p className="text-xs text-sky-200 mt-1 font-semibold">
                        {todayQrisTransactions.length} Struk Non-Tunai • {todayRevenue > 0 ? Math.round((todayQrisRevenue / todayRevenue) * 100) : 0}% dari total omset
                      </p>
                    </div>
                  </div>
                  <span className="bg-sky-400 text-slate-950 font-black text-[11px] px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs shrink-0">
                    📱 Rekening Toko
                  </span>
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
                    Periode: {basePeriodTransactions.length} Struk • {formatRupiah(periodRevenue)}
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

            {/* Rekapitulasi Arus Uang Masuk per Periode (Uang Fisik Kasir vs QRIS Masuk Kasir) */}
            <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-black text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Periode: {getReportPeriodLabel()}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">
                    Rekapitulasi Arus Uang Masuk per Periode
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pemisahan uang fisik (tunai di laci kasir) dengan uang non-tunai (QRIS masuk rekening).
                  </p>
                </div>

                {/* Sub-Filter Metode Pembayaran */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setReportPaymentFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      reportPaymentFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua ({basePeriodTransactions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportPaymentFilter('TUNAI')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                      reportPaymentFilter === 'TUNAI'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Uang Fisik ({periodCashTransactions.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportPaymentFilter('QRIS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                      reportPaymentFilter === 'QRIS'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-sky-700 hover:text-sky-900'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>QRIS & Transfer ({periodQrisTransactions.length})</span>
                  </button>
                </div>
              </div>

              {/* 3 Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Total Omset Keseluruhan */}
                <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-700 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                    <span>TOTAL UANG MASUK</span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[11px]">100%</span>
                  </div>
                  <h4 className="text-2xl font-black text-amber-300 font-mono">
                    {formatRupiah(periodRevenue)}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {basePeriodTransactions.length} Struk Transaksi • {periodItemsCount} Pcs barang
                  </p>
                </div>

                {/* 2. Uang Fisik Kasir (Tunai) */}
                <div className="bg-emerald-50 text-emerald-950 p-4 rounded-xl border-2 border-emerald-300 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-800 flex items-center gap-1">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      UANG FISIK KASIR (TUNAI)
                    </span>
                    <span className="bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded text-[11px]">
                      {periodRevenue > 0 ? Math.round((periodCashRevenue / periodRevenue) * 100) : 0}%
                    </span>
                  </div>
                  <h4 className="text-2xl font-black text-emerald-700 font-mono">
                    {formatRupiah(periodCashRevenue)}
                  </h4>
                  <p className="text-xs text-emerald-800 font-medium">
                    {periodCashTransactions.length} Struk • <em>Wajib ada di laci kasir fisik</em>
                  </p>
                </div>

                {/* 3. QRIS & Transfer Bank Masuk Kasir (Non-Tunai) */}
                <div className="bg-sky-50 text-sky-950 p-4 rounded-xl border-2 border-sky-300 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-sky-800 flex items-center gap-1">
                      <QrCode className="w-4 h-4 text-sky-600" />
                      QRIS & TRANSFER BANK
                    </span>
                    <span className="bg-sky-200 text-sky-900 font-bold px-2 py-0.5 rounded text-[11px]">
                      {periodRevenue > 0 ? Math.round((periodQrisRevenue / periodRevenue) * 100) : 0}%
                    </span>
                  </div>
                  <h4 className="text-2xl font-black text-sky-700 font-mono">
                    {formatRupiah(periodQrisRevenue)}
                  </h4>
                  <p className="text-xs text-sky-800 font-medium">
                    {periodQrisTransactions.length} Struk • <em>Masuk mutasi / rekening bank toko</em>
                  </p>
                </div>
              </div>

              {/* Visual Distribution Progress Bar */}
              {periodRevenue > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Fisik: {formatRupiah(periodCashRevenue)} ({((periodCashRevenue / periodRevenue) * 100).toFixed(1)}%)
                    </span>
                    <span className="text-sky-700 flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                      QRIS/Transfer: {formatRupiah(periodQrisRevenue)} ({((periodQrisRevenue / periodRevenue) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${(periodCashRevenue / periodRevenue) * 100}%` }}
                      className="bg-emerald-500 transition-all duration-500"
                      title="Uang Fisik (Tunai)"
                    />
                    <div
                      style={{ width: `${(periodQrisRevenue / periodRevenue) * 100}%` }}
                      className="bg-sky-500 transition-all duration-500"
                      title="QRIS & Transfer Bank (Non-Tunai)"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* REKAPITULASI AKUN KEUANGAN & LABA BERSIH TOKO (ACCOUNTING BREAKDOWN) */}
            <div className="bg-white rounded-2xl shadow-sm border-2 border-slate-200 p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full mb-1">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Laporan Akuntansi & Arus Kas Toko</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">
                    Rekapitulasi Akun Keuangan & Laba Bersih ({getReportPeriodLabel()})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rincian akun pendapatan (penjualan, biaya admin, pajak), potongan diskon, dan beban pengeluaran kas toko.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(true)}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Catat Pengeluaran Kas</span>
                </button>
              </div>

              {/* Table / Grid Breakdown Akun Keuangan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Kolom Kiri: Akun Pendapatan & Omset Penjualan */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>1. Akun Pendapatan & Omset Penjualan</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-600 font-medium">Penjualan Produk Kotor (Subtotal)</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(periodSubtotal)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-700 font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>(+) Pemasukan Biaya Admin Toko</span>
                      </span>
                      <span className="font-mono font-black text-amber-600">+{formatRupiah(periodAdminFees)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-700 font-medium">(+) Pemasukan Pemungutan Pajak (PPN/PB1)</span>
                      <span className="font-mono font-bold text-slate-800">+{formatRupiah(periodTaxes)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                      <span className="text-rose-700 font-medium">(-) Biaya Diskon Toko (Potongan Penjualan)</span>
                      <span className="font-mono font-bold text-rose-600">-{formatRupiah(periodDiscounts)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-sm font-black bg-slate-200/70 p-2.5 rounded-lg border border-slate-300">
                      <span className="text-slate-900">(=) TOTAL OMSET KOTOR TOKO</span>
                      <span className="font-mono text-emerald-700">{formatRupiah(periodRevenue)}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    * Biaya Admin (+Rp 500 / +Rp 1.000) yang direlakan customer dicatat langsung ke akun <strong>Pemasukan Biaya Admin</strong> dan tidak menghasilkan kembalian.
                  </p>
                </div>

                {/* Kolom Kanan: Akun Beban Pengeluaran Kas & Laba Bersih */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-rose-600" />
                    <span>2. Akun Beban Pengeluaran Kas Toko</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-600 font-medium">Total Omset Kotor Toko</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(periodRevenue)}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-slate-200">
                      <span className="text-rose-700 font-bold flex items-center gap-1">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                        <span>(-) Total Beban Pengeluaran Kas Toko</span>
                      </span>
                      <span className="font-mono font-black text-rose-600">-{formatRupiah(periodTotalExpenses)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-sm font-black bg-emerald-100 p-2.5 rounded-lg border-2 border-emerald-400">
                      <span className="text-emerald-950">(=) PEMASUKAN BERSIH TOKO (NET)</span>
                      <span className="font-mono text-emerald-800 text-base">{formatRupiah(periodNetRevenue)}</span>
                    </div>

                    {/* Sisa Saldo Uang Fisik Kas di Laci */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-xs">
                      <div>
                        <span className="font-black text-amber-900 block flex items-center gap-1">
                          <Banknote className="w-3.5 h-3.5 text-amber-700" />
                          <span>Sisa Saldo Kas Fisik di Laci Kasir:</span>
                        </span>
                        <span className="text-[10px] text-amber-800">
                          Uang Fisik ({formatRupiah(periodCashRevenue)}) dikurangi Pengeluaran Kas ({formatRupiah(periodTotalExpenses)})
                        </span>
                      </div>
                      <span className="font-mono font-black text-amber-900 text-sm">
                        {formatRupiah(periodCashInDrawer)}
                      </span>
                    </div>
                  </div>

                  {/* Kategori Pengeluaran Toko */}
                  {periodExpenses.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Rincian Kategori Pengeluaran Kas Toko:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(new Set(periodExpenses.map(e => e.category))).map(cat => {
                          const catTotal = periodExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
                          return (
                            <span key={cat} className="text-[10px] bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 font-medium">
                              <strong>{cat}</strong>: <span className="text-rose-600 font-bold">{formatRupiah(catTotal)}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transactions History List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Daftar Struk Transaksi Sesuai Filter</h2>
                  <p className="text-xs text-slate-500 mt-1">Daftar transaksi kasir yang cocok dengan filter tanggal, produk, dan metode bayar.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full font-semibold">
                    Ditampilkan: {filteredTransactions.length} dari {transactions.length} Transaksi
                  </span>
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <Clock className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="font-medium text-slate-600">Tidak ada transaksi yang cocok dengan filter</p>
                  <p className="text-xs text-slate-400 mt-1">Coba ubah rentang waktu, kata kunci pencarian, atau filter metode pembayaran.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTransactions.map(tx => {
                    const isQris = (tx.payment_method || '').toUpperCase() === 'QRIS';
                    return (
                      <div key={tx.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-mono font-bold text-rose-600 text-sm">{tx.invoice_no}</span>
                            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">Sukses</span>
                            {isQris ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black bg-sky-100 text-sky-900 border border-sky-300 px-2.5 py-0.5 rounded-full">
                                <QrCode className="w-3 h-3 text-sky-700" />
                                QRIS / Transfer
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                                <Banknote className="w-3 h-3 text-emerald-700" />
                                Uang Fisik (Tunai)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Waktu: {new Date(tx.created_at).toLocaleString('id-ID')} • Kasir: {tx.cashier_name}
                          </p>
                          {tx.notes && (
                            <p className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md mt-1 font-medium inline-block">
                              📝 {isQris ? 'Ref / Catatan: ' : 'Catatan: '}<span className="font-bold">{tx.notes}</span>
                            </p>
                          )}
                          <div className="text-xs text-slate-600 mt-2">
                            {tx.items.length} item: {tx.items.map(i => `${i.product_name} (${i.quantity}x)`).join(', ')}
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end space-x-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                          <div className="text-right">
                            <span className="text-xs text-slate-500 block">Total Belanja</span>
                            <span className="text-lg font-black text-slate-900">{formatRupiah(tx.total_amount)}</span>
                            {isQris && tx.paid_amount > tx.total_amount && (
                              <span className="text-[11px] text-amber-700 font-bold block">
                                Diterima: {formatRupiah(tx.paid_amount)} (+{formatRupiah(tx.paid_amount - tx.total_amount)})
                              </span>
                            )}
                            <span className={`text-[11px] font-bold block ${
                              isQris ? 'text-sky-700' : 'text-emerald-700'
                            }`}>
                              {isQris ? '📱 Masuk Rekening Toko' : '💵 Uang Fisik Laci'}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setCompletedTx(tx);
                              setShowReceiptModal(true);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak Struk</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PENGELUARAN KAS TOKO (BEBAN OPERASIONAL & KAS KELUAR - KASIR & ADMIN) */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            {/* Header & Quick Action */}
            <div className="bg-gradient-to-br from-slate-900 via-rose-950 to-slate-950 rounded-2xl p-6 text-white border-2 border-rose-900/60 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-900/40 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-0.5 rounded-full text-xs font-black mb-1">
                    <Wallet className="w-3.5 h-3.5 text-rose-400" />
                    <span>Beban Operasional & Pengeluaran Toko</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    Pengeluaran Kas Toko
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Mencatat pengeluaran uang fisik kasir (uang sampah, biaya listrik, makan/minum, donasi, prive tunai, dll) yang mengurangi pemasukan toko.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpenseModalOpen(true)}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-black px-4 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 text-sm cursor-pointer border border-rose-400"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Catat Pengeluaran Kas</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportExpensesToCSV}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Status Kasir Bertugas & KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-slate-900/90 border border-slate-700 p-3.5 rounded-xl">
                  <span className="text-[11px] font-bold text-slate-400 block uppercase">Kasir Bertugas Saat Ini</span>
                  <div className="text-base font-black text-amber-300 flex items-center gap-1.5 mt-0.5">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>{currentUser?.name || cashierName}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 rounded-full font-bold">Otomatis</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Role: {currentUser?.role || 'KASIR'}</span>
                </div>

                <div className="bg-rose-950/80 border border-rose-800 p-3.5 rounded-xl">
                  <span className="text-[11px] font-bold text-rose-300 block uppercase">Total Beban Periode Terpilih</span>
                  <div className="text-xl font-black text-rose-400 font-mono mt-0.5">
                    {formatRupiah(filteredExpensesTotal)}
                  </div>
                  <span className="text-[10px] text-rose-200/80">{filteredExpensesList.length} Catatan Pengeluaran</span>
                </div>

                <div className="bg-emerald-950/80 border border-emerald-800 p-3.5 rounded-xl">
                  <span className="text-[11px] font-bold text-emerald-300 block uppercase">Sisa Fisik di Laci Kasir</span>
                  <div className="text-xl font-black text-emerald-300 font-mono mt-0.5">
                    {formatRupiah(periodCashInDrawer)}
                  </div>
                  <span className="text-[10px] text-emerald-200/80">Uang Fisik Masuk ({formatRupiah(periodCashRevenue)}) - Pengeluaran</span>
                </div>
              </div>
            </div>

            {/* Controls Filter Pengeluaran */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Filter Rentang Waktu */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Filter Waktu</label>
                  <select
                    value={expensePeriodFilter}
                    onChange={e => setExpensePeriodFilter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="today_yesterday">Hari Ini & Kemarin</option>
                    <option value="today">Hari Ini Saja ({todayDateStr})</option>
                    <option value="yesterday">Kemarin Saja ({yesterdayDateStr})</option>
                    <option value="7">7 Hari Terakhir</option>
                    <option value="30">30 Hari Terakhir</option>
                    <option value="all">Semua Waktu</option>
                  </select>
                </div>

                {/* 2. Filter Kategori */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Beban</label>
                  <select
                    value={expenseCategoryFilter}
                    onChange={e => setExpenseCategoryFilter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="all">Semua Kategori</option>
                    <option value="Uang Sampah">🗑️ Uang Sampah</option>
                    <option value="Listrik / Air">⚡ Listrik & Air</option>
                    <option value="Makan & Minum">🍱 Makan & Minum</option>
                    <option value="Donasi">🤲 Donasi / Sumbangan</option>
                    <option value="Prive Tunai">💼 Prive Tunai</option>
                    <option value="Operasional Toko">📦 Operasional Toko</option>
                    <option value="Lainnya">📝 Lainnya</option>
                  </select>
                </div>

                {/* 3. Cari Catatan atau Kasir */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cari Keterangan / Kasir</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari keterangan / nama kasir..."
                      value={expenseSearch}
                      onChange={e => setExpenseSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* List / Table of Expenses */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>Daftar Pengeluaran Kas Sesuai Filter</span>
                  <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                    {filteredExpensesList.length} Catatan
                  </span>
                </h3>
                <span className="text-xs font-mono font-bold text-slate-500">
                  Total: <strong className="text-rose-600 font-mono text-sm">{formatRupiah(filteredExpensesTotal)}</strong>
                </span>
              </div>

              {filteredExpensesList.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Wallet className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="font-medium text-slate-600">Belum ada catatan pengeluaran kas pada filter ini.</p>
                  <p className="text-xs text-slate-400">
                    Klik tombol "<strong>+ Catat Pengeluaran Kas</strong>" untuk mulai mencatat biaya sampah, makan, listrik, atau donasi.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredExpensesList.map(exp => (
                    <div
                      key={exp.id}
                      className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-md">
                            {exp.category}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {new Date(exp.created_at).toLocaleString('id-ID')}
                          </span>
                          <span className="text-xs text-slate-600 flex items-center gap-1 font-semibold">
                            <User className="w-3 h-3 text-emerald-600" />
                            <span>Kasir: {exp.cashier_name}</span>
                          </span>
                        </div>

                        {exp.notes && (
                          <p className="text-xs text-slate-700 font-medium bg-white px-2.5 py-1 rounded-md border border-slate-200 inline-block">
                            📝 {exp.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Nominal Kas Keluar</span>
                          <span className="text-base font-black text-rose-600 font-mono">
                            -{formatRupiah(exp.amount)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus Catatan Pengeluaran"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CLOUDFLARE DEPLOYMENT GUIDE & PWA HELP */}
        {activeTab === 'cloudflare' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
            {/* PWA INSTALLATION & GUIDE BANNER */}
            <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-slate-900 rounded-2xl shadow-lg p-6 text-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-500/40 pb-4">
                <div>
                  <div className="inline-flex items-center space-x-1.5 bg-rose-500/30 border border-rose-400/40 px-3 py-1 rounded-full text-xs font-bold mb-2 text-rose-200">
                    <Smartphone className="w-3.5 h-3.5 text-rose-300" />
                    <span>Aplikasi Kasir Siap Offline (PWA)</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">Opsi & Petunjuk Cara Install PWA TokoBazar</h2>
                  <p className="text-xs sm:text-sm text-rose-100 mt-1 max-w-xl">
                    Install TokoBazar di HP Android, iPhone, atau Komputer untuk membukanya secara langsung dari Layar Utama tanpa perlu mengetikkan URL web.
                  </p>
                </div>
                <div className="shrink-0">
                  <PWAInstallButton className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-3 text-sm rounded-xl shadow-lg transition border-2 border-amber-300" />
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div className="bg-slate-900/80 border border-slate-700 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <Smartphone className="w-4 h-4" />
                    <span>📱 HP Android (Google Chrome)</span>
                  </div>
                  <ol className="text-xs text-slate-200 space-y-1.5 list-decimal pl-4 leading-relaxed font-medium">
                    <li>Buka browser Google Chrome di HP Anda.</li>
                    <li>Ketuk ikon <strong>titik tiga (⋮)</strong> di pojok kanan atas.</li>
                    <li>Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</li>
                    <li>Ketuk <strong>"Install"</strong>. Ikon TokoBazar akan muncul di layar HP Anda.</li>
                  </ol>
                </div>

                <div className="bg-slate-900/80 border border-slate-700 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <Smartphone className="w-4 h-4" />
                    <span>🍎 iPhone / iPad (Safari)</span>
                  </div>
                  <ol className="text-xs text-slate-200 space-y-1.5 list-decimal pl-4 leading-relaxed font-medium">
                    <li>Buka aplikasi Safari di iPhone / iPad Anda.</li>
                    <li>Ketuk tombol <strong>Bagikan (Share)</strong> di bagian bawah layar.</li>
                    <li>Geser ke bawah dan pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.</li>
                    <li>Ketuk <strong>"Tambah"</strong> di pojok kanan atas.</li>
                  </ol>
                </div>

                <div className="bg-slate-900/80 border border-slate-700 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>💻 Laptop / PC (Chrome / Edge)</span>
                  </div>
                  <ol className="text-xs text-slate-200 space-y-1.5 list-decimal pl-4 leading-relaxed font-medium">
                    <li>Tekan tombol kuning <strong>"Install Aplikasi Kasir (PWA)"</strong> di atas.</li>
                    <li>Atau klik ikon <strong>Install ⊕</strong> yang muncul di kanan bilah alamat (URL).</li>
                    <li>Klik <strong>"Install"</strong> untuk menjadikan aplikasi desktop resmi.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Security & Authentication Documentation Card */}
            <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-5 text-white space-y-4 shadow-xl">
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                <div className="bg-rose-500/20 text-rose-400 p-2.5 rounded-xl border border-rose-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-rose-300">
                    🔒 Keamanan Sistem: Sesi Login & Anti-Brute Force
                  </h3>
                  <p className="text-xs text-slate-400">
                    Dokumentasi perlindungan akun kasir & admin serta aturan sesi kerja digital.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Sesi Login */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>⏱️ Masa Berlaku Sesi Login (8 Jam / 480 Menit)</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4 leading-relaxed font-medium">
                    <li>
                      <strong>Durasi Aktif (8 Jam / 480 Menit):</strong> Disesuaikan dengan 1 shift standar jam kerja kasir toko. Selama masih dalam rentang 8 jam, kasir/admin tidak perlu mengulang login jika aplikasi ditutup atau di-refresh.
                    </li>
                    <li>
                      <strong>Otomatis Kadaluarsa (Auto Expire):</strong> Setelah 8 jam berlalu sejak waktu login, sesi akan secara otomatis hangus demi keamanan data toko, dan sistem akan meminta login ulang.
                    </li>
                    <li>
                      <strong>Manual Logout:</strong> Kasir/Admin juga dapat mengakhiri sesi kapan saja melalui tombol "Keluar / Logout Akun" di MENU ▾.
                    </li>
                  </ul>
                </div>

                {/* 2. Anti Brute Force */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <Key className="w-4 h-4 text-rose-400" />
                    <span>🛡️ Sistem Perlindungan Anti-Brute Force</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4 leading-relaxed font-medium">
                    <li>
                      <strong>Batas Gagal Login (Max 5x):</strong> Pengguna diberikan kesempatan salah mengisikan password/username maksimal 5 kali. Setiap kali salah, indikator jumlah kesalahan akan muncul di layar.
                    </li>
                    <li>
                      <strong>Penguncian Otomatis (Lockout 60 Detik):</strong> Pada percobaan gagal ke-5, sistem secara otomatis MENGUNCI SEMENTARA AKSI LOGIN SELAMA 60 DETIK. Formulir input dan tombol login dinonaktifkan dengan timer hitung mundur.
                    </li>
                    <li>
                      <strong>Perlindungan Lapis Ganda (Dual-Layer):</strong>
                      <br />• <em>Frontend UI Layer:</em> Memblokir interaksi tombol login di browser.
                      <br />• <em>Backend Server API Layer (Rate Limiter):</em> Server API memblokir permintaan login berulang dari IP yang sama (HTTP 429).
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Automatic D1 Database Bootstrap Card */}
            <div className="bg-emerald-950 border-3 border-emerald-500 rounded-2xl p-5 text-white space-y-3 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center space-x-1.5 bg-emerald-800 text-emerald-200 px-3 py-1 rounded-full text-xs font-black mb-1.5">
                    <Database className="w-3.5 h-3.5" />
                    <span>Fitur Bootstrap D1 Otomatis (1 Klik)</span>
                  </div>
                  <h3 className="text-lg font-black text-amber-300">
                    ⚡ Inisialisasi / Bootstrap Tabel D1 Otomatis
                  </h3>
                  <p className="text-xs text-slate-200 mt-1 max-w-xl">
                    Jika database Cloudflare D1 Anda masih kosong atau belum memiliki kolom <code className="bg-slate-900 text-emerald-300 px-1 py-0.5 rounded font-mono">payment_method</code> (QRIS / Tunai) dan <code className="bg-slate-900 text-emerald-300 px-1 py-0.5 rounded font-mono">notes</code> (Catatan / ID Ref QRIS), klik tombol ini untuk menjalankan inisialisasi tabel dan migrasi kolom QRIS otomatis tanpa menghapus data produk Anda.
                  </p>
                </div>
                <button
                  onClick={handleBootstrapD1}
                  disabled={bootstrappingD1}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-3 text-sm rounded-xl shadow-lg transition border-2 border-amber-300 shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {bootstrappingD1 ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Membuat / Migrasi Tabel D1...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                      <span>⚡ Bootstrap Database D1 (Termasuk QRIS & Catatan)</span>
                    </>
                  )}
                </button>
              </div>
              {bootstrapMessage && (
                <div className={`p-3 rounded-xl border text-xs font-black ${
                  bootstrapMessage.startsWith('Error') || bootstrapMessage.startsWith('Gagal')
                    ? 'bg-red-900/80 border-red-500 text-red-200'
                    : 'bg-emerald-900/80 border-emerald-400 text-emerald-200'
                }`}>
                  {bootstrapMessage}
                </div>
              )}
            </div>

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

            {/* 4. Preferensi Printer Thermal (Ukuran Kertas 58mm / 80mm) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Printer className="w-5 h-5 text-rose-600" />
                    <span>Preferensi Printer Thermal & Ukuran Kertas Roll</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Sesuaikan lebar cetakan struk otomatis dengan jenis mesin printer thermal kasir Anda.
                  </p>
                </div>
                <span className="text-xs bg-rose-50 text-rose-700 font-bold px-3 py-1 rounded-full border border-rose-200 self-start sm:self-auto">
                  Mode Aktif: {thermalPaperWidth}
                </span>
              </div>

              {/* Radio Selection: 58mm vs 80mm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div
                  onClick={() => {
                    setThermalPaperWidth('58mm');
                    localStorage.setItem('tokobazar_thermal_paper_width', '58mm');
                    showAlert('Ukuran kertas printer thermal diset ke 58mm (Portabel / Mini)', 'success');
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start space-x-3 ${
                    thermalPaperWidth === '58mm'
                      ? 'border-rose-600 bg-rose-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="thermalWidthSetting"
                    checked={thermalPaperWidth === '58mm'}
                    onChange={() => {}}
                    className="mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <span>🧾 Kertas Roll 58mm (Portabel / Mini)</span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">Paling Populer</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Ukuran kertas kasir portabel Bluetooth (58mm / 32 karakter per baris). Hemat kertas dan pas untuk printer kasir mini mobile.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setThermalPaperWidth('80mm');
                    localStorage.setItem('tokobazar_thermal_paper_width', '80mm');
                    showAlert('Ukuran kertas printer thermal diset ke 80mm (Desktop / Standar)', 'info');
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start space-x-3 ${
                    thermalPaperWidth === '80mm'
                      ? 'border-rose-600 bg-rose-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="thermalWidthSetting"
                    checked={thermalPaperWidth === '80mm'}
                    onChange={() => {}}
                    className="mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      🧾 Kertas Roll 80mm (Desktop / Standar Kasir)
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Ukuran kertas kasir standar supermarket / restoran (80mm / 48 karakter per baris). Tulisan lebih lebar dan lega.
                    </p>
                  </div>
                </div>
              </div>

              {/* Test Print Sample Receipt Action */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  <span className="font-bold block text-slate-800">🧪 Tes Cetak Printer (Sample Receipt)</span>
                  <span>Uji coba koneksi dan kerapihan hasil cetakan langsung ke printer thermal Anda.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const sampleTx: Transaction = {
                      id: 999999,
                      invoice_no: 'INV/TEST/' + Date.now().toString().slice(-4),
                      subtotal_amount: 50000,
                      discount_amount: 5000,
                      tax_amount: 0,
                      total_amount: 45000,
                      paid_amount: 50000,
                      change_amount: 5000,
                      cashier_name: cashierName || 'Kasir Penguji',
                      created_at: new Date().toISOString(),
                      items: [
                        { product_name: 'Minyak Goreng 1L (Tes)', price: 20000, quantity: 1, subtotal: 20000 },
                        { product_name: 'Beras Premium 2kg (Tes)', price: 30000, quantity: 1, subtotal: 30000 }
                      ]
                    };
                    setCompletedTx(sampleTx);
                    setShowReceiptModal(true);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition shadow-sm self-start sm:self-auto cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Coba Cetak Struk Sampel ({thermalPaperWidth})</span>
                </button>
              </div>
            </div>

            {/* 5. Status Baterai Perangkat & Sensor Otomatis */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <BatteryCharging className="w-5 h-5 text-emerald-600" />
                    <span>Pemantau Baterai HP & Mesin Kasir Mobile</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Sistem mendeteksi tingkat daya baterai secara real-time untuk mencegah HP mati mendadak saat transaksi jam sibuk.
                  </p>
                </div>
                {batteryLevel !== null && (
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${
                    isCharging
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : batteryLevel <= 15
                      ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                      : 'bg-slate-100 text-slate-800 border-slate-200'
                  }`}>
                    {isCharging ? '⚡ Status: Sedang Diisi Daya' : `🔋 Daya Sisa: ${batteryLevel}%`}
                  </span>
                )}
              </div>

              {batterySupported ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
                    <span className="text-xs text-slate-500 font-medium block">Kapasitas Baterai Saat Ini</span>
                    <span className="text-xl font-black text-slate-900 font-mono">
                      {batteryLevel !== null ? `${batteryLevel}%` : 'Memuat...'}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
                    <span className="text-xs text-slate-500 font-medium block">Status Pengisian Daya</span>
                    <span className={`text-sm font-bold block ${isCharging ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {isCharging ? '⚡ Terhubung ke Charger' : '🔋 Menggunakan Baterai'}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1">
                    <span className="text-xs text-slate-500 font-medium block">Aturan Peringatan Dini</span>
                    <span className="text-xs font-bold text-red-600 block">
                      ⚠️ Warning muncul jika &le; 15%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <span>ℹ️ Peramban browser ini tidak mendukung Battery Status API, namun pemantauan daya tetap aman.</span>
                </div>
              )}

              {/* Simulation Action */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                <div className="text-xs text-slate-600">
                  <span className="font-bold block text-slate-800">🧪 Simulasi Peringatan Baterai Lemah (&le;15%)</span>
                  <span>Uji tampilan spanduk merah peringatan baterai lemah untuk kasir.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBatteryLevel(12);
                    setIsCharging(false);
                    setDismissBatteryWarning(false);
                    showAlert('Simulasi baterai 12% aktif. Buka menu Hitung untuk melihat spanduk warning merah.', 'info');
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-xs cursor-pointer shrink-0"
                >
                  Tes Warning (12%)
                </button>
              </div>
            </div>

            {/* 6. Pengaturan Tombol Pintas Catatan Bank & E-Wallet (Kustomisasi Teks Comma-Separated) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-indigo-600" />
                  <span>Tombol Pintas Catatan Bank & E-Wallet (QRIS / Transfer)</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Atur keberadaan dan kustomisasi teks tombol pintas bank/e-wallet untuk memudahkan catatan transaksi kasir.
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition select-none">
                  <input
                    type="checkbox"
                    checked={showBankQuickChips}
                    onChange={(e) => {
                      setShowBankQuickChips(e.target.checked);
                      localStorage.setItem('tokobazar_show_quick_chips', String(e.target.checked));
                      showAlert(e.target.checked ? '✓ Tombol pintas Bank & E-Wallet DIAKTIFKAN di kasir' : 'ℹ️ Tombol pintas Bank & E-Wallet DISEMBUNYIKAN dari kasir', 'info');
                    }}
                    className="w-5 h-5 mt-0.5 accent-rose-600 cursor-pointer rounded shrink-0"
                  />
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">
                      Tampilkan Tombol Cepat Bank & E-Wallet di Panel Kasir POS
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Memudahkan kasir menempelkan nama bank / QRIS ke catatan transaksi hanya dengan 1 kali ketuk.
                    </p>
                  </div>
                </label>

                {showBankQuickChips && (
                  <div className="bg-slate-50 border-2 border-indigo-200 rounded-2xl p-4 space-y-3 shadow-xs">
                    <div>
                      <label className="block text-xs font-bold text-indigo-950 uppercase mb-1">
                        Daftar Tombol Pintas Custom (Pisahkan Dengan Tanda Koma):
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: QRIS DANA, QRIS ShopeePay, Transfer Bank BRI"
                        value={bankQuickChipsList}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBankQuickChipsList(val);
                          localStorage.setItem('tokobazar_bank_chips_list', val);
                        }}
                        className="w-full px-3.5 py-2.5 bg-white border-2 border-indigo-400 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <p className="text-[11px] text-slate-600 font-medium max-w-md">
                        💡 Admin bebas menuliskan nama-nama bank atau QRIS dipisahkan koma. Tombol di layar kasir akan otomatis terbentuk sesuai daftar di atas.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setBankQuickChipsList(DEFAULT_BANK_CHIPS);
                          localStorage.setItem('tokobazar_bank_chips_list', DEFAULT_BANK_CHIPS);
                          showAlert('Daftar tombol pintas dikembalikan ke standar awal', 'info');
                        }}
                        className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-950 font-bold px-3 py-1.5 rounded-lg border border-indigo-300 transition cursor-pointer"
                      >
                        Reset Standar
                      </button>
                    </div>

                    {/* Live Preview Chips */}
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Preview Tombol di Layar Kasir:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {bankQuickChipsList
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean)
                          .map((chip, idx) => (
                            <span key={idx} className="text-[11px] bg-slate-800 text-sky-200 px-2.5 py-1 rounded-md border border-slate-700 font-mono font-bold shadow-2xs">
                              + {chip}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 7. Pengaturan Margin & Lebar Layar Smartphone */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-rose-600" />
                  <span>Margin & Lebar Tampilan Layar Smartphone</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Pilih gaya margin samping pada layar HP yang sempit agar ruang kerja kasir maksimal atau rapi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode 1: Default Margin */}
                <div
                  onClick={() => {
                    setMobileMarginMode('default');
                    localStorage.setItem('tokobazar_mobile_margin_mode', 'default');
                    showAlert('Mode tampilan diset ke: Default Margin (Dengan Padding Samping)', 'info');
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start space-x-3 select-none ${
                    mobileMarginMode === 'default'
                      ? 'border-rose-600 bg-rose-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mobileMarginSetting"
                    checked={mobileMarginMode === 'default'}
                    onChange={() => {}}
                    className="mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      📱 Default Margin (Dengan Jarak Samping)
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Tampilan standar rapi dengan ruang jarak (padding) di batas kiri dan kanan layar HP.
                    </p>
                  </div>
                </div>

                {/* Mode 2: Max-Width / Tanpa Margin Samping */}
                <div
                  onClick={() => {
                    setMobileMarginMode('max_width');
                    localStorage.setItem('tokobazar_mobile_margin_mode', 'max_width');
                    showAlert('Mode tampilan diset ke: Maksimal / Tanpa Margin Samping (Rapat Penuh Layar HP)', 'info');
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start space-x-3 select-none ${
                    mobileMarginMode === 'max_width'
                      ? 'border-rose-600 bg-rose-50/70 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mobileMarginSetting"
                    checked={mobileMarginMode === 'max_width'}
                    onChange={() => {}}
                    className="mt-1 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <span>🖥️ Maksimal / Tanpa Margin Samping</span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">Rapat HP</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Memaksimalkan seluruh area layar HP secara penuh tanpa margin samping (rapat penuh ke tepi kanan & kiri HP).
                    </p>
                  </div>
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

      {/* PRODUCT MODAL (Add / Edit Barang / Jasa) */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingProductId ? 'Edit Barang / Jasa' : 'Tambah Barang / Jasa Baru'}
              </h3>
              <button onClick={() => setProductModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Barcode / QR Barang / Jasa</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 8996001321045 atau JASA001"
                    value={productForm.barcode}
                    onChange={e => setProductForm({ ...productForm, barcode: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Barang / Jasa</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kopi Bubuk 200g / Jasa Antar Galon Air Mineral"
                  value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-modal-pop relative overflow-hidden">
            {/* Printable Receipt Container */}
            <div ref={receiptRef} id="receipt-print-area" className={`bg-white p-2 space-y-3 receipt-${thermalPaperWidth} relative`}>
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <div className="bg-rose-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-rose-600">
                  <Store className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-slate-900">{storeName || 'TOKO BAZAR'}</h3>
                <p className="text-xs text-slate-500">Struk Pembayaran Belanja Pelanggan</p>
              </div>

              {/* Stamp LUNAS Visual Badge with Smooth Stamp Animation */}
              <div className="relative">
                <div className="absolute right-1 top-0 pointer-events-none select-none animate-stamp z-10 opacity-0">
                  <div className="border-2 border-emerald-600 border-dashed rounded-lg px-2 py-0.5 text-emerald-700 font-black tracking-wider uppercase -rotate-12 bg-emerald-50/90 shadow-2xs flex flex-col items-center leading-none">
                    <span className="text-[8px] tracking-normal font-bold text-emerald-800">PEMBAYARAN</span>
                    <span className="text-xs font-black text-emerald-700">✓ LUNAS</span>
                  </div>
                </div>

                <div className="text-xs space-y-1 font-mono text-slate-600 pr-16">
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
                {((completedTx.payment_method || '').toUpperCase() === 'QRIS') ? (
                  <>
                    <div className="flex justify-between text-sky-950 font-bold bg-sky-50 p-2 rounded-lg border border-sky-300 text-xs">
                      <span className="flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-sky-700" />
                        Metode Pembayaran
                      </span>
                      <span className="text-sky-800 font-black">QRIS / Transfer Bank</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Nominal Diterima</span>
                      <span className="font-bold text-slate-900">{formatRupiah(completedTx.paid_amount)}</span>
                    </div>
                    {completedTx.paid_amount > completedTx.total_amount && (
                      <div className="flex justify-between text-amber-700 text-xs font-semibold">
                        <span>Biaya Admin / Transfer</span>
                        <span>+ {formatRupiah(completedTx.paid_amount - completedTx.total_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Kembalian Fisik</span>
                      <span className="font-bold text-emerald-600">Rp 0 (Non-Tunai)</span>
                    </div>
                    {completedTx.notes && (
                      <div className="text-[11px] bg-slate-100 text-slate-700 p-2 rounded border border-slate-200">
                        <span className="font-bold text-slate-900">Ref / Catatan: </span>
                        <span>{completedTx.notes}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-emerald-900 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-xs">
                      <span className="flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                        Metode Pembayaran
                      </span>
                      <span className="text-emerald-700 font-black">Uang Tunai (Fisik)</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tunai Diterima</span>
                      <span>{formatRupiah(completedTx.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Kembalian</span>
                      <span className="font-bold text-emerald-600">{formatRupiah(completedTx.change_amount)}</span>
                    </div>
                    {completedTx.notes && (
                      <div className="text-[11px] bg-slate-100 text-slate-700 p-2 rounded border border-slate-200">
                        <span className="font-bold text-slate-900">Catatan: </span>
                        <span>{completedTx.notes}</span>
                      </div>
                    )}
                  </>
                )}
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
                  onClick={() => printThermalReceipt()}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition shadow-sm cursor-pointer"
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

      {/* TOAST NOTIFICATION - Senior Friendly Large Readable Error Box */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4 pointer-events-auto">
          <div className={`p-4 sm:p-5 rounded-2xl shadow-2xl border-3 flex items-start justify-between gap-3 text-base sm:text-lg font-black leading-snug ${
            toast.type === 'error'
              ? 'bg-rose-950 border-rose-500 text-white'
              : toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-400 text-white'
              : 'bg-slate-900 border-amber-400 text-white'
          }`}>
            <div className="flex items-start gap-2.5">
              <span className="text-xl shrink-0 mt-0.5">
                {toast.type === 'error' ? '🚫' : toast.type === 'success' ? '✅' : 'ℹ️'}
              </span>
              <div className="whitespace-pre-line text-sm sm:text-base font-extrabold leading-relaxed">
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => setToast(null)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition shrink-0 cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* USER MANAGEMENT MODAL (ADMIN ONLY) */}
      {userModalOpen && currentUser?.role === 'ADMIN' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-5">
          <div className="bg-slate-900 border-2 border-slate-700 text-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Users className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-amber-300">👑 Kelola User & Reset Password</h3>
                  <p className="text-xs text-slate-400">Tambah akun kasir/admin baru & atur ulang password</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserModalOpen(false);
                  setEditingUserId(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-xl border border-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Form Tambah User Baru */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="font-extrabold text-sm text-slate-200 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>+ Tambah Akun User Baru</span>
              </h4>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: kasir2"
                    value={newUserForm.username}
                    onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Budi Kasir Siang"
                    value={newUserForm.name}
                    onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Password</label>
                  <input
                    type="text"
                    required
                    placeholder="Password baru"
                    value={newUserForm.password}
                    onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Hak Akses / Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="KASIR">KASIR (Hanya transaksi & catalog)</option>
                    <option value="ADMIN">ADMIN (Akses penuh + kelola user)</option>
                  </select>
                </div>
                <div className="sm:col-span-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Simpan User Baru</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Section 2: Daftar User & Reset Password */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-amber-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Daftar User Terdaftar dalam Database</span>
                </h4>
                <button
                  type="button"
                  onClick={fetchUsersList}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${userLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {userLoading ? (
                <div className="py-8 text-center text-slate-400 text-xs">Memuat daftar user...</div>
              ) : (
                <div className="space-y-2">
                  {usersList.map((u: any) => (
                    <div key={u.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white">{u.name}</span>
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
                            u.role === 'ADMIN' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          Username: <strong className="text-slate-200">{u.username}</strong>
                          {u.password && (
                            <span className="ml-2 text-slate-500">
                              (Pass: <code className="text-amber-300">{u.password}</code>)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {editingUserId === u.id ? (
                          <form onSubmit={handleUpdateUser} className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-amber-500">
                            <input
                              type="text"
                              placeholder="Pass baru"
                              value={editUserForm.password}
                              onChange={e => setEditUserForm({ ...editUserForm, password: e.target.value })}
                              className="w-28 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white"
                            />
                            <select
                              value={editUserForm.role}
                              onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value as any })}
                              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white"
                            >
                              <option value="KASIR">KASIR</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                            <button
                              type="submit"
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-1 rounded-lg cursor-pointer"
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingUserId(null)}
                              className="text-xs text-slate-400 hover:text-white px-1"
                            >
                              ✕
                            </button>
                          </form>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId(u.id);
                                setEditUserForm({ name: u.name, role: u.role, password: '' });
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>Reset Pass</span>
                            </button>
                            {currentUser.username !== u.username && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                className="bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                                title="Hapus User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CASH EXPENSE MODAL (PENGELUARAN KAS TOKO: SAMPAH, LISTRIK, MAKAN, DONASI, PRIVE, DLL) */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-5">
          <div className="bg-slate-900 border-2 border-rose-500/60 text-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                  <Wallet className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">💸 Catat Pengeluaran Kas Toko</h3>
                  <p className="text-xs text-rose-300">Sampah, listrik, makan/minum, donasi, prive, dll</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-xl border border-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              {/* Info Kasir Bertugas Otomatis */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Nama Kasir Bertugas Saat Ini</span>
                  <span className="text-sm font-black text-amber-300 flex items-center gap-1.5 mt-0.5">
                    <User className="w-4 h-4 text-emerald-400" />
                    {currentUser?.name || cashierName}
                  </span>
                </div>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
                  ✓ Otomatis
                </span>
              </div>

              {/* Kategori Pengeluaran */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                  Kategori Pengeluaran Kas <span className="text-rose-400">*</span>
                </label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border-2 border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Uang Sampah">🗑️ Uang Sampah (Kebersihan)</option>
                  <option value="Listrik / Air">⚡ Biaya Listrik & Air</option>
                  <option value="Makan & Minum">🍱 Biaya Makan & Minum Kasir / Karyawan</option>
                  <option value="Donasi">🤲 Uang Donasi / Sumbangan / Amal</option>
                  <option value="Prive Tunai">💼 Prive Tunai (Pengambilan Pribadi Pemilik Toko)</option>
                  <option value="Operasional Toko">📦 Biaya Operasional & Perlengkapan Toko</option>
                  <option value="Lainnya">📝 Pengeluaran Kas Tunai Lainnya</option>
                </select>
              </div>

              {/* Nominal Pengeluaran (Rp) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase">
                    Nominal Pengeluaran (Rp) <span className="text-rose-400">*</span>
                  </label>
                  {expenseAmount && (
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {formatRupiah(parseFloat(expenseAmount.replace(/[^0-9]/g, '')) || 0)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-black text-sm">Rp</span>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 15000"
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border-2 border-rose-500/50 rounded-xl text-white font-black text-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Catatan / Keterangan Pengeluaran */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase">
                  Catatan / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Iuran sampah mingguan RT / Beli galon air minum"
                  value={expenseNotes}
                  onChange={e => setExpenseNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Informasi Efek Akuntansi */}
              <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-3 text-[11px] text-rose-200 space-y-1">
                <div className="font-bold text-rose-300 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Pengaruh Terhadap Keuangan Toko:</span>
                </div>
                <p className="leading-relaxed">
                  Pengeluaran kas tunai ini akan <strong>mengurangi pemasukan bersih toko (net income)</strong> dan <strong>mengurangi saldo fisik uang tunai di laci kasir</strong> pada rekap keuangan shift kasir.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={expenseSubmitting}
                  className="w-2/3 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {expenseSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Simpan Pengeluaran Kas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UNREGISTERED ITEM PROMPT MODAL */}
      {unregisteredItemPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border-2 border-amber-400 text-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 animate-modal-pop">
            <div className="flex items-center space-x-3 text-amber-300 border-b border-slate-800 pb-3">
              <AlertCircle className="w-7 h-7 text-amber-400 shrink-0" />
              <div>
                <h3 className="font-black text-lg text-white">Barang / Jasa Belum Terdaftar</h3>
                <p className="text-xs text-amber-300 font-medium">Tambah Item Langsung untuk Kasir</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              Item <strong>"{unregisteredItemPrompt.barcode || unregisteredItemPrompt.name}"</strong> tidak ditemukan di database.
              Apakah Anda ingin menambahkan item barang / jasa baru ini ke database saat ini juga agar dapat langsung ditransaksikan tanpa menunggu admin?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingProductId(null);
                  setProductForm({
                    barcode: unregisteredItemPrompt.barcode,
                    name: unregisteredItemPrompt.name,
                    price: ''
                  });
                  setIsModalScanning(false);
                  setAddCreatedToCartOnSave(true);
                  setProductModalOpen(true);
                  setUnregisteredItemPrompt(null);
                }}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-sm py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Plus className="w-5 h-5 stroke-[3]" />
                <span>Ya, Tambah Barang / Jasa Baru Sekarang</span>
              </button>
              <button
                type="button"
                onClick={() => setUnregisteredItemPrompt(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-700 transition cursor-pointer"
              >
                Batal / Abaikan
              </button>
            </div>
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

