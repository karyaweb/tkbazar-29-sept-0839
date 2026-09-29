/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

const DB_FILE = path.join(process.cwd(), 'data', 'tokobazar.json');

interface Product {
  id: number;
  barcode: string;
  name: string;
  price: number;
}

interface TransactionItem {
  product_id?: number;
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
  payment_method?: string;
  notes?: string;
  created_at: string;
  items: TransactionItem[];
}

interface Expense {
  id: number;
  cashier_name: string;
  category: string;
  amount: number;
  notes?: string;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  password: string;
  name: string;
  role: 'KASIR' | 'ADMIN';
  created_at?: string;
}

interface DatabaseData {
  users: User[];
  products: Product[];
  transactions: Transaction[];
  expenses: Expense[];
}

function getInitialData(): DatabaseData {
  return {
    users: [
      { id: 1, username: 'kasir', password: 'kasir1234', name: 'Kasir Utama', role: 'KASIR' },
      { id: 2, username: 'admin', password: 'admin1234', name: 'Administrator', role: 'ADMIN' }
    ],
    products: [
      { id: 1, barcode: '8996001321045', name: 'Indomie Goreng Special 85g', price: 3500 },
      { id: 2, barcode: '8996001321052', name: 'Indomie Kuah Ayam Bawang', price: 3200 },
      { id: 3, barcode: '8999999123456', name: 'Kopi Kapal Api Special 165g', price: 12500 },
      { id: 4, barcode: '8992761112233', name: 'Aqua Air Mineral 600ml', price: 3500 },
      { id: 5, barcode: '8999999554433', name: 'Sunlight Pembersih Piring Lime 755ml', price: 16000 },
      { id: 6, barcode: '8991234567890', name: 'Beras Ramos Super 5 Kg', price: 68000 },
      { id: 7, barcode: '8998888776655', name: 'Minyak Goreng Filma 2 Liter', price: 38000 },
      { id: 8, barcode: '8991112223344', name: 'Telur Ayam Negeri 1 Kg', price: 28000 },
      { id: 9, barcode: '8993334445566', name: 'Teh Botol Sosro 450ml', price: 4500 },
      { id: 10, barcode: '8997778889900', name: 'Chitato Snack Sapi Panggang 68g', price: 10500 },
      { id: 11, barcode: 'JASA001', name: 'Jasa Antar Galon Air Mineral', price: 5000 },
      { id: 12, barcode: 'JASA002', name: 'Jasa Pasang / Instalasi Barang', price: 25000 }
    ],
    transactions: [],
    expenses: []
  };
}

function loadDb(): DatabaseData {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (!data.expenses) data.expenses = [];
      if (!data.transactions) data.transactions = [];
      if (!data.users) data.users = [];
      if (!data.products) data.products = [];
      return data;
    }
  } catch (e) {
    console.error('Error loading DB:', e);
  }
  const initial = getInitialData();
  saveDb(initial);
  return initial;
}

