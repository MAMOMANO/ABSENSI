const API_BASE_URL = "http://localhost:4000";

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...options.headers,
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return response;
}
