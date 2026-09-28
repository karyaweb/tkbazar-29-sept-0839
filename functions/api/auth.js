/**
 * Cloudflare Pages Function: /api/auth
 * Menangani Login, Proteksi User, dan Kelola User (ADMIN) untuk Cloudflare D1
 */

export async function onRequestPost(context) {
  try {
    const url = new URL(context.request.url);
    const action = url.searchParams.get('action') || 'login';

    if (!context.env || !context.env.DB) {
      return Response.json({ error: "Database D1 belum terhubung di wrangler.toml." }, { status: 500 });
    }

    const db = context.env.DB;
    const body = await context.request.json();

    if (action === 'login') {
      const { username, password } = body;
      if (!username || !password) {
        return Response.json({ error: "Username dan Password wajib diisi!" }, { status: 400 });
      }

      // Check user in database
      const { results } = await db.prepare(
        "SELECT id, username, password, name, role FROM users WHERE LOWER(username) = LOWER(?)"
      ).bind(username.trim()).all();

      const user = results[0];
      if (!user || user.password !== password) {
        return Response.json({ error: "Username atau Password salah!" }, { status: 401 });
      }

      return Response.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        }
      });
    }

    // Add new user (ADMIN action)
    if (action === 'create_user') {
      const { username, password, name, role } = body;
      if (!username || !password || !name) {
        return Response.json({ error: "Username, Password, dan Nama wajib diisi!" }, { status: 400 });
      }

      const userRole = (role === 'ADMIN') ? 'ADMIN' : 'KASIR';

      await db.prepare(
        "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)"
      ).bind(username.trim().toLowerCase(), password, name.trim(), userRole).run();

      return Response.json({ success: true, message: "User baru berhasil ditambahkan!" });
    }

    // Reset Password / Edit User (ADMIN action)
    if (action === 'update_user') {
      const { id, password, name, role } = body;
      if (!id) {
        return Response.json({ error: "ID user wajib disertakan!" }, { status: 400 });
      }

      if (password && password.trim() !== '') {
        await db.prepare(
          "UPDATE users SET name = ?, role = ?, password = ? WHERE id = ?"
        ).bind(name, role, password, id).run();
      } else {
        await db.prepare(
          "UPDATE users SET name = ?, role = ? WHERE id = ?"
        ).bind(name, role, id).run();
      }

      return Response.json({ success: true, message: "Data user / password berhasil diperbarui!" });
    }

    return Response.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (err) {
    const rawMsg = err.message || '';
    if (rawMsg.includes('UNIQUE constraint failed: users.username')) {
      return Response.json({ error: "Username tersebut sudah dipakai. Silakan gunakan username lain." }, { status: 400 });
    }
    return Response.json({ error: `Gagal memproses otentikasi: ${rawMsg}` }, { status: 500 });
  }
}

export async function onRequestGet(context) {
  try {
    if (!context.env || !context.env.DB) {
      return Response.json({ error: "Database D1 belum terhubung." }, { status: 500 });
    }

    const { results } = await context.env.DB.prepare(
      "SELECT id, username, name, role, password, created_at FROM users ORDER BY id ASC"
    ).all();

    return Response.json(results || []);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return Response.json({ error: "ID user wajib disertakan" }, { status: 400 });
    }

    if (!context.env || !context.env.DB) {
      return Response.json({ error: "Database D1 belum terhubung." }, { status: 500 });
    }

    await context.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
