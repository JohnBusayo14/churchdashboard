// Two helpers:
//   loginRequest — unauthenticated POST to /api/church-admin/login
//   makeReq      — authed wrapper that sends the church admin_token as x-church-key
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
