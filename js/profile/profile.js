import { apiRequest } from "../api/api.js";
import { showToast } from "../utils/toast.js";

export async function loadProfile() {
  console.log("Memuat profil...");

  const loadingExport = document.getElementById("loadingExport");
  if (loadingExport) loadingExport.style.display = "block";

  const token = localStorage.getItem("token");

  if (!token) {
    console.error("Token tidak ditemukan, silakan login terlebih dahulu!");
    if (loadingExport) loadingExport.style.display = "none";
    return;
  }

  try {
    const response = await apiRequest("/api/profil", {
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Gagal memuat profil");
    }

    const { nama, nip, username, role, foto_path, profesi } = data.data;

    window.currentProfileData = {
      nama,
      nip,
      username,
      role,
      foto_path,
      profesi,
    };

    console.log("Data profil berhasil dimuat:", window.currentProfileData);

    const sectionProfil = document.getElementById("sectionProfil");
    const profilNama = document.getElementById("profilNama");
    const profilNIP = document.getElementById("profilNIP");
    const profilRole = document.getElementById("profilRole");
    const profilePhoto = document.getElementById("profilePhoto");
    const profilProfesi = document.getElementById("profilProfesi");

    if (
      !sectionProfil ||
      !profilNama ||
      !profilNIP ||
      !profilRole ||
      !profilePhoto ||
      !profilProfesi
    ) {
      console.error("Elemen profil tidak ditemukan!");
      return;
    }

    profilNama.textContent = nama || "N/A";
    profilNIP.textContent = nip || "N/A";
    profilRole.textContent = role || "N/A";
    profilProfesi.textContent = profesi || "N/A";

    if (foto_path) {
      profilePhoto.src = `http://127.0.0.1:4000/foto/${foto_path}`;
      profilePhoto.classList.remove("hidden");
    } else {
      profilePhoto.classList.add("hidden");
    }

    window.loadProfileRun = false;
  } catch (err) {
    console.error("Gagal load profil:", err);
    showToast(`Gagal memuat profil: ${err.message}`, "error");
  } finally {
    if (loadingExport) loadingExport.style.display = "none";
  }
}

// Fitur edit profil ditunda karena elemen form dan tombolnya
// belum ditemukan di index.html.
