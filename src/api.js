// Three helpers:
//   loginRequest  — unauthenticated POST to /api/church-admin/login
//   signupRequest — unauthenticated POST to /api/church-admin/signup
//   makeReq       — authed wrapper that sends the church admin_token as x-church-key
//                   and, when set, the active branch as x-branch-id.
//
// `_activeBranchId` is a module-level pointer that BranchContext writes to
// whenever the user switches branches in the top bar. Every authed request
// then picks it up automatically — pages don't have to thread it through.
let _activeBranchId = null;

export function setActiveBranchIdHeader(id) {
  _activeBranchId = id || null;
}

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
    const headers = {
      'Content-Type': 'application/json',
      'x-church-key': token,
    };
    if (_activeBranchId) headers['x-branch-id'] = String(_activeBranchId);
    const res = await fetch(api + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
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
