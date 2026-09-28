/**
 * Cloudflare Pages Function: /api/products
 * Berinteraksi langsung dengan Cloudflare D1 (env.DB)
 */

function formatFriendlyError(err, defaultAction = "memproses produk") {
  const rawMsg = err?.message || String(err || '');
  if (
    rawMsg.includes('UNIQUE constraint failed') ||
    rawMsg.includes('SQLITE_CONSTRAINT') ||
    rawMsg.includes('products.barcode') ||
    rawMsg.includes('D1_ERROR')
  ) {
    return '⚠️ BARCODE SUDAH DIPAKAI! Nomor barcode ini sudah terdaftar untuk barang lain. Silakan gunakan nomor barcode yang berbeda atau edit barang yang sudah ada.';
  }
  return `Gagal ${defaultAction}: ${rawMsg}`;
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const search = url.searchParams.get('search') || '';
    const barcode = url.searchParams.get('barcode');

    if (!context.env || !context.env.DB) {
      return Response.json({ error: "Cloudflare D1 binding (env.DB) belum terhubung di wrangler.toml." }, { status: 500 });
    }

    if (barcode) {
      const { results } = await context.env.DB.prepare(
        "SELECT * FROM products WHERE barcode = ?"
      ).bind(barcode).all();
      return Response.json(results[0] || null);
    }

    if (search) {
      const { results } = await context.env.DB.prepare(
        "SELECT * FROM products WHERE name LIKE ? OR barcode LIKE ? ORDER BY name ASC"
      ).bind(`%${search}%`, `%${search}%`).all();
      return Response.json(results);
    }

    const { results } = await context.env.DB.prepare(
      "SELECT * FROM products ORDER BY name ASC"
    ).all();
    return Response.json(results);
  } catch (err) {
    return Response.json({ error: formatFriendlyError(err, "memuat data produk") }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { barcode, name, price } = body;

    if (!barcode || !name || price === undefined) {
      return Response.json({ error: "Barcode, nama barang, dan harga wajib diisi" }, { status: 400 });
    }

    if (!context.env || !context.env.DB) {
      return Response.json({ error: "Cloudflare D1 binding (env.DB) belum terhubung di wrangler.toml." }, { status: 500 });
    }

    const stmt = context.env.DB.prepare(
      "INSERT INTO products (barcode, name, price) VALUES (?, ?, ?)"
    ).bind(barcode, name, price);
    
    const result = await stmt.run();
    return Response.json({ success: true, id: result.meta?.last_row_id });
  } catch (err) {
    return Response.json({ error: formatFriendlyError(err, "menambah produk baru") }, { status: 400 });
  }
}

export async function onRequestPut(context) {
  try {
    const body = await context.request.json();
    const { id, barcode, name, price } = body;

    if (!id || !barcode || !name || price === undefined) {
      return Response.json({ error: "ID, barcode, nama barang, dan harga wajib diisi" }, { status: 400 });
    }

    if (!context.env || !context.env.DB) {
      return Response.json({ error: "Cloudflare D1 binding (env.DB) belum terhubung di wrangler.toml." }, { status: 500 });
    }

    await context.env.DB.prepare(
      "UPDATE products SET barcode = ?, name = ?, price = ? WHERE id = ?"
    ).bind(barcode, name, price, id).run();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: formatFriendlyError(err, "memperbarui produk") }, { status: 400 });
  }
}

export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return Response.json({ error: "ID produk wajib disertakan" }, { status: 400 });
    }

    if (!context.env || !context.env.DB) {
      return Response.json({ error: "Cloudflare D1 binding (env.DB) belum terhubung di wrangler.toml." }, { status: 500 });
    }

    await context.env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: formatFriendlyError(err, "menghapus produk") }, { status: 500 });
  }
}