function saveDb(data: DatabaseData) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving DB:', e);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Products Endpoint (simulating Cloudflare D1 functions/api/products.js)
  app.get('/api/products', (req, res) => {
    const db = loadDb();
    const { search, barcode } = req.query;

    if (barcode) {
      const product = db.products.find(p => p.barcode === String(barcode));
      return res.json(product || null);
    }

    if (search) {
      const q = String(search).toLowerCase();
      const filtered = db.products.filter(
        p => p.name.toLowerCase().includes(q) || p.barcode.includes(q)
      );
      return res.json(filtered);
    }

    // Default sort by name ascending
    const sorted = [...db.products].sort((a, b) => a.name.localeCompare(b.name));
    res.json(sorted);
  });

  app.post('/api/products', (req, res) => {
    const db = loadDb();
    const { barcode, name, price } = req.body;

    if (!barcode || !name || price === undefined) {
      return res.status(400).json({ error: 'Barcode, name, dan price wajib diisi' });
    }

    // Check unique barcode
    if (db.products.some(p => p.barcode === barcode)) {
      return res.status(400).json({ error: 'Barcode sudah terdaftar pada produk lain' });
    }

    const newId = db.products.length > 0 ? Math.max(...db.products.map(p => p.id)) + 1 : 1;
    const newProduct: Product = { id: newId, barcode, name, price: Number(price) };
    db.products.push(newProduct);
    saveDb(db);

    res.json({ success: true, id: newId, product: newProduct });
  });

  app.put('/api/products', (req, res) => {
    const db = loadDb();
    const { id, barcode, name, price } = req.body;

    if (!id || !barcode || !name || price === undefined) {
      return res.status(400).json({ error: 'ID, barcode, name, dan price wajib diisi' });
    }

    const index = db.products.findIndex(p => p.id === Number(id));
    if (index === -1) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    // Check unique barcode excluding self
    if (db.products.some(p => p.barcode === barcode && p.id !== Number(id))) {
      return res.status(400).json({ error: 'Barcode sudah digunakan produk lain' });
    }

    db.products[index] = { id: Number(id), barcode, name, price: Number(price) };
    saveDb(db);

    res.json({ success: true, product: db.products[index] });
  });

  app.delete('/api/products', (req, res) => {
    const db = loadDb();
    const id = req.query.id;

    if (!id) {
      return res.status(400).json({ error: 'ID produk wajib disertakan' });
    }

    const index = db.products.findIndex(p => p.id === Number(id));
    if (index === -1) {
      return res.status(404).json({ error: 'Produk tidak ditemukan' });
    }

    db.products.splice(index, 1);
    saveDb(db);

    res.json({ success: true });
  });

  app.post('/api/products/import', (req, res) => {
    const db = loadDb();
    const { products: importedProducts, mode } = req.body; // mode: 'append' | 'overwrite'

    if (!Array.isArray(importedProducts)) {
      return res.status(400).json({ error: 'Format data produk tidak valid' });
    }

    let countAdded = 0;
    let countUpdated = 0;

    if (mode === 'overwrite') {
      for (const imp of importedProducts) {
        if (!imp.barcode || !imp.name || imp.price === undefined) continue;
        const existingIdx = db.products.findIndex(p => p.barcode === String(imp.barcode));
        if (existingIdx !== -1) {
          db.products[existingIdx] = {
            id: db.products[existingIdx].id,
            barcode: String(imp.barcode),
            name: String(imp.name),
            price: Number(imp.price)
          };
          countUpdated++;
        } else {
          const newId = db.products.length > 0 ? Math.max(...db.products.map(p => p.id)) + 1 : 1;
          db.products.push({
            id: newId,
            barcode: String(imp.barcode),
            name: String(imp.name),
            price: Number(imp.price)
          });
          countAdded++;
        }
      }
    } else {
      for (const imp of importedProducts) {
        if (!imp.barcode || !imp.name || imp.price === undefined) continue;
        if (db.products.some(p => p.barcode === String(imp.barcode))) continue;
        const newId = db.products.length > 0 ? Math.max(...db.products.map(p => p.id)) + 1 : 1;
        db.products.push({
          id: newId,
          barcode: String(imp.barcode),
          name: String(imp.name),
          price: Number(imp.price)
        });
        countAdded++;
      }
    }

    saveDb(db);
    res.json({ success: true, countAdded, countUpdated });
  });

  // Server-side Anti-Brute Force Protection Tracker
  const loginAttemptsMap = new Map<string, { count: number; lockUntil: number }>();

  // Auth & User Management Endpoints
  app.post('/api/auth', (req, res) => {
    const db = loadDb();
    if (!db.users || db.users.length === 0) {
      db.users = getInitialData().users;
      saveDb(db);
    }
    const action = req.query.action || 'login';

    if (action === 'login') {
      const { username, password } = req.body;
      const clientIp = (req.headers['x-forwarded-for'] || req.ip || 'unknown').toString();
      const now = Date.now();
      const userAttempt = loginAttemptsMap.get(clientIp) || { count: 0, lockUntil: 0 };

      if (userAttempt.lockUntil > now) {
        const secondsLeft = Math.ceil((userAttempt.lockUntil - now) / 1000);
        return res.status(429).json({
          error: `⚠️ Akses dikunci sementara (5x gagal)! Silakan tunggu ${secondsLeft} detik.`
        });
      }

      if (!username || !password) {
        return res.status(400).json({ error: 'Username dan Password wajib diisi' });
      }
      const user = db.users.find(u => u.username.toLowerCase() === String(username).trim().toLowerCase());
      if (!user || user.password !== password) {
        userAttempt.count += 1;
        if (userAttempt.count >= 5) {
          userAttempt.lockUntil = now + 60000; // Lock for 60 seconds
          userAttempt.count = 0;
          loginAttemptsMap.set(clientIp, userAttempt);
          return res.status(429).json({
            error: '⚠️ 5x SALAH PASSWORD! Akses dikunci selama 60 detik untuk mencegah percobaan tidak sah.'
          });
        }
        loginAttemptsMap.set(clientIp, userAttempt);
        return res.status(401).json({
          error: `Username atau Password salah! (Percobaan ${userAttempt.count}/5)`
        });
      }

      // Reset on success
      loginAttemptsMap.delete(clientIp);
      return res.json({
        success: true,
        user: { id: user.id, username: user.username, name: user.name, role: user.role }
      });
    }

    if (action === 'create_user') {
      const { username, password, name, role } = req.body;
      if (!username || !password || !name) {
        return res.status(400).json({ error: 'Username, Password, dan Nama wajib diisi' });
      }
      if (db.users.some(u => u.username.toLowerCase() === String(username).trim().toLowerCase())) {
        return res.status(400).json({ error: 'Username tersebut sudah terpakai!' });
      }
      const newId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
      const userRole = role === 'ADMIN' ? 'ADMIN' : 'KASIR';
      db.users.push({ id: newId, username: String(username).trim().toLowerCase(), password, name: String(name).trim(), role: userRole });
      saveDb(db);
      return res.json({ success: true, message: 'User baru berhasil ditambahkan!' });
    }

    if (action === 'update_user') {
      const { id, password, name, role } = req.body;
      const idx = db.users.findIndex(u => u.id === Number(id));
      if (idx === -1) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
      }
      if (name) db.users[idx].name = name;
      if (role) db.users[idx].role = role === 'ADMIN' ? 'ADMIN' : 'KASIR';
      if (password && password.trim() !== '') db.users[idx].password = password;
      saveDb(db);
      return res.json({ success: true, message: 'Data user berhasil diperbarui!' });
    }

    res.status(400).json({ error: 'Aksi tidak dikenal' });
  });

  app.get('/api/auth', (req, res) => {
    const db = loadDb();
    if (!db.users || db.users.length === 0) {
      db.users = getInitialData().users;
      saveDb(db);
    }
    res.json(db.users);
  });

  app.delete('/api/auth', (req, res) => {
    const db = loadDb();
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID user wajib diisi' });
    db.users = db.users.filter(u => u.id !== Number(id));
    saveDb(db);
    res.json({ success: true });
  });

  // Bootstrap API (ensures database structure, QRIS fields, and initial seed items)
  app.post('/api/bootstrap', (_req, res) => {
    const db = loadDb();
    let seeded = false;
    if (!db.users || db.users.length === 0) {
      db.users = getInitialData().users;
      seeded = true;
    }
    if (db.products.length === 0) {
      db.products = getInitialData().products;
      seeded = true;
    }
    if (db.transactions) {
      db.transactions.forEach(tx => {
        if (!tx.payment_method) {
          tx.payment_method = 'TUNAI';
        }
        if (tx.notes === undefined) {
          tx.notes = '';
        }
        if (tx.admin_fee_amount === undefined) {
          tx.admin_fee_amount = 0;
        }
        if (!tx.tax_type) {
          tx.tax_type = 'rp';
        }
        if (tx.tax_value === undefined) {
          tx.tax_value = '0';
        }
      });
    }
    if (!db.expenses) {
      db.expenses = [];
      seeded = true;
    }
    saveDb(db);
    res.json({
      success: true,
      message: 'Database berhasil di-bootstrap dengan tabel user, produk, expenses (pengeluaran), serta kolom QRIS, Biaya Admin, Pajak (tax_type/value), & Catatan!',
      seeded
    });
  });

  // Transactions API
  app.get('/api/transactions', (req, res) => {
    const db = loadDb();
    const sorted = [...db.transactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(sorted);
  });

  app.post('/api/transactions', (req, res) => {
    const db = loadDb();
    const {
      invoice_no,
      subtotal_amount,
      discount_amount,
      tax_amount,
      tax_type,
      tax_value,
      admin_fee_amount,
      total_amount,
      paid_amount,
      change_amount,
      cashier_name,
      payment_method,
      notes,
      items
    } = req.body;

    if (!invoice_no || total_amount === undefined || paid_amount === undefined || !items || !items.length) {
      return res.status(400).json({ error: 'Data transaksi tidak lengkap' });
    }

    const newTx: Transaction = {
      id: db.transactions.length > 0 ? Math.max(...db.transactions.map(t => t.id)) + 1 : 1,
      invoice_no,
      subtotal_amount: subtotal_amount !== undefined ? Number(subtotal_amount) : undefined,
      discount_amount: discount_amount !== undefined ? Number(discount_amount) : undefined,
      tax_amount: tax_amount !== undefined ? Number(tax_amount) : undefined,
      tax_type: tax_type || 'rp',
      tax_value: tax_value !== undefined ? String(tax_value) : '0',
      admin_fee_amount: admin_fee_amount !== undefined ? Number(admin_fee_amount) : 0,
      total_amount: Number(total_amount),
      paid_amount: Number(paid_amount),
      change_amount: Number(change_amount),
      cashier_name: cashier_name || 'Kasir 1',
      payment_method: payment_method || 'TUNAI',
      notes: notes || '',
      created_at: new Date().toISOString(),
      items
    };

    db.transactions.push(newTx);
    saveDb(db);

    res.json({ success: true, transaction: newTx });
  });

  // Expenses API (Pengeluaran Kas Toko: Sampah, Listrik, Makan/Minum, Donasi, Prive, dll)
  app.get('/api/expenses', (req, res) => {
    const db = loadDb();
    const sorted = [...(db.expenses || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(sorted);
  });

  app.post('/api/expenses', (req, res) => {
    const db = loadDb();
    const { cashier_name, category, amount, notes } = req.body;

    if (!category || amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Kategori dan nominal pengeluaran wajib diisi valid' });
    }

    const newId = db.expenses && db.expenses.length > 0 ? Math.max(...db.expenses.map(e => e.id)) + 1 : 1;
    const newExpense: Expense = {
      id: newId,
      cashier_name: cashier_name || 'Kasir Utama',
      category: String(category).trim(),
      amount: Number(amount),
      notes: notes ? String(notes).trim() : '',
      created_at: new Date().toISOString()
    };

    if (!db.expenses) db.expenses = [];
    db.expenses.push(newExpense);
    saveDb(db);

    res.json({ success: true, expense: newExpense });
  });

  app.delete('/api/expenses', (req, res) => {
    const db = loadDb();
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID pengeluaran wajib disertakan' });

    const index = (db.expenses || []).findIndex(e => e.id === Number(id));
    if (index === -1) {
      return res.status(404).json({ error: 'Data pengeluaran tidak ditemukan' });
    }

    db.expenses.splice(index, 1);
    saveDb(db);
    res.json({ success: true });
  });

  // Serve frontend: Vite dev server in development, static files in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`TokoBazar server running at http://localhost:${port}`);
  });
}

startServer();
