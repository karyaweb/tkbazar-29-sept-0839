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
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  cashier_name: string;
  created_at: string;
  items: TransactionItem[];
}

interface DatabaseData {
  products: Product[];
  transactions: Transaction[];
}

function getInitialData(): DatabaseData {
  return {
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
      { id: 10, barcode: '8997778889900', name: 'Chitato Snack Sapi Panggang 68g', price: 10500 }
    ],
    transactions: []
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
      return JSON.parse(content);
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

  // Transactions API
  app.get('/api/transactions', (req, res) => {
    const db = loadDb();
    const sorted = [...db.transactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(sorted);
  });

  app.post('/api/transactions', (req, res) => {
    const db = loadDb();
    const { invoice_no, total_amount, paid_amount, change_amount, cashier_name, items } = req.body;

    if (!invoice_no || total_amount === undefined || paid_amount === undefined || !items || !items.length) {
      return res.status(400).json({ error: 'Data transaksi tidak lengkap' });
    }

    const newTx: Transaction = {
      id: db.transactions.length > 0 ? Math.max(...db.transactions.map(t => t.id)) + 1 : 1,
      invoice_no,
      total_amount: Number(total_amount),
      paid_amount: Number(paid_amount),
      change_amount: Number(change_amount),
      cashier_name: cashier_name || 'Kasir 1',
      created_at: new Date().toISOString(),
      items
    };

    db.transactions.push(newTx);
    saveDb(db);

    res.json({ success: true, transaction: newTx });
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
