-- Skema Database Cloudflare D1 untuk TokoBazar
-- Nama Database di Cloudflare: tokobazar-db

DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS transaction_items;
DROP TABLE IF EXISTS products;

CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT UNIQUE NOT NULL, -- Menyimpan kode angka Barcode / QR Code
    name TEXT NOT NULL,          -- Nama barang
    price REAL NOT NULL          -- Harga barang (IDR)
);

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT UNIQUE NOT NULL,
    total_amount REAL NOT NULL,
    paid_amount REAL NOT NULL,
    change_amount REAL NOT NULL,
    cashier_name TEXT DEFAULT 'Kasir 1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no TEXT NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (invoice_no) REFERENCES transactions(invoice_no)
);

-- Seed Data Awal Produk TokoBazar
INSERT INTO products (barcode, name, price) VALUES 
('8996001321045', 'Indomie Goreng Special 85g', 3500),
('8996001321052', 'Indomie Kuah Ayam Bawang', 3200),
('8999999123456', 'Kopi Kapal Api Special 165g', 12500),
('8992761112233', 'Aqua Air Mineral 600ml', 3500),
('8999999554433', 'Sunlight Pembersih Piring Lime 755ml', 16000),
('8991234567890', 'Beras Ramos Super 5 Kg', 68000),
('8998888776655', 'Minyak Goreng Filma 2 Liter', 38000),
('8991112223344', 'Telur Ayam Negeri 1 Kg', 28000),
('8993334445566', 'Teh Botol Sosro 450ml', 4500),
('8997778889900', 'Chitato Snack Sapi Panggang 68g', 10500);
