import { showToast } from "../utils/toast.js";
// import { scanQRCode } from "../qr/qr-scanner.js";

// Elemen kamera absensi
// const video = document.getElementById("preview");
export const video = document.getElementById("preview");
const startCameraBtn = document.getElementById("startCamera");
const stopCameraBtn = document.getElementById("stopCamera");

// Status kamera
export let currentStream = null;
export let isScanning = false;
let scanStart = 0;
export function setScanningStatus(status) {
  isScanning = status;
}

// 🔹 Mengaktifkan Kamera

export async function startCamera(onVideoReady = null) {
  console.log("🎥 Memulai kamera...");

  if (!video) {
    console.error("❌ Elemen video tidak ditemukan!");
    showToast("❌ Elemen video tidak ditemukan!", "error");
    return false;
  }

  try {
    // 1. Tunggu sampai browser memberikan akses kamera
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });

    currentStream = stream;
    video.srcObject = stream;

    // 2. Tampilkan elemen kamera
    video.classList.remove("hidden");
    video.removeAttribute("hidden");
    video.style.cssText =
      "display: block !important; visibility: visible !important; width: 100%; height: auto;";

    const placeholder = document.getElementById("cameraPlaceholder");
    if (placeholder) placeholder.style.display = "none";

    if (stopCameraBtn) {
      stopCameraBtn.classList.remove("hidden");
      stopCameraBtn.style.display = "inline-block";
    }

    if (startCameraBtn) {
      startCameraBtn.style.display = "none";
    }

    // 3. Tunggu sampai data video tersedia
    if (video.readyState < 2) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Waktu tunggu video habis"));
        }, 5000);

        video.addEventListener(
          "loadeddata",
          () => {
            clearTimeout(timeout);
            resolve();
          },
          { once: true },
        );
      });
    }

    // 4. Tunggu sampai video berhasil diputar
    await video.play();

    console.log("✅ Video berhasil diputar");

    // 5. Jalankan callback jika diberikan
    if (typeof onVideoReady === "function") {
      onVideoReady();
    }

    return true;
  } catch (err) {
    console.error("❌ Gagal mengaktifkan kamera:", err);

    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop());
      currentStream = null;
    }

    video.srcObject = null;

    let errorMessage = "❌ Gagal mengakses kamera!";

    if (err.name === "NotAllowedError") {
      errorMessage = "❌ Akses kamera ditolak! Mohon izinkan akses kamera.";
    } else if (err.name === "NotFoundError") {
      errorMessage = "❌ Kamera tidak ditemukan!";
    } else if (err.name === "NotReadableError") {
      errorMessage = "❌ Kamera sedang digunakan aplikasi lain!";
    } else if (err.message === "Waktu tunggu video habis") {
      errorMessage = "❌ Video tidak siap, silakan coba lagi!";
    }

    showToast(errorMessage, "error");
    return false;
  }
}

export function stopCamera() {
  console.log("🛑 Menghentikan kamera...");
  if (currentStream) {
    currentStream.getTracks().forEach((track) => {
      track.stop();
      console.log("🛑 Track dihentikan:", track.kind);
    });
    currentStream = null;
  }

  if (video) {
    video.srcObject = null;
    video.style.cssText =
      "display: none !important; visibility: hidden !important;";
    video.classList.add("hidden");
  }

  const placeholder = document.getElementById("cameraPlaceholder");
  if (placeholder) placeholder.style.display = "flex";

  if (stopCameraBtn) {
    stopCameraBtn.classList.add("hidden");
    stopCameraBtn.style.display = "none";
  }
  if (startCameraBtn) startCameraBtn.style.display = "inline-block";

  isScanning = false;

  const loadingText = document.getElementById("loadingScan");
  if (loadingText) loadingText.style.display = "none";
}
