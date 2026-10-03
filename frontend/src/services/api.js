const API_BASE = '/api';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('splitsub_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || (typeof data === 'string' ? data : 'API Request failed');
    throw new ApiError(errorMsg, response.status, data);
  }

  return data;
}

export const api = {
  // Auth
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  login: async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new ApiError(err.detail || 'Login failed', response.status, err);
    }
    return response.json();
  },
  getMe: () => request('/auth/me'),
  updateMe: (data) => request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  listUsers: (query) => request(`/auth/users${query ? `?query=${encodeURIComponent(query)}` : ''}`),

  // Subscriptions
  getSubscriptions: (roleFilter, statusFilter) => {
    const params = new URLSearchParams();
    if (roleFilter) params.append('role_filter', roleFilter);
    if (statusFilter) params.append('status_filter', statusFilter);
    const q = params.toString() ? `?${params.toString()}` : '';
    return request(`/subscriptions${q}`);
  },
  getSubscription: (id) => request(`/subscriptions/${id}`),
  createSubscription: (data) => request('/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
  updateSubscription: (id, data) => request(`/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelSubscription: (id) => request(`/subscriptions/${id}`, { method: 'DELETE' }),
  pauseSubscription: (id) => request(`/subscriptions/${id}/pause`, { method: 'POST' }),
  resumeSubscription: (id) => request(`/subscriptions/${id}/resume`, { method: 'POST' }),
  addMember: (subId, email, role) => request(`/subscriptions/${subId}/members?email=${encodeURIComponent(email)}&role=${role || 'member'}`, { method: 'POST' }),
  removeMember: (subId, memberId) => request(`/subscriptions/${subId}/members/${memberId}`, { method: 'DELETE' }),
  generateNextCycle: (subId) => request(`/subscriptions/${subId}/next-cycle`, { method: 'POST' }),

  // Split calculation
  previewSplit: (data) => request('/splits/preview', { method: 'POST', body: JSON.stringify(data) }),

  // Payments & Sandbox
  getObligations: (statusFilter) => request(`/payments/obligations${statusFilter ? `?status_filter=${statusFilter}` : ''}`),
  initiatePayment: (obligationId) => request(`/payments/${obligationId}/initiate`, { method: 'POST' }),
  confirmPayment: (obligationId, data) => request(`/payments/${obligationId}/confirm`, { method: 'POST', body: JSON.stringify(data) }),
  getTransactions: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.subscriptionId) params.append('subscription_id', filters.subscriptionId);
    if (filters.status) params.append('status_filter', filters.status);
    const q = params.toString() ? `?${params.toString()}` : '';
    return request(`/payments/history${q}`);
  },

  // Settlements
  getSettlements: () => request('/settlements'),
  getSubscriptionSettlement: (subId) => request(`/settlements/${subId}`),

  // Reminders
  sendReminders: (subId) => request(`/subscriptions/${subId}/reminders`, { method: 'POST' }),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/mark-all-read', { method: 'POST' }),

  // Analytics
  getDashboardAnalytics: () => request('/analytics/dashboard'),
};
