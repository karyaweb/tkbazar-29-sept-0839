/**
 * Cloudflare Pages Function: /api/bootstrap
 * Otomatis membuat tabel-tabel (users, products, transactions, transaction_items)
 * dan mengisi seed data sampel jika database D1 belum ada struktur tabelnya.
 */

export async function onRequestPost(context) {
  try {
    if (!context.env || !context.env.DB) {
      return Response.json({
        success: false,
        error: "Cloudflare D1 binding (env.DB) belum terhubung di wrangler.toml atau Cloudflare Dashboard."
      }, { status: 500 });
    }

    const db = context.env.DB;

    // 1. Create Tables IF NOT EXISTS
    await db.batch([
      db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'KASIR',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          barcode TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          price REAL NOT NULL
        );
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_no TEXT UNIQUE NOT NULL,
          subtotal_amount REAL,
          discount_amount REAL,
          tax_amount REAL,
          total_amount REAL NOT NULL,
          paid_amount REAL NOT NULL,
          change_amount REAL NOT NULL,
          cashier_name TEXT DEFAULT 'Kasir 1',
          payment_method TEXT DEFAULT 'TUNAI',
          notes TEXT DEFAULT '',
          admin_fee_amount REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS transaction_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          invoice_no TEXT NOT NULL,
          product_id INTEGER,
          product_name TEXT NOT NULL,
          price REAL NOT NULL,
          quantity INTEGER NOT NULL,
          subtotal REAL NOT NULL,
          FOREIGN KEY (invoice_no) REFERENCES transactions(invoice_no)
        );
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cashier_name TEXT NOT NULL,
          category TEXT NOT NULL,
          amount REAL NOT NULL,
          notes TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)
    ]);

    // 1b. Schema migrations for existing tables
    try {
      await db.prepare("ALTER TABLE transactions ADD COLUMN payment_method TEXT DEFAULT 'TUNAI'").run();
    } catch (e) {
      // Column payment_method may already exist
    }
    try {
      await db.prepare("ALTER TABLE transactions ADD COLUMN notes TEXT DEFAULT ''").run();
    } catch (e) {
      // Column notes may already exist
    }
    try {
      await db.prepare("ALTER TABLE transactions ADD COLUMN admin_fee_amount REAL DEFAULT 0").run();
    } catch (e) {
      // Column admin_fee_amount may already exist
    }

    // 2. Check & Seed Users
    const { results: userRes } = await db.prepare("SELECT COUNT(*) as count FROM users").all();
    const userCount = userRes[0]?.count || 0;
    if (userCount === 0) {
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO users (username, password, name, role) VALUES ('kasir', 'kasir1234', 'Kasir Utama', 'KASIR')"),
        db.prepare("INSERT OR IGNORE INTO users (username, password, name, role) VALUES ('admin', 'admin1234', 'Administrator', 'ADMIN')")
      ]);
    }

    // 3. Check & Seed Products
    const { results: prodRes } = await db.prepare("SELECT COUNT(*) as count FROM products").all();
    const prodCount = prodRes[0]?.count || 0;

    let seeded = false;
    if (prodCount === 0) {
      // Seed default items
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO products (barcode, name, price) VALUES ('8996001321045', 'Indomie Goreng Special 85g', 3500)"),
        db.prepare("INSERT OR IGNORE INTO products (barcode, name, price) VALUES ('8996001321052', 'Indomie Kuah Ayam Bawang', 3200)"),
        db.prepare("INSERT OR IGNORE INTO products (barcode, name, price) VALUES ('8999999123456', 'Kopi Kapal Api Special 165g', 12500)"),
        db.prepare("INSERT OR IGNORE INTO products (barcode, name, price) VALUES ('8992761112233', 'Aqua Air Mineral 600ml', 3500)"),
        db.prepare("INSERT OR IGNORE INTO products (barcode, name, price) VALUES ('8999999554433', 'Sunlight Pembersih Piring Lime 755ml', 16000)"),
        db.prepare("INSERT OR IGNORE INTO products (barcode, name, price) VALUES ('8991234567890', 'Beras Ramos Super 5 Kg', 68000)"),
        db.prepare("INSERT OR IGNORE INTO products (barcode, name, price) VALUES ('8998888776655', 'Minyak Goreng Filma 2 Liter', 38000)"),
        db.prepare("INSERT OR IGNORE INTO products (barcode, name, price) VALUES ('8991112223344', 'Telur Ayam Negeri 1 Kg', 28000)"),
        db.prepare("INSERT OR IGNORE INTO products (barcode, name, price) VALUES ('8993334445566', 'Teh Botol Sosro 450ml', 4500)"),
        db.prepare("INSERT OR IGNORE INTO products (barcode, name, price) VALUES ('8997778889900', 'Chitato Snack Sapi Panggang 68g', 10500)")
      ]);
      seeded = true;
    }

    return Response.json({
      success: true,
      message: "Database Cloudflare D1 berhasil di-bootstrap! Tabel 'users', 'products', 'transactions', dan 'transaction_items' telah siap.",
      seeded
    });
  } catch (err) {
    return Response.json({
      success: false,
      error: `Gagal bootstrap D1: ${err.message}`
    }, { status: 500 });
  }
}
