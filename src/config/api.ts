const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, '');

export const API_BASE_URL = /\/api$/i.test(normalizedApiUrl)
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;

export const API_ENDPOINTS = {
  requestLogin: `${API_BASE_URL}/auth/request-login`,
  verifyOtp: `${API_BASE_URL}/auth/verify-otp`,
  validateToken: `${API_BASE_URL}/auth/validate-token`,
  messages: `${API_BASE_URL}/messages`,
  sendPDF: `${API_BASE_URL}/pdf/send`
};

export const getAuthHeader = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};


