import { showToast } from "../utils/toast.js";

import {
  video,
  currentStream,
  startCamera,
  stopCamera,
} from "../camera/attendance-camera.js";

const canvas = document.createElement("canvas");
const context = canvas.getContext("2d");
export async function sendWithPhotoAndQR(qrData = null) {
  const loadingText = document.getElementById("loadingScan");
  loadingText.style.display = "block";

  const token = localStorage.getItem("token");
  if (!token) {
    loadingText.style.display = "none";
    showToast("❌ Silakan login terlebih dahulu!", "error");
    return;
  }

  //   if (!currentStream || video.readyState === 0) {
  //     console.warn("Kamera tidak aktif, mencoba mengaktifkan ulang...");
  //     await startCamera();
  //     await new Promise((resolve) => {
  //       video.addEventListener(
  //         "loadeddata",
  //         () => {
  //           console.log("Video siap ulang, readyState:", video.readyState);
  //           resolve();
  //         },
  //         { once: true },
  //       );
  //       setTimeout(() => {
  //         if (video.readyState < 2) {
  //           console.error("❌ Gagal mengaktifkan ulang kamera");
  //           showToast("❌ Gagal mengaktifkan kamera, coba lagi!", "error");
  //           loadingText.style.display = "none";
  //           resolve();
  //         }
  //       }, 5000);
  //     });
  //   }
  if (!currentStream || video.readyState === 0) {
    console.warn("Kamera tidak aktif, mencoba mengaktifkan ulang...");

    const cameraReady = await startCamera();

    if (!cameraReady) {
      loadingText.style.display = "none";
      return;
    }
  }

  if (video.readyState !== video.HAVE_ENOUGH_DATA) {
    loadingText.style.display = "none";
    console.error("❌ Video belum siap:", video.readyState);
    showToast("⚠ Kamera belum siap, coba lagi!", "warning");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  if (canvas.height === 0) {
    console.error("❌ Tinggi kanvas adalah 0, periksa stream video!");
    loadingText.style.display = "none";
    showToast(
      "⚠ Kamera tidak mengembalikan ukuran yang valid, coba lagi!",
      "warning",
    );
    stopCamera();
    return;
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  stopCamera();

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log("Geolokasi berhasil:", position.coords);
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const location = `${lat},${lon}`;

        canvas.toBlob(
          async (blob) => {
            if (!blob || !(blob instanceof Blob)) {
              console.error("❌ Blob tidak valid:", blob);
              loadingText.style.display = "none";
              showToast("❌ Gagal mengambil gambar dari kamera!", "error");
              stopCamera();
              return;
            }

            const form = new FormData();
            form.append("image", blob, "selfie.jpg");
            if (qrData) form.append("qrData", String(qrData || ""));
            console.log("Mengirim data:", {
              qrData,
              location,
              photo: { size: blob.size, type: blob.type },
            });

            try {
              const response = await fetch(
                "http://localhost:4000/absensi?test=true",
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "x-location": location,
                  },
                  body: form,
                },
              );
              const data = await response.json();
              loadingText.style.display = "none";

              if (response.ok) {
                window.isPostAbsensi = true;
                showToast(`✅ Absensi berhasil untuk ${data.name}!`, "success");
                setTimeout(() => {
                  window.isPostAbsensi = false;
                }, 3000);
              } else {
                let errorMessage = data.message || "Kesalahan server";
                if (response.status === 401)
                  errorMessage = "❌ Token tidak valid, silakan login ulang!";
                if (response.status === 403)
                  errorMessage = data.message || "❌ Akses ditolak!"; // Gunakan pesan dari backend
                if (response.status === 400)
                  errorMessage = data.message || "❌ Permintaan tidak valid!";
                showToast(errorMessage, "error");
              }
            } catch (err) {
              loadingText.style.display = "none";
              console.error("Gagal absensi:", err);
              showToast("❌ Kesalahan koneksi ke server.", "error");
            }
          },
          "image/jpeg",
          0.8,
        );
      },
      (error) => {
        loadingText.style.display = "none";
        console.error("Error geolokasi:", error);
        showToast("❌ Izinkan akses lokasi untuk absensi!", "error");
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  } else {
    loadingText.style.display = "none";
    showToast("❌ Geolokasi tidak didukung oleh browser!", "error");
  }
}
