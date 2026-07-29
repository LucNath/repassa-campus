export type Listing = { id: number; userId: string; title: string; description: string; category: string; price: number | null; isDonation: boolean; imageUrl: string; createdAt: string };
export type ListingInput = Omit<Listing, 'id' | 'createdAt' | 'userId'>;
export type AuthUser = { id: string; name: string; email: string };
export type AuthSession = { token: string; user: AuthUser };
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';
const SESSION_KEY = 'repassa-session';

function storedSession(): AuthSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as AuthSession | null; }
  catch { return null; }
}

function saveSession(session: AuthSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = storedSession()?.token;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers } });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error ?? 'Não foi possível concluir a operação.'); }
  return response.status === 204 ? undefined as T : response.json();
}
export const api = {
  listings: (query = '') => request<Listing[]>(`/listings${query}`),
  stats: () => request<{ totalListings: number; donations: number; activeUsers: number }>('/stats'),
  create: (listing: ListingInput) => request<Listing>('/listings', { method: 'POST', body: JSON.stringify(listing) }),
  update: (id: number, listing: ListingInput) => request<Listing>(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(listing) }),
  remove: (id: number) => request<void>(`/listings/${id}`, { method: 'DELETE' }),
  getSession: storedSession,
  login: async (input: { email: string; password: string }) => { const result = await request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify(input) }); saveSession(result); return result; },
  register: async (input: { name: string; email: string; password: string }) => { const result = await request<AuthSession>('/auth/register', { method: 'POST', body: JSON.stringify(input) }); saveSession(result); return result; },
  logout: () => saveSession(null)
};
