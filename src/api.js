// Three helpers:
//   loginRequest  — unauthenticated POST to /api/church-admin/login
//   signupRequest — unauthenticated POST to /api/church-admin/signup
//   makeReq       — authed wrapper that sends the church admin_token as x-church-key
export async function loginRequest(api, email, password) {
  const res = await fetch(api.replace(/\/$/, '') + '/api/church-admin/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.code   = data.error;
    throw err;
  }
  return data; // { admin_token, church }
}

// Server returns 201 with { message, church: { id, name, admin_email,
// approval_status, created_at } } on success, 409 on duplicate email,
// 400 on validation errors. The new church starts as approval_status='pending'
// and cannot sign in until the main admin approves it.
export async function signupRequest(api, payload) {
  const res = await fetch(api.replace(/\/$/, '') + '/api/church-admin/signup', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.code   = data.error;
    throw err;
  }
  return data;
}

export function makeReq(api, token) {
  return async (path, method = 'GET', body = null) => {
    const res = await fetch(api + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-church-key': token },
      body:    body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || data.message || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  };
}
