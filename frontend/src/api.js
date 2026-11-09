const STORAGE_KEY = 'university-service-session';
const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

let session = null;
let refreshPromise = null;

export function readSession() {
  if (session) return session;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    session = stored ? JSON.parse(stored) : null;
    if (!session?.access || !session?.refresh) return null;
    return session;
  } catch {
    return null;
  }
}

export function saveSession(value) {
  session = value;
  if (value) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  else sessionStorage.removeItem(STORAGE_KEY);
}

export function clearSession() {
  saveSession(null);
}

export class ApiError extends Error {
  constructor(message, status = 0, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

export function readApiError(data, status) {
  if (!data || typeof data !== 'object') {
    return new ApiError(status >= 500 ? 'The service is temporarily unavailable. Please try again.' : 'Something went wrong. Please try again.', status);
  }
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'detail' && Array.isArray(value)) fields[key] = value.join(' ');
    else if (key !== 'detail' && typeof value === 'string') fields[key] = value;
  }
  const message = typeof data.detail === 'string' ? data.detail
    : (fields.non_field_errors || Object.values(fields)[0] || 'Please check your information and try again.');
  return new ApiError(message, status, fields);
}

async function parseResponse(response, type) {
  if (response.status === 204 || response.status === 205) return null;
  if (type === 'blob') {
    if (response.ok) return response.blob();
    const parsed = await response.json().catch(() => null);
    throw readApiError(parsed, response.status);
  }
  const parsed = await response.json().catch(() => null);
  if (!response.ok) throw readApiError(parsed, response.status);
  return parsed;
}

async function renewAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const current = readSession();
    if (!current?.refresh) throw new ApiError('Your session has expired. Please sign in again.', 401);
    const response = await fetch(`${API_BASE}/api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: current.refresh }),
    });
    const data = await parseResponse(response);
    // JWT refresh rotation means the previous refresh token is no longer usable.
    saveSession({ ...current, access: data.access, refresh: data.refresh || current.refresh });
    return data.access;
  })().catch((error) => {
    clearSession();
    window.dispatchEvent(new Event('university-session-expired'));
    throw error;
  }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function api(path, { method = 'GET', body, auth = true, responseType, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const current = readSession();
    if (!current?.access) throw new ApiError('Please sign in to continue.', 401);
    headers.Authorization = `Bearer ${current.access}`;
  }
  const request = () => fetch(`${API_BASE}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal,
  });
  let response;
  try {
    response = await request();
    if (auth && response.status === 401) {
      headers.Authorization = `Bearer ${await renewAccessToken()}`;
      response = await request();
    }
    return await parseResponse(response, responseType);
  } catch (error) {
    if (error instanceof ApiError || error.name === 'AbortError') throw error;
    throw new ApiError('Cannot connect to the service. Check your internet connection and try again.');
  }
}

export async function signOut() {
  const current = readSession();
  try {
    if (current?.refresh) {
      // Ensure an expired access token is refreshed before choosing which rotated
      // refresh token must be blacklisted at logout.
      await api('/api/auth/me/');
      await api('/api/auth/logout/', { method: 'POST', body: { refresh: readSession()?.refresh } });
    }
  } catch { /* Still clear local credentials when the network is unavailable. */ }
  clearSession();
}
