import { apiRequest } from "../api/api.js";
export function getToken() {
  return localStorage.getItem("token");
}

export function isLoggedIn() {
  return Boolean(getToken());
}

import { apiRequest } from "../api/api.js";

export function getToken() {
  return localStorage.getItem("token");
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export async function logout() {
  const token = getToken();

  try {
    const response = await apiRequest("/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 404) {
      alert(
        "⛔ Endpoint logout tidak ditemukan! Pastikan server berjalan dan endpoint tersedia.",
      );
      return;
    }

    const data = await response.json();
    console.log("Respons logout:", data);

    if (data.success) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login.html";
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error logout:", error);
    alert("Terjadi kesalahan saat logout: " + error.message);
  }
}
