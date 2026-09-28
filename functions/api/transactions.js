/**
 * Cloudflare Pages Function: /api/transactions
 * Menyimpan dan mengambil histori transaksi dari Cloudflare D1 (env.DB)
 */

function formatFriendlyError(err, actionName = "memproses transaksi") {
  const rawMsg = err?.message || String(err || '');

  if (
    rawMsg.includes('no such table') ||
    rawMsg.includes('table transactions') ||
    rawMsg.includes('table transaction_items')
  ) {
    return '⚠️ TABEL TRANSAKSI BELUM TERBUAT!\n\nTabel database D1 belum siap. Silakan buka menu "? (Petunjuk PWA & Bantuan)" lalu tekan tombol "⚡ Bootstrap Database D1 Sekarang".';
  }

  if (
    rawMsg.includes('UNIQUE constraint failed') ||
    rawMsg.includes('transactions.invoice_no')
  ) {
    return '⚠️ NOMOR NOTA/INVOICE SAMA!\n\nNomor nota transaksi ini sudah ada sebelumnya. Sistem akan membuat nomor nota baru secara otomatis.';
  }

  if (
    rawMsg.includes('NOT NULL constraint failed') ||
    rawMsg.includes('datatype mismatch')
  ) {
    return '⚠️ DATA TRANSAKSI TIDAK LENGKAP!\n\nMohon periksa kembali isian nominal pembayaran atau daftar barang yang dibeli.';
  }

  if (!contextHasDb(err)) {
    return '⚠️ KONEKSI DATABASE D1 TERPUTUS!\n\nSistem tidak terhubung ke Cloudflare D1. Periksa konfigurasi wrangler.toml.';
  }

  return `Gagal ${actionName}: ${rawMsg}`;
}

function contextHasDb(err) {
  const msg = err?.message || '';
  return !msg.includes('env.DB') && !msg.includes('binding');
}

export async function onRequestGet(context) {
  try {
    if (!context.env || !context.env.DB) {
      return Response.json({ error: "Cloudflare D1 binding (env.DB) belum terhubung di wrangler.toml." }, { status: 500 });
    }

    // Get all transactions
    const { results: txList } = await context.env.DB.prepare(
      "SELECT * FROM transactions ORDER BY id DESC LIMIT 200"
    ).all();

    if (!txList || txList.length === 0) {
      return Response.json([]);
    }

    // Fetch items for each transaction
    const fullTransactions = await Promise.all(
      txList.map(async (tx) => {
        const { results: items } = await context.env.DB.prepare(
          "SELECT * FROM transaction_items WHERE invoice_no = ?"
        ).bind(tx.invoice_no).all();
        return {
          ...tx,
          items: items || []
        };
      })
    );

    return Response.json(fullTransactions);
  } catch (err) {
    return Response.json({ error: formatFriendlyError(err, "memuat histori transaksi") }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const {
      invoice_no,
      subtotal_amount,
      discount_amount,
      tax_amount,
      admin_fee_amount,
      total_amount,
      paid_amount,
      change_amount,
      cashier_name,
      payment_method,
      notes,
      items
    } = body;

    if (!invoice_no || total_amount === undefined || paid_amount === undefined || !items || !items.length) {
      return Response.json({ error: "Data transaksi tidak lengkap atau keranjang belanja kosong." }, { status: 400 });
    }

    if (!context.env || !context.env.DB) {
      return Response.json({ error: "Cloudflare D1 binding (env.DB) belum terhubung di wrangler.toml." }, { status: 500 });
    }

    const db = context.env.DB;

    // Insert into transactions
    await db.prepare(`
      INSERT INTO transactions (
        invoice_no, subtotal_amount, discount_amount, tax_amount, admin_fee_amount, total_amount, paid_amount, change_amount, cashier_name, payment_method, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      invoice_no,
      subtotal_amount || 0,
      discount_amount || 0,
      tax_amount || 0,
      admin_fee_amount || 0,
      total_amount,
      paid_amount,
      change_amount,
      cashier_name || 'Kasir 1',
      payment_method || 'TUNAI',
      notes || ''
    ).run();

    // Insert items in batch
    const itemStatements = items.map(item =>
      db.prepare(`
        INSERT INTO transaction_items (
          invoice_no, product_name, price, quantity, subtotal
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        invoice_no,
        item.product_name,
        item.price,
        item.quantity,
        item.subtotal
      )
    );

    await db.batch(itemStatements);

    return Response.json({
      success: true,
      transaction: {
        invoice_no,
        subtotal_amount,
        discount_amount,
        tax_amount,
        admin_fee_amount: admin_fee_amount || 0,
        total_amount,
        paid_amount,
        change_amount,
        cashier_name: cashier_name || 'Kasir 1',
        payment_method: payment_method || 'TUNAI',
        notes: notes || '',
        created_at: new Date().toISOString(),
        items
      }
    });
  } catch (err) {
    return Response.json({ error: formatFriendlyError(err, "menyimpan transaksi") }, { status: 400 });
  }
}
