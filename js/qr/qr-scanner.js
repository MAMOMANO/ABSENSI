import { showToast } from "../utils/toast.js";
import { sendWithPhotoAndQR } from "../attendance/attendance.js";

import {
  video,
  isScanning,
  stopCamera,
  setScanningStatus,
} from "../camera/attendance-camera.js";
const canvas = document.createElement("canvas");
const context = canvas.getContext("2d");
let qrData = null;

const loadingText = document.getElementById("loadingScan");
const submitAbsensiBtn = document.getElementById("submitAbsensi");

export function scanQRCode() {
  console.log("Memulai scanQRCode...");
  qrData= null;
//   const loadingText = document.getElementById("loadingScan");
//   const submitAbsensiBtn = document.getElementById("submitAbsensi");
  loadingText.style.display = "block";
  loadingText.textContent = "Memindai QR Code...";

  if (!window.jsQR) {
    console.error("❌ Pustaka jsQR tidak dimuat!");
    loadingText.style.display = "none";
    showToast("❌ Pustaka QR tidak dimuat, periksa script!", "error");
    stopCamera();
    return;
  }

  function scanFrame() {
    if (!isScanning || video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.error("❌ Kamera tidak siap:", video.readyState);
      loadingText.style.display = "none";
      showToast("⚠ Kamera tidak siap, coba lagi!", "warning");
      stopCamera();
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (canvas.height === 0) {
      console.error("❌ Tinggi kanvas adalah 0, periksa stream video!");
      loadingText.style.display = "none";
      showToast("⚠ Kamera tidak mengembalikan ukuran yang valid!", "warning");
      stopCamera();
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    console.log("Dimensi gambar:", imageData.width, imageData.height);

    const code = window.jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      console.log("✅ QR terdeteksi:", code.data);
      qrData = code.data;

      setScanningStatus(false);

      loadingText.textContent =
        "QR Code terdeteksi! Klik 'Kirim Absensi' untuk melanjutkan.";
      submitAbsensiBtn.classList.remove("hidden");
    }
  }

  setScanningStatus(true);

  requestAnimationFrame(scanFrame);
}

submitAbsensiBtn.addEventListener(
  "click",
  () => {
    if (qrData) {
      sendWithPhotoAndQR(qrData);
    } else {
      showToast("❌ QR Code belum terdeteksi!", "error");
    }
  },
);
