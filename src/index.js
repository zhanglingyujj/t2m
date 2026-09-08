function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function signJWT(payload, secret) {
  const encoder = new TextEncoder();
  const header = { alg: 'HS256', typ: 'JWT' };
  const segments = [
    base64URLEncode(encoder.encode(JSON.stringify(header))),
    base64URLEncode(encoder.encode(JSON.stringify(payload)))
  ];
  const signingInput = segments.join('.');
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
  segments.push(base64URLEncode(new Uint8Array(signature)));
  return segments.join('.');
}

async function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    );
    const signingInput = parts[0] + '.' + parts[1];
    const sigStr = parts[2].replace(/-/g, '+').replace(/_/g, '/');
    const signature = Uint8Array.from(atob(sigStr), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(signingInput));
    if (!valid) return null;
    const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

async function authenticate(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/t2m_token=([^;]+)/);
  if (!match) return null;
  return await verifyJWT(match[1], env.JWT_SECRET);
}

function jsonResponse(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });
}

function setCookie(name, value, maxAge) {
  let cookie = name + '=' + value + '; HttpOnly; SameSite=Strict; Path=/';
  if (maxAge != null) cookie += '; Max-Age=' + maxAge;
  return cookie;
}

async function handleLogin(request, env) {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const { username, password } = body || {};
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
    return jsonResponse({ error: '服务器未配置登录凭据' }, 500);
  }
  if (username !== env.ADMIN_USERNAME || password !== env.ADMIN_PASSWORD) {
    return jsonResponse({ error: '用户名或密码错误' }, 401);
  }
  const payload = { sub: username, iat: Math.floor(Date.now() / 1000) };
  const token = await signJWT(payload, env.JWT_SECRET);
  return jsonResponse({ success: true, username }, 200, {
    'Set-Cookie': setCookie('t2m_token', token, 86400 * 7)
  });
}

async function handleLogout(request, env) {
  return jsonResponse({ success: true }, 200, {
    'Set-Cookie': setCookie('t2m_token', '', 0)
  });
}

async function handleAuthStatus(request, env) {
  const user = await authenticate(request, env);
  return jsonResponse({
    authenticated: !!user,
    username: user ? user.sub : null
  });
}

async function handleGetHistory(request, env) {
  const user = await authenticate(request, env);
  if (!user) return jsonResponse({ error: '未登录' }, 401);
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  let rows;
  if (q) {
    const stmt = env.DB.prepare(
      'SELECT * FROM history WHERE user_id = ? AND (name LIKE ? OR info_hash LIKE ?) ORDER BY created_at DESC'
    );
    const result = await stmt.bind(user.sub, '%' + q + '%', q + '%').all();
    rows = result.results;
  } else {
    const stmt = env.DB.prepare(
      'SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC'
    );
    const result = await stmt.bind(user.sub).all();
    rows = result.results;
  }
  return jsonResponse(rows);
}

async function handlePostHistory(request, env) {
  const user = await authenticate(request, env);
  if (!user) return jsonResponse({ error: '未登录' }, 401);
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const { name, infoHash, magnet, fileCount, totalSize, files, trackers } = body || {};
  if (!name || !infoHash || !magnet) {
    return jsonResponse({ error: '缺少必要字段' }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const stmt = env.DB.prepare(
    'INSERT OR IGNORE INTO history (id, user_id, name, info_hash, magnet, file_count, total_size, files_json, trackers_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  await stmt.bind(
    id, user.sub, name, infoHash, magnet,
    fileCount || null, totalSize || null,
    files ? JSON.stringify(files) : null,
    trackers ? JSON.stringify(trackers) : null, now
  ).run();
  const getStmt = env.DB.prepare('SELECT * FROM history WHERE id = ?');
  const row = (await getStmt.bind(id).all()).results[0];
  return jsonResponse(row, 201);
}

async function handleDeleteHistory(request, env, historyId) {
  const user = await authenticate(request, env);
  if (!user) return jsonResponse({ error: '未登录' }, 401);
  const stmt = env.DB.prepare('DELETE FROM history WHERE id = ? AND user_id = ?');
  await stmt.bind(historyId, user.sub).run();
  return jsonResponse({ success: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/auth/login') return handleLogin(request, env);
    if (path === '/api/auth/logout') return handleLogout(request, env);
    if (path === '/api/auth/status') return handleAuthStatus(request, env);

    if (path === '/api/history') {
      if (request.method === 'GET') return handleGetHistory(request, env);
      if (request.method === 'POST') return handlePostHistory(request, env);
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const historyDeleteMatch = path.match(/^\/api\/history\/([a-zA-Z0-9-]+)$/);
    if (historyDeleteMatch && request.method === 'DELETE') {
      return handleDeleteHistory(request, env, historyDeleteMatch[1]);
    }

    return env.ASSETS.fetch(request);
  }
};