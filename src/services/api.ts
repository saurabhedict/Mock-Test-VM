/**
 * api.ts — Axios instance with automatic token refresh
 *
 * Flow:
 * 1. Every request gets the access token attached as: Authorization: Bearer <token>
 * 2. If a 401 with code "TOKEN_EXPIRED" comes back:
 *    → Call POST /api/auth/refresh-token (HTTP-only cookie sent automatically)
 *    → Get a new access token
 *    → Retry the original request with the new token
 * 3. If refresh also fails → clear session, redirect to /login
 *
 * In development, Vite proxies /api → http://localhost:5000, so no CORS issues.
 * In production, set VITE_API_URL to your backend URL in .env.
 */

import axios from "axios";

// In dev: "/api" is proxied by Vite. In prod: set VITE_API_URL=https://yourapi.com/api
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Sends HTTP-only refresh token cookie automatically
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor — attach access token ──────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — auto-refresh on 401 ─────────────────────────────
let isRefreshing = false;
let queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isExpired =
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED" &&
      !original._retry;

    if (!isExpired) return Promise.reject(error);

    if (isRefreshing) {
      // Queue this request — retry it once refresh completes
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh-token`,
        {},
        { withCredentials: true }
      );
      const newToken = data.accessToken;
      sessionStorage.setItem("accessToken", newToken);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

      // Flush the queue
      queue.forEach((r) => r.resolve(newToken));
      queue = [];

      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshErr) {
      queue.forEach((r) => r.reject(refreshErr));
      queue = [];
      sessionStorage.removeItem("accessToken");
      window.location.href = "/login";
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
