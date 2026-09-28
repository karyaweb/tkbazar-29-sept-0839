/**
 * Cloudflare Pages Function: /api/expenses
 * Mencatat & mengambil riwayat pengeluaran kas toko (uang sampah, listrik, makan/minum, donasi, prive, dll)
 */

export async function onRequestGet(context) {
  try {
    if (!context.env || !context.env.DB) {
      return Response.json({ error: "Cloudflare D1 binding (env.DB) belum terhubung di wrangler.toml." }, { status: 500 });
    }

    const { results } = await context.env.DB.prepare(
      "SELECT * FROM expenses ORDER BY id DESC LIMIT 500"
    ).all();

    return Response.json(results || []);
  } catch (err) {
    return Response.json({ error: `Gagal memuat daftar pengeluaran kas: ${err.message}` }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { cashier_name, category, amount, notes } = body;

    if (!category || amount === undefined || Number(amount) <= 0) {
      return Response.json({ error: "Kategori dan nominal pengeluaran wajib diisi dengan benar." }, { status: 400 });
    }

    if (!context.env || !context.env.DB) {
      return Response.json({ error: "Cloudflare D1 binding (env.DB) belum terhubung di wrangler.toml." }, { status: 500 });
    }

    const db = context.env.DB;
    const createdAt = new Date().toISOString();

    const result = await db.prepare(`
      INSERT INTO expenses (cashier_name, category, amount, notes, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      cashier_name || 'Kasir Utama',
      category,
      Number(amount),
      notes || '',
      createdAt
    ).run();

    return Response.json({
      success: true,
      expense: {
        id: result.meta?.last_row_id || Date.now(),
        cashier_name: cashier_name || 'Kasir Utama',
        category,
        amount: Number(amount),
        notes: notes || '',
        created_at: createdAt
      }
    });
  } catch (err) {
    return Response.json({ error: `Gagal menyimpan pengeluaran kas: ${err.message}` }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return Response.json({ error: "ID pengeluaran wajib disertakan." }, { status: 400 });
    }

    if (!context.env || !context.env.DB) {
      return Response.json({ error: "Cloudflare D1 binding (env.DB) belum terhubung di wrangler.toml." }, { status: 500 });
    }

    await context.env.DB.prepare("DELETE FROM expenses WHERE id = ?").bind(Number(id)).run();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: `Gagal menghapus pengeluaran kas: ${err.message}` }, { status: 500 });
  }
}
