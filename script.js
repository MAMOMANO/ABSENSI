    // Pastikan elemen ada sebelum digunakan
    "use strict";
    console.log("Fungsi editMember tersedia:", typeof editMember);
    const video = document.getElementById("preview");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const resultText = document.getElementById("scanResult");
    const startCameraBtn = document.getElementById("startCamera");
    const stopCameraBtn = document.getElementById("stopCamera");
    const themeToggle = document.getElementById('themeToggle');
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    let currentStream = null;
    let isScanning = false;
    let scanStart = 0;


    const currentTheme = document.documentElement.classList.contains('dark');
        updateThemeIcons(currentTheme);
        
        themeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            updateThemeIcons(isDark);
        });
        
        function updateThemeIcons(isDark) { const navItems = {
            'tabAbsensi': 'sectionAbsensi',
            'tabDaftar': 'sectionDaftar',
            'tabDashboard': 'sectionDashboard',
            'tabDetailAnggota': 'sectionDetailAnggota',
            'tabLaporan': 'sectionLaporan',
            'btnProfile': 'sectionProfil'
        };
            if (isDark) {
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            } else {
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            }
        }

        function showToast(message, type = "success") {
          const toast = document.createElement("div");
          const icons = {
              success: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
              error: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"></path></svg>',
              warning: '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"></path></svg>',
          };
          const colors = {
              success: "bg-green-500",
              error: "bg-red-500",
              warning: "bg-yellow-500",
          };
          toast.className = `${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 opacity-0 transition-opacity duration-300`;
          toast.innerHTML = `
              <div class="flex-shrink-0">${icons[type]}</div>
              <span class="font-medium">${message}</span>
              <button id="closeToast" class="ml-4 text-white hover:text-gray-200">×</button>
          `;
          const toastContainer = document.getElementById("toastContainer");
          if (!toastContainer) {
              console.error("❌ toastContainer tidak ditemukan!");
              return;
          }
          toastContainer.appendChild(toast);
          setTimeout(() => {
              toast.style.opacity = "1";
          }, 10);
          setTimeout(() => {
              toast.style.opacity = "0";
              setTimeout(() => toast.remove(), 300);
          }, 7000);
          const closeButton = toast.querySelector("#closeToast");
          closeButton.addEventListener("click", () => {
              toast.style.opacity = "0";
              setTimeout(() => toast.remove(), 300);
          });
      }

    // 🔹 Mengaktifkan Kamera
    function startCamera() {
      console.log("🎥 Memulai kamera...");
      if (!video) {
        console.error("❌ Elemen video tidak ditemukan!");
        showToast("❌ Elemen video tidak ditemukan!", "error");
        return;
      }

      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 640 },
            height: { ideal: 480 },
            // width: { ideal: 1280 },
            // height: { ideal: 720 },
          },
        })
        .then((stream) => {
          console.log("✅ Stream kamera berhasil didapat");
          currentStream = stream;
          video.srcObject = stream;

          video.classList.remove("hidden");
          video.removeAttribute("hidden");
          video.style.cssText = "display: block !important; visibility: visible !important; width: 100%; height: auto;";

          const placeholder = document.getElementById("cameraPlaceholder");
          if (placeholder) placeholder.style.display = "none";

          if (stopCameraBtn) {
            stopCameraBtn.classList.remove("hidden");
            stopCameraBtn.style.display = "inline-block";
          }
          if (startCameraBtn) startCameraBtn.style.display = "none";

          const playVideo = () => {
            return video
              .play()
              .then(() => {
                console.log("✅ Video berhasil diputar");
                setTimeout(() => {
                  if (!isScanning) {
                    isScanning = true;
                    scanStart = Date.now();
                    scanQRCode();
                  }
                }, 500);
              })
              .catch((err) => {
                console.error("❌ Gagal memutar video:", err);
                showToast("❌ Gagal memutar video!", "error");
              });
          };

          if (video.readyState >= 2) {
            playVideo();
          } else {
            video.addEventListener("loadeddata", playVideo, { once: true });
            setTimeout(() => {
              console.log("Dimensi video:", video.videoWidth, video.videoHeight);
              if (video.readyState >= 2 && video.paused) playVideo();
            }, 1000);
          }
        })
        .catch((err) => {
          console.error("❌ Gagal akses kamera:", err);
          let errorMessage = "❌ Gagal mengakses kamera!";
          if (err.name === "NotAllowedError") {
            errorMessage = "❌ Akses kamera ditolak! Mohon izinkan akses kamera.";
          } else if (err.name === "NotFoundError") {
            errorMessage = "❌ Kamera tidak ditemukan!";
          } else if (err.name === "NotReadableError") {
            errorMessage = "❌ Kamera sedang digunakan aplikasi lain!";
          }
          showToast(errorMessage, "error");
        });
    }

    // 🔹 Mematikan Kamera
    function stopCamera() {
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
        video.style.cssText = "display: none !important; visibility: hidden !important;";
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

async function sendWithPhotoAndQR(qrData = null) {
  const loadingText = document.getElementById("loadingScan");
  loadingText.style.display = "block";

  const token = localStorage.getItem("token");
  if (!token) {
    loadingText.style.display = "none";
    showToast("❌ Silakan login terlebih dahulu!", "error");
    return;
  }

  if (!currentStream || video.readyState === 0) {
    console.warn("Kamera tidak aktif, mencoba mengaktifkan ulang...");
    await startCamera();
    await new Promise((resolve) => {
      video.addEventListener("loadeddata", () => {
        console.log("Video siap ulang, readyState:", video.readyState);
        resolve();
      }, { once: true });
      setTimeout(() => {
        if (video.readyState < 2) {
          console.error("❌ Gagal mengaktifkan ulang kamera");
          showToast("❌ Gagal mengaktifkan kamera, coba lagi!", "error");
          loadingText.style.display = "none";
          resolve();
        }
      }, 5000);
    });
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
    showToast("⚠ Kamera tidak mengembalikan ukuran yang valid, coba lagi!", "warning");
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
              const response = await fetch("http://localhost:4000/absensi?test=true", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "x-location": location,
                },
                body: form,
              });
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
                if (response.status === 401) errorMessage = "❌ Token tidak valid, silakan login ulang!";
                if (response.status === 403) errorMessage = data.message || "❌ Akses ditolak!"; // Gunakan pesan dari backend
                if (response.status === 400) errorMessage = data.message || "❌ Permintaan tidak valid!";
                showToast(errorMessage, "error");
              }
            } catch (err) {
              loadingText.style.display = "none";
              console.error("Gagal absensi:", err);
              showToast("❌ Kesalahan koneksi ke server.", "error");
            }
          },
          "image/jpeg",
          0.8
        );
      },
      (error) => {
        loadingText.style.display = "none";
        console.error("Error geolokasi:", error);
        showToast("❌ Izinkan akses lokasi untuk absensi!", "error");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  } else {
    loadingText.style.display = "none";
    showToast("❌ Geolokasi tidak didukung oleh browser!", "error");
  }
}

  function scanQRCode() {
    console.log("Memulai scanQRCode...");
    const loadingText = document.getElementById("loadingScan");
    const submitAbsensiBtn = document.getElementById("submitAbsensi");
    loadingText.style.display = "block";
    loadingText.textContent = "Memindai QR Code...";

    if (!window.jsQR) {
        console.error("❌ Pustaka jsQR tidak dimuat!");
        loadingText.style.display = "none";
        showToast("❌ Pustaka QR tidak dimuat, periksa script!", "error");
        stopCamera();
        return;
    }

    let qrData = null;

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

        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
            console.log("✅ QR terdeteksi:", code.data);
            qrData = code.data;
            loadingText.textContent = "QR Code terdeteksi! Klik 'Kirim Absensi' untuk melanjutkan.";
            submitAbsensiBtn.classList.remove("hidden");
            // stopCamera();
        } else {
            console.warn("QR tidak terdeteksi, mencoba lagi...");
            requestAnimationFrame(scanFrame);
        }
    }

    requestAnimationFrame(scanFrame);

    submitAbsensiBtn.addEventListener("click", () => {
        if (qrData) {
            sendWithPhotoAndQR(qrData);
        } else {
            showToast("❌ QR Code belum terdeteksi!", "error");
        }
    }, { once: true });
}

    // 🔹 Event Listener Kamera
    if (startCameraBtn) startCameraBtn.addEventListener("click", startCamera);
    if (stopCameraBtn) stopCameraBtn.addEventListener("click", stopCamera);
    
    function toggleProfesi() {
      const role = document.getElementById("role").value;
      const profesiSelect = document.getElementById("profesi");
      if (role === "admin") {
        profesiSelect.disabled = true;
        profesiSelect.value = ""; // Kosongkan profesi untuk admin
      } else {
        profesiSelect.disabled = false;
      }
    }

    if (document.getElementById("form-karyawan")) {
      const roleSelect = document.getElementById("role");
      const profesiSelect = document.getElementById("profesi");

      // Fungsi untuk mengatur status profesi berdasarkan role
      function updateProfesiState() {
        if (roleSelect.value === "admin") {
          profesiSelect.disabled = true;
          profesiSelect.value = ""; // Reset pilihan profesi
        } else if (roleSelect.value === "karyawan") {
          profesiSelect.disabled = false;
        }
      }
      // / Panggil saat halaman dimuat dan saat role berubah
      roleSelect.addEventListener("change", updateProfesiState);
      updateProfesiState(); // Panggil saat inisialisasi


const formKaryawan = document.getElementById("form-karyawan");
if (formKaryawan) {
    formKaryawan.addEventListener("submit", async function (event) {
        event.preventDefault();

        // Ambil elemen dengan pengecekan
       const namaInput = document.getElementById("nama");
        const nipInput = document.getElementById("nip");
        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");
        const roleInput = document.getElementById("role");
        const profesiInput = document.getElementById("profesi");
        const fileInput = document.getElementById("fotoUpload");
        const messageDaftar = document.getElementById("messageDaftar");
        const loadingText = document.getElementById("loadingDaftar");
        const generatedQR = document.getElementById("generatedQR");
        const qrPlaceholder = document.getElementById("qrPlaceholder");
        const downloadBtn = document.getElementById("downloadBtn");

        console.log("Semua elemen:", {
          namaInput,
          nipInput,
          usernameInput,
          passwordInput,
          roleInput,
          profesiInput,
          fileInput,
          messageDaftar,
          loadingText,
          generatedQR,
          qrPlaceholder,
          downloadBtn
        });

        // Periksa apakah semua elemen wajib ada
        if (!namaInput || !nipInput || !usernameInput || !passwordInput || !roleInput || !messageDaftar || !loadingText) {
            console.error("Salah satu elemen formulir tidak ditemukan!");
            messageDaftar.innerText = "❌ Elemen formulir tidak ditemukan, periksa HTML!";
            messageDaftar.style.color = "red";
            return;
        }

        // Ambil nilai dengan pengecekan dan trim
        const nama = namaInput.value.trim(); // Baris 374
        const nip = nipInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const role = roleInput.value;
        const profesi = profesiInput?.value || "";
        
        const token = localStorage.getItem("token");
        if (!token) {
            messageDaftar.innerText = "❌ Silakan login sebagai admin!";
            messageDaftar.style.color = "red";
            loadingText.style.display = "none";
            return;
        }

        if (!nama || !nip.match(/^\d+$/) || !username || !password || !role) {
            messageDaftar.innerText = "❌ Semua field wajib diisi dan NIP harus angka!";
            messageDaftar.style.color = "red";
            return;
        }

        // Foto wajib untuk karyawan, opsional untuk admin
        if (role === "karyawan" && !fileInput.files[0] && !window.fotoBlobDaftar) {
            messageDaftar.innerText = "⚠ Harap unggah foto atau ambil dari kamera untuk karyawan!";
            messageDaftar.style.color = "orange";
            return;
        }

        loadingText.style.display = "block";
        const formData = new FormData();
        formData.append("nama", nama);
        formData.append("nip", nip);
        formData.append("username", username);
        formData.append("password", password);
        formData.append("role", role);
        formData.append("profesi", profesi);
        console.log("Profesi yang dikirim:", profesi);

        if (fileInput.files[0]) {
            formData.append("foto", fileInput.files[0]);
            console.log("File diunggah:", {
                name: fileInput.files[0].name,
                size: fileInput.files[0].size,
                type: fileInput.files[0].type,
            });
        } else if (window.fotoBlobDaftar) {
            formData.append("foto", window.fotoBlobDaftar, "kamera.jpg");
            console.log("Foto dari kamera diunggah:", {
                size: window.fotoBlobDaftar.size,
                type: window.fotoBlobDaftar.type,
            });
        } else {
            console.log("Tidak ada foto diunggah");
        }

        // Log isi FormData
        for (let [key, value] of formData.entries()) {
            console.log(`FormData: ${key} =`, value);
        }

        try {
            const response = await fetch("http://localhost:4000/daftar-dengan-foto", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await response.json();
            loadingText.style.display = "none";

            if (response.ok) {
                messageDaftar.innerText = "✅ Pendaftaran berhasil!";
                messageDaftar.style.color = "green";
                if (role === "karyawan" && data.qr_code_url) {
                    generatedQR.src = data.qr_code_url;
                    generatedQR.classList.remove("hidden");
                    qrPlaceholder.classList.add("hidden");
                    downloadBtn.href = data.qr_code_url;
                    downloadBtn.classList.remove("hidden");
                } else {
                    generatedQR.classList.add("hidden");
                    qrPlaceholder.classList.remove("hidden");
                    downloadBtn.classList.add("hidden");
                }

                formKaryawan.reset();
                if (window.currentProfileData?.role === "admin" && tabDaftar && sectionDaftar) {
                    console.log("Mengatur ulang ke tab Pendaftaran dengan prioritas...");
                    window.isPostRegistration = true;
                    requestAnimationFrame(() => {
                        showOnlySection(tabDaftar, sectionDaftar);
                    });
                    window.isPostRegistration = false;
                }
            } else {
                let errorMessage = data.message || "Kesalahan server";
                if (response.status === 401) errorMessage = "❌ Token tidak valid, silakan login ulang!";
                if (response.status === 403) errorMessage = "❌ Akses ditolak, hanya admin yang diizinkan!";
                messageDaftar.innerText = `❌ Gagal: ${errorMessage}`;
                messageDaftar.style.color = "red";
            }
        } catch (error) {
            loadingText.style.display = "none";
            console.error("Gagal mendaftar:", error);
            messageDaftar.innerText = "❌ Terjadi kesalahan saat mendaftar.";
            messageDaftar.style.color = "red";
        }
    });
  }
}

async function daftarDenganFoto(nama, nip, username, password, role, profesi, foto) {
  if (!nama || !nip.match(/^\d+$/)) {
    throw new Error("Nama tidak boleh kosong dan NIP harus angka!");
  }
  if (!foto) {
    throw new Error("Foto harus disertakan!");
  }

  const formData = new FormData();
  formData.append("nama", nama);
  formData.append("nip", nip);
  formData.append("username", username);
  formData.append("password", password);
  formData.append("role", role);
  formData.append("profesi", profesi);
  formData.append("foto", foto);

  const token = localStorage.getItem("token"); // Ubah dari accessToken ke token
  if (!token) {
    console.error("Token tidak ditemukan, login terlebih dahulu!");
    alert("Silakan login sebagai admin!");
    return;
  }

  try {
    const response = await fetch("http://localhost:4000/daftar-dengan-foto", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await response.json();
    console.log("Respons server:", data);
    if (!response.ok) {
      let errorMessage = data.message || "Kesalahan server";
      if (response.status === 401) errorMessage = "❌ Token tidak valid, silakan login ulang!";
      if (response.status === 403) errorMessage = "❌ Akses ditolak, hanya admin yang diizinkan!";
      throw new Error(errorMessage);
    }

    alert("Pendaftaran berhasil!");
    return data;
  } catch (error) {
    console.error("Error:", error);
    alert("Gagal mendaftar: " + error.message);
    throw error;
  }
}


if (document.getElementById("form-cari-qr")) {
  console.log("Form cari QR ditemukan:", document.getElementById("form-cari-qr"));
  document.getElementById("form-cari-qr").addEventListener("submit", async function (event) {
    event.preventDefault();
    const nip = document.getElementById("nipCari").value.trim();
    const messageCari = document.getElementById("messageCari");
    const loadingCari = document.getElementById("loadingCari");

    if (!nip) {
      messageCari.innerText = "⚠ Harap masukkan NIP!";
      messageCari.style.color = "orange";
      return;
    }

    let token = localStorage.getItem("token");
    if (!token) {
      messageCari.innerText = "❌ Silakan login terlebih dahulu!";
      messageCari.style.color = "red";
      return;
    }

    loadingCari.style.display = "block";
    messageCari.innerText = "";

    try {
      let response = await fetch(`http://localhost:4000/api/get-qr/${nip}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! Status: ${response.status}`;
        if (response.status === 404) errorMessage = "⚠ Karyawan dengan NIP tersebut tidak ditemukan!";
        throw new Error(errorMessage);
      }

      const data = await response.json();
      loadingCari.style.display = "none";

      if (data.success) {
        displayQRCode(data.qr_url, data.kode_qr);
        messageCari.innerText = "✅ QR Code ditemukan!";
        messageCari.style.color = "green";
      } else {
        displayQRCode(null, null);
        messageCari.innerText = data.message || "⚠ Karyawan dengan NIP tersebut tidak ditemukan!";
        messageCari.style.color = "orange";
      }
    } catch (error) {
      loadingCari.style.display = "none";
      console.error("Gagal mengambil QR Code:", error);
      displayQRCode(null, null);
      messageCari.innerText = error.message || "❌ Terjadi kesalahan koneksi!";
      messageCari.style.color = "red";
    }
  });
}
// 🔹 Kamera untuk Pendaftaran
let streamDaftar = null;

if (document.getElementById("ambilFoto")) {
  document.getElementById("ambilFoto").addEventListener("click", async () => {
    const video = document.getElementById("kameraDaftar");
    const canvas = document.getElementById("canvasDaftar");

    if (!streamDaftar) {
      try {
        streamDaftar = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = streamDaftar;

        video.style.display = "block";
        video.style.visibility = "visible";

        showToast("Kamera aktif, tunggu sebentar...", "success");

        video.addEventListener(
          "loadedmetadata",
          () => {
            video.play();
          },
          { once: true }
        );
      } catch (error) {
        console.error("Gagal mengakses kamera:", error);
        showToast("Gagal mengakses kamera!", "error");
        return;
      }
    }

    setTimeout(() => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob(

          
          (blob) => {
            window.fotoBlobDaftar = blob;
            showToast("Foto berhasil diambil!", "success");

            if (streamDaftar) {
              streamDaftar.getTracks().forEach((track) => track.stop());
              streamDaftar = null;
              video.style.display = "none";
            }

            if (!blob) {
              console.error("❌ Blob gambar tidak valid!");
              showToast("❌ Gagal mengambil foto!", "error");
              return;
            }
          },
          "image/jpeg"
        );
      } else {
        showToast("Video belum siap, coba lagi!", "warning");
      }
    }, 2000);
  });
}

function displayQRCode(qrUrl, kodeQr) {
  console.log("👉 Menjalankan displayQRCode");
  console.log("qrUrl:", qrUrl);
  console.log("kodeQr:", kodeQr);

  const qrPlaceholder = document.getElementById("qrPlaceholder");
  const qrCodeText = document.getElementById("qrCodeText");
  const generatedQR = document.getElementById("generatedQR");
  const downloadBtn = document.getElementById("downloadBtn");

  if (!qrPlaceholder || !qrCodeText || !generatedQR || !downloadBtn) {
    console.error("❌ Salah satu elemen tidak ditemukan!");
    showToast("❌ Elemen QR tidak ditemukan, periksa HTML!", "error"); // Baris 261
    return;
}

  if (qrUrl) {
      console.log("✅ Menampilkan QR...");
      qrPlaceholder.style.display = "none";
      qrCodeText.style.display = "none";

      generatedQR.src = qrUrl;
      generatedQR.classList.remove("hidden");
      generatedQR.style.display = "block";

      downloadBtn.href = qrUrl;
      downloadBtn.download = `barcode_${kodeQr || "default"}.png`;
      downloadBtn.classList.remove("hidden");
      downloadBtn.style.display = "inline-block";
  } else {
      console.warn("❌ Tidak ada QR yang ditampilkan.");
      generatedQR.classList.add("hidden");
      generatedQR.style.display = "none";
      downloadBtn.classList.add("hidden");
      downloadBtn.style.display = "none";
      qrPlaceholder.style.display = "flex";
      qrCodeText.style.display = "block";
  }
}
   
async function loadDashboard() {   
  const token = localStorage.getItem("token");   
  if (!token) {     
    console.error("Token tidak ditemukan!");     
    showToast("❌ Token tidak ditemukan!", "error");     
    return;   
  }   
  console.log("Token used:", token); // Debug token    
    
  try {     
    const sectionDashboard = document.getElementById("sectionDashboard");     
    if (!sectionDashboard) {       
      console.error("Section Dashboard tidak ditemukan!");       
      return;     
    }      
    
    // Ambil container yang tepat untuk setiap chart
    const profesiContainer = document.querySelector('#profesiChart').parentElement;
    const attendanceContainer = document.querySelector('#attendanceChart').parentElement;
    
    // Bersihkan canvas yang ada
    const existingCanvas = sectionDashboard.querySelectorAll('canvas');     
    existingCanvas.forEach(canvas => canvas.remove());      
    
    // Buat canvas baru dan masukkan ke container yang tepat
    const profesiCanvas = document.createElement("canvas");     
    profesiCanvas.id = "profesiChart";
    profesiCanvas.className = "w-full";
    profesiContainer.appendChild(profesiCanvas);
    
    const attendanceCanvas = document.createElement("canvas");     
    attendanceCanvas.id = "attendanceChart";
    attendanceCanvas.className = "w-full";
    attendanceContainer.appendChild(attendanceCanvas);      

    // Ambil total karyawan (kecuali admin)
    let totalEmployees = 0;
    try {
      const responseMembers = await fetch('http://localhost:4000/api/members', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!responseMembers.ok) {
        throw new Error(`Gagal mengambil data karyawan: ${responseMembers.statusText}`);
      }
      const membersData = await responseMembers.json();
      if (membersData.success) {
        totalEmployees = membersData.data.filter(member => member.role !== "admin").length;
        document.getElementById('totalEmployees').textContent = totalEmployees;
      }
    } catch (err) {
      console.warn("Gagal mengambil total karyawan:", err.message);
      showToast(`⚠️ ${err.message}`, "warning");
      document.getElementById('totalEmployees').textContent = "0"; // Default jika gagal
    }

    let profesiData = { success: false, data: [] };     
    try {       
      const responseProfesi = await fetch('http://localhost:4000/api/members/profesi', {         
        headers: { Authorization: `Bearer ${token}` },       
      });       
      console.log('Full response:', await responseProfesi.clone().text());       
      console.log("Profesi response status:", responseProfesi.status); // Debug status       
      if (!responseProfesi.ok) {         
        throw new Error(`Gagal mengambil data profesi: ${responseProfesi.status} - ${responseProfesi.statusText}`);       
      }       
      profesiData = await responseProfesi.json();       
      console.log("Profesi data received:", profesiData);     
    } catch (err) {       
      console.warn("Gagal mengambil data profesi:", err.message);       
      showToast(`⚠️ ${err.message}`, "warning");     
    }      
    
    if (profesiData.success) {       
      const labels = profesiData.data.map(item => item.profesi);       
      const counts = profesiData.data.map(item => item.count);
      
      console.log("Creating profesi chart with data:", { labels, counts });
      console.log("Canvas element:", profesiCanvas);
      
      // Modern gradient colors for profesi chart
      const gradientColors = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
      ];
      
      const backgroundColors = counts.map((_, index) => {
        const colorIndex = index % gradientColors.length;
        return [
          'rgba(102, 126, 234, 0.8)',
          'rgba(240, 147, 251, 0.8)',
          'rgba(79, 172, 254, 0.8)',
          'rgba(67, 233, 123, 0.8)',
          'rgba(250, 112, 154, 0.8)',
          'rgba(168, 237, 234, 0.8)',
          'rgba(255, 236, 210, 0.8)',
          'rgba(255, 154, 158, 0.8)'
        ][colorIndex];
      });
      
      const borderColors = counts.map((_, index) => {
        const colorIndex = index % gradientColors.length;
        return [
          'rgba(102, 126, 234, 1)',
          'rgba(240, 147, 251, 1)',
          'rgba(79, 172, 254, 1)',
          'rgba(67, 233, 123, 1)',
          'rgba(250, 112, 154, 1)',
          'rgba(168, 237, 234, 1)',
          'rgba(255, 236, 210, 1)',
          'rgba(255, 154, 158, 1)'
        ][colorIndex];
      });
      
      new Chart(profesiCanvas, {         
        type: 'bar',         
        data: { 
          labels, 
          datasets: [{ 
            label: 'Jumlah Anggota', 
            data: counts, 
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            hoverBackgroundColor: backgroundColors.map(color => color.replace('0.8', '0.9')),
            hoverBorderColor: borderColors,
            hoverBorderWidth: 3
          }] 
        },         
        options: { 
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              cornerRadius: 12,
              displayColors: false,
              titleFont: {
                size: 14,
                weight: 'bold'
              },
              bodyFont: {
                size: 13
              },
              padding: 12
            }
          },
          scales: { 
            y: { 
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)',
                drawBorder: false
              },
              ticks: {
                color: '#64748b',
                font: {
                  size: 12,
                  weight: '500'
                }
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                color: '#64748b',
                font: {
                  size: 12,
                  weight: '500'
                },
                maxRotation: 45
              }
            }
          },
          animation: {
            duration: 2000,
            easing: 'easeInOutQuart'
          }
        }       
      });     
    }    
    
    const responseAttendance = await fetch(`http://127.0.0.1:4000/api/attendance?date=${new Date().toISOString().split('T')[0]}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Attendance API response status:", responseAttendance.status);
    if (!responseAttendance.ok) {
      throw new Error(`Gagal mengambil data absensi: ${responseAttendance.status} - ${responseAttendance.statusText}`);
    }
    const attendanceData = await responseAttendance.json();
    console.log("Attendance data received:", attendanceData);
    
    if (attendanceData.success) {
      const present = attendanceData.data.filter(item => item.status === "hadir").length;
      const absent = totalEmployees - present; // Asumsi totalEmployees sudah dihitung sebelumnya
    
      document.getElementById('presentToday').textContent = present;
      document.getElementById('absentToday').textContent = absent > 0 ? absent : 0;
    
      console.log("Creating attendance chart with data:", { present, absent, totalEmployees });
      
      console.log("Canvas element:", attendanceCanvas);       
      
      new Chart(attendanceCanvas, {         
        type: 'doughnut',         
        data: { 
          labels: ['Hadir', 'Tidak Hadir'], 
          datasets: [{ 
            data: [present, absent], 
            backgroundColor: [
              'rgba(34, 197, 94, 0.9)',  // Green for present
              'rgba(239, 68, 68, 0.9)'   // Red for absent
            ],
            borderColor: [
              'rgba(34, 197, 94, 1)',
              'rgba(239, 68, 68, 1)'
            ],
            borderWidth: 3,
            hoverBackgroundColor: [
              'rgba(34, 197, 94, 1)',
              'rgba(239, 68, 68, 1)'
            ],
            hoverBorderColor: '#fff',
            hoverBorderWidth: 4,
            cutout: '60%',
            spacing: 4
          }] 
        },         
        options: { 
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 20,
                font: {
                  size: 14,
                  weight: '600'
                },
                color: '#374151',
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              cornerRadius: 12,
              displayColors: false,
              titleFont: {
                size: 14,
                weight: 'bold'
              },
              bodyFont: {
                size: 13
              },
              padding: 12,
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((context.parsed / total) * 100).toFixed(1);
                  return `${context.label}: ${context.parsed} (${percentage}%)`;
                }
              }
            }
          },
          animation: {
            duration: 2000,
            easing: 'easeInOutQuart'
          }
        }       
      });     
    }   
  } catch (err) {     
    console.error("Gagal load dashboard:", err);     
    showToast(`❌ ${err.message}`, "error");   
  } 
}

function createAttendanceChart(hadirCount, tidakHadirCount, container) {   
  const oldChart = container.querySelector("canvas");   
  if (oldChart) oldChart.remove();    
  
  const canvas = document.createElement("canvas");   
  canvas.id = "attendanceChart";   
  container.innerHTML = "";   
  container.appendChild(canvas);    
  
  new Chart(canvas, {     
    type: "doughnut",     
    data: {       
      labels: ["Hadir", "Tidak Hadir"],       
      datasets: [{         
        label: "Jumlah Absensi",         
        data: [hadirCount, tidakHadirCount],         
        backgroundColor: [
          'rgba(34, 197, 94, 0.9)',  // Modern green
          'rgba(239, 68, 68, 0.9)'   // Modern red
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 3,
        hoverBackgroundColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        hoverBorderColor: '#fff',
        hoverBorderWidth: 4,
        cutout: '60%',
        spacing: 4
      }]     
    },     
    options: {       
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: {
              size: 14,
              weight: '600'
            },
            color: '#374151',
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          cornerRadius: 12,
          displayColors: false,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          bodyFont: {
            size: 13
          },
          padding: 12,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            }
          }
        }
      },
      animation: {
        duration: 2000,
        easing: 'easeInOutQuart'
      }
    }   
  }); 
}

// Form Pengajuan
// Validasi tanggal di submitPengajuan
async function submitPengajuan() {
  const token = localStorage.getItem("token");
  const jenis = document.querySelector("#jenis").value;
  const tanggal_mulai = document.querySelector("#tanggal_mulai").value;
  const tanggal_selesai = document.querySelector("#tanggal_selesai").value;
  const keterangan = document.querySelector("#keterangan").value;

  // Validasi frontend
  if (!jenis || !["izin", "sakit"].includes(jenis)) {
    alert("⚠ Pilih jenis pengajuan (izin atau sakit)!");
    return;
  }
  if (!tanggal_mulai || !tanggal_selesai) {
    alert("⚠ Tanggal mulai dan selesai harus diisi!");
    return;
  }
  const startDate = new Date(tanggal_mulai);
  const endDate = new Date(tanggal_selesai);
  if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
    alert("⚠ Tanggal mulai harus sebelum atau sama dengan tanggal selesai!");
    return;
  }

  try {
    const response = await fetch("http://localhost:4000/pengajuan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jenis, tanggal_mulai, tanggal_selesai, keterangan }),
    });

    if (response.status === 401 || response.status === 403) {
      alert("⛔ Autentikasi gagal! Silakan login kembali.");
      localStorage.removeItem("token");
      window.location.href = "/login.html";
      return;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Server mengembalikan status ${response.status}: ${text}`);
    }

    const data = await response.json();
    if (data.success) {
      alert(data.message);
      document.querySelector("#pengajuanForm").reset(); // Reset form
      loadUserPengajuan(); // Refresh tabel
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error submit pengajuan:", error);
    alert("Terjadi kesalahan saat mengajukan: " + error.message);
  }
}

async function loadPengajuan() {
  const token = localStorage.getItem("token");
  const tbody = document.querySelector("#pengajuanTable tbody");
  tbody.innerHTML = "<tr><td colspan='7'>Memuat...</td></tr>";

  try {
    const response = await fetch("http://localhost:4000/pengajuan", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    tbody.innerHTML = "";
    if (data.success) {
      data.data.forEach(p => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${p.nama}</td>
          <td>${p.jenis}</td>
          <td>${p.tanggal_mulai}</td>
          <td>${p.tanggal_selesai}</td>
          <td>${p.keterangan || "-"}</td>
          <td>${p.status}</td>
          <td>
            <button onclick="updatePengajuan(${p.id}, 'disetujui')" ${p.status !== "pending" ? "disabled" : ""}>Setujui</button>
            <button onclick="updatePengajuan(${p.id}, 'ditolak')" ${p.status !== "pending" ? "disabled" : ""}>Tolak</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error load pengajuan:", error);
    alert("Terjadi kesalahan saat memuat pengajuan!");
  }
}

async function loadUserPengajuan() {
  const token = localStorage.getItem("token");
  const tbody = document.querySelector("#userPengajuanTable tbody");
  tbody.innerHTML = "<tr><td colspan='5'>Memuat...</td></tr>";

  try {
    console.log("Mengirim request ke http://localhost:4000/api/pengajuan/user dengan token:", token);
    const response = await fetch("http://localhost:4000/api/pengajuan/user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Status respons:", response.status, response.statusText);
    if (response.status === 404) {
      alert("⛔ Endpoint pengajuan tidak ditemukan! Pastikan server berjalan.");
      tbody.innerHTML = "<tr><td colspan='5'>Data tidak tersedia</td></tr>";
      return;
    }
    if (response.status === 401 || response.status === 403) {
      alert("⛔ Autentikasi gagal! Silakan login kembali.");
      localStorage.removeItem("token");
      window.location.href = "/login.html";
      return;
    }
    if (!response.ok) {
      const text = await response.text();
      console.error("Respons server:", text);
      throw new Error(`Server mengembalikan status ${response.status}: ${text}`);
    }
    const data = await response.json();
    console.log("Data pengajuan diterima:", data);
    tbody.innerHTML = "";
    if (data.success) {
      data.data.forEach(p => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${p.jenis}</td>
          <td>${p.tanggal_mulai}</td>
          <td>${p.tanggal_selesai}</td>
          <td>${p.keterangan || "-"}</td>
          <td>${p.status}</td>
        `;
        tbody.appendChild(row);
      });
    } else {
      alert(data.message);
      tbody.innerHTML = "<tr><td colspan='5'>Tidak ada pengajuan</td></tr>";
    }
  } catch (error) {
    console.error("Error load pengajuan user:", error);
    alert("Terjadi kesalahan saat memuat pengajuan: " + error.message);
    tbody.innerHTML = "<tr><td colspan='5'>Gagal memuat data</td></tr>";
  }
}


async function updatePengajuan(id, status) {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(`http://localhost:4000/pengajuan/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    console.log("Respons update pengajuan:", data);
    alert(data.message);
    if (data.success) {
      loadPengajuan();
    }
  } catch (error) {
    console.error("Error update pengajuan:", error);
    alert("Terjadi kesalahan saat memperbarui pengajuan!");
  }
}



// Fungsi untuk Laporan
async function loadDailyAttendanceStatus() {
  const dailyAttendanceStatus = document.getElementById("dailyAttendanceStatus");
  const messageLaporan = document.getElementById("messageLaporan");
  if (!dailyAttendanceStatus) return;

  const token = localStorage.getItem("token");
  if (!token) {
    showToast("❌ Silakan login terlebih dahulu!", "error");
    return;
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await fetch(`http://localhost:4000/admin/rekap-absensi?tanggal=${today}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Respons gagal: ${response.status}`);

    const data = await response.json();
    if (!data.success || !data.data.length) {
      dailyAttendanceStatus.innerHTML = "<p>⚠ Tidak ada data absensi hari ini</p>";
      return;
    }

    const profesiStatus = data.data.reduce((acc, row) => {
      const profesi = row.profesi || "Tidak Ditentukan";
      acc[profesi] = acc[profesi] || { total: 0, hadir: 0 };
      acc[profesi].total++;
      if (row.status === "hadir") acc[profesi].hadir++;
      return acc;
    }, {});

    dailyAttendanceStatus.innerHTML = "<h3 class='text-lg font-semibold'>Status Absensi Hari Ini</h3>" +
      Object.entries(profesiStatus).map(([profesi, { total, hadir }]) => {
        const belumHadir = total - hadir;
        const status = belumHadir === 0 ? "✅ Semua sudah absen" : `⚠ ${belumHadir} belum absen`;
        return `<p>${profesi}: ${hadir}/${total} hadir (${status})</p>`;
      }).join("");
  } catch (err) {
    console.error("Gagal load laporan harian:", err);
    messageLaporan.innerText = "❌ Gagal memuat laporan harian!";
    messageLaporan.style.color = "red";
  }
}

async function exportWeeklyReport() {
  const messageLaporan = document.getElementById("messageLaporan");
  const token = localStorage.getItem("token");
  if (!token) {
    showToast("❌ Silakan login terlebih dahulu!", "error");
    return;
  }

  try {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Mulai Senin
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const params = new URLSearchParams({
      startDate: startOfWeek.toISOString().split("T")[0],
      endDate: endOfWeek.toISOString().split("T")[0],
    });

    const response = await fetch(`http://localhost:4000/admin/absensi/export?${params.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Respons gagal: ${response.status}`);

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan_absensi_${startOfWeek.toISOString().split("T")[0]}_to_${endOfWeek.toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    messageLaporan.innerText = "✅ Laporan mingguan berhasil diekspor!";
    messageLaporan.style.color = "green";
  } catch (err) {
    console.error("Gagal export laporan:", err);
    messageLaporan.innerText = `❌ Gagal mengekspor laporan: ${err.message}`;
    messageLaporan.style.color = "red";
  }
}

// vent listener untuk filter
    if (document.getElementById("filterForm")) {
      document.getElementById("filterForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        const tanggal = document.getElementById("filterTanggal").value || "";
        const nip = document.getElementById("filterNIP").value.trim() || "";
        const bulan = document.getElementById("filterBulan").value || "";
        console.log("Mencari dengan tanggal:", tanggal, "nip:", nip, "bulan:", bulan);
        await loadAbsensiDashboard(tanggal, nip, bulan);
      });
    }


    async function exportAttendanceData() {
      const loadingExport = document.getElementById("loadingExport");
      if (loadingExport) loadingExport.style.display = "block";

      const tanggal = document.getElementById("filterTanggal")?.value || "";
      const nip = document.getElementById("filterNIP")?.value.trim() || "";
      const params = new URLSearchParams();
      if (tanggal) params.append("tanggal", tanggal);
      if (nip) params.append("nip", nip);

      const token = localStorage.getItem("token");
      if (!token) {
        showToast("❌ Silakan login terlebih dahulu!", "error");
        if (loadingExport) loadingExport.style.display = "none";
        return;
      }

      try {
        const response = await fetch(`http://localhost:4000/admin/absensi/export?${params.toString()}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `absensi_${tanggal || 'all'}_${nip || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showToast("✅ Data absensi berhasil diekspor!", "success");
      } catch (err) {
        console.error("Gagal export data:", err);
        showToast(`❌ Gagal mengekspor data absensi: ${err.message}`, "error");
      } finally {
        if (loadingExport) loadingExport.style.display = "none";
      }
    }

    // Event listener untuk tombol export
    if (document.getElementById("btnDownloadExcel")) {
      document.getElementById("btnDownloadExcel").addEventListener("click", () => {
        exportAttendanceData();
      });
    }
    async function addEmployee() {
      const nama = prompt("Nama karyawan:");
      const nip = prompt("NIP:");
      const username = prompt("Username:");
      const password = prompt("Password:");
      const role = prompt("Role (admin/karyawan):");
      const profesi = prompt("Profesi (opsional):");

      if (!nama || !nip || !username || !password || !role) {
        showToast("❌ Semua field wajib diisi!", "error");
        return;
      }

      const formData = new FormData();
      formData.append("nama", nama);
      formData.append("nip", nip);
      formData.append("username", username);
      formData.append("password", password);
      formData.append("role", role);
      if (profesi) formData.append("profesi", profesi);

      const token = localStorage.getItem("token");
      if (!token) {
        showToast("❌ Silakan login terlebih dahulu!", "error");
        return;
      }

      try {
        const response = await fetch("http://localhost:4000/admin/karyawan", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        showToast(data.message || "✅ Karyawan berhasil ditambahkan!", "success");
        loadEmployees(); // Refresh daftar karyawan
      } catch (err) {
        console.error("Gagal tambah karyawan:", err);
        showToast(`❌ Gagal tambah karyawan: ${err.message}`, "error");
      }
    }

    async function loadEmployees() {
      const token = localStorage.getItem("token");
      if (!token) {
        showToast("❌ Silakan login terlebih dahulu!", "error");
        return;
      }

      try {
        const response = await fetch("http://localhost:4000/admin/karyawan", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const employeeList = document.createElement("div");
        employeeList.innerHTML = "<h3 class='text-xl font-bold mb-4'>Daftar Karyawan</h3><ul class='list-disc pl-5'>";
        data.data.forEach(emp => {
          employeeList.innerHTML += `<li class='mb-2'>${emp.nama} (NIP: ${emp.nip})</li>`;
        });
        employeeList.innerHTML += "</ul>";

        const sectionDashboard = document.getElementById("sectionDashboard");
        const existingList = sectionDashboard.querySelector("div#employeeList");
        if (existingList) existingList.remove();
        employeeList.id = "employeeList";
        sectionDashboard.appendChild(employeeList);
      } catch (err) {
        console.error("Gagal load karyawan:", err);
        showToast(`❌ Gagal memuat daftar karyawan: ${err.message}`, "error");
      }
    }

    // Event listener
    if (document.getElementById("btnAddEmployee")) {
      document.getElementById("btnAddEmployee").addEventListener("click", () => {
        addEmployee();
      });
    }
    async function loadProfile() {
      console.log("Memuat profil...");
      const loadingExport = document.getElementById("loadingExport");
      if (loadingExport) loadingExport.style.display = "block";
  
      const token = localStorage.getItem("token");
      if (!token) {
          console.error("❌ Token tidak ditemukan, silakan login terlebih dahulu!");
          if (loadingExport) loadingExport.style.display = "none";
          return;
      }
  
      try {
          const response = await fetch("http://127.0.0.1:4000/api/profil", {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
          });
  
          if (!response.ok) {
              const text = await response.text();
              console.error("Respons server:", text);
              throw new Error(`HTTP ${response.status}: ${text}`);
          }
          const data = await response.json();
          if (!data.success) throw new Error(data.message || "Gagal memuat profil");
  
          const { nama, nip, username, role, foto_path, profesi } = data.data;
          window.currentProfileData = { nama, nip, username, role, foto_path, profesi };
          window.currentProfileData = { nama, nip, username, role, foto_path, profesi };
          console.log("Data profil berhasil dimuat:", window.currentProfileData);
  
          const sectionProfil = document.getElementById("sectionProfil");
          const profilNama = document.getElementById("profilNama");
          const profilNIP = document.getElementById("profilNIP");
          const profilRole = document.getElementById("profilRole");
          const profilePhoto = document.getElementById("profilePhoto");
          const profilProfesi = document.getElementById("profilProfesi");
  
          if (!sectionProfil || !profilNama || !profilNIP || !profilRole || !profilePhoto || !profilProfesi) {
              console.error("❌ Elemen profil tidak ditemukan!");
              if (loadingExport) loadingExport.style.display = "none";
              return;
          }
  
          profilNama.innerText = nama || "N/A";
          profilNIP.innerText = nip || "N/A";
          profilRole.innerText = role || "N/A";
          profilProfesi.innerText = profesi || "N/A";
          if (foto_path) {
              profilePhoto.src = `http://127.0.0.1:4000/foto/${foto_path}`;
              profilePhoto.classList.remove("hidden");
          } else {
              profilePhoto.classList.add("hidden");
          }
  
          if (loadingExport) loadingExport.style.display = "none";
          window.loadProfileRun = false; // Reset untuk memungkinkan reload
      } catch (err) {
          console.error("Gagal load profil:", err);
          if (loadingExport) loadingExport.style.display = "none";
          const sectionProfil = document.getElementById("sectionProfil");
          if (sectionProfil) {
              sectionProfil.innerHTML = `<p class="text-red-500">❌ Gagal memuat profil: ${err.message}</p>`;
          }
      }
  }

    async function editProfile(currentNama, currentNip, currentProfesi) {
      console.log("Memulai edit profil...");
      showEditMemberFormInner(currentNama, currentNip, currentProfesi);
    
      const btnEditProfil = document.getElementById("btnEditProfil");
      if (btnEditProfil) {
        btnEditProfil.onclick = async () => {
          const nama = document.getElementById("editNama").value;
          const nip = document.getElementById("editNIP").value;
          const profesi = document.getElementById("editProfesi").value;
    
          if (!nama) {
            console.log("❌ Nama wajib diisi!");
            return;
          }
    
          const token = localStorage.getItem("token");
          if (!token) {
            console.error("❌ Token tidak ditemukan!");
            return;
          }
    
          console.log("Data yang dikirim:", { nama, nip, profesi });
          try {
            const response = await fetch("http://localhost:4000/api/profil", {
              method: "PUT",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ nama, nip, profesi }),
            });
    
            console.log("Status respons edit:", response.status);
            if (!response.ok) throw new Error(`Respons gagal: ${response.status}`);
    
            const data = await response.json();
            console.log("Hasil edit dari server:", data);
            const sectionEditProfil = document.getElementById("sectionEditProfil");
            if (sectionEditProfil) sectionEditProfil.classList.add("hidden");
            await loadProfile(); // Muat ulang profil
          } catch (err) {
            console.error("Gagal edit profil:", err);
          }
        };
      }
    }

    async function handleLogin(event) {
      event.preventDefault();
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;
      const messageLogin = document.getElementById("messageLogin");
    
      try {
        const response = await fetch("http://localhost:4000/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (data.success) {
          localStorage.setItem("token", data.token);
          await loadProfile(); // Panggil loadProfile setelah login
          window.location.href = "index.html";
        } else {
          messageLogin.innerText = `❌ ${data.message}`;
          messageLogin.style.color = "red";
        }
      } catch (error) {
        console.error("Error login:", error);
        messageLogin.innerText = "⚠ Gagal login!";
        messageLogin.style.color = "red";
      }
    }

// Fungsi untuk menampilkan daftar anggota (tidak berubah)
async function loadMembers() {
  const token = localStorage.getItem("token");
  if (!token) {
      console.error("Token tidak ditemukan!");
      showToast("❌ Silakan login terlebih dahulu!", "error");
      return;
  }
  try {
      const response = await fetch("http://127.0.0.1:4000/api/members", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
      });
      const data = await response.json();
      if (data.success) {
          console.log("Data lengkap dari /api/members:", data);
          displayMembers(data.data);
      } else {
          throw new Error(data.message || "Gagal memuat data anggota");
      }
  } catch (err) {
      console.error("Gagal load members:", err);
      showToast(`❌ ${err.message}`, "error");
  }
}


function displayMembers(members) {
  const sectionDetailAnggota = document.getElementById("sectionDetailAnggota");
  if (!sectionDetailAnggota) {
      console.error("Elemen sectionDetailAnggota tidak ditemukan!");
      return;
  }

  const memberList = document.getElementById("memberList");
  if (!memberList) {
      console.error("Elemen memberList tidak ditemukan!");
      return;
  }

  console.log("Data yang akan ditampilkan:", members);

  const tbody = memberList.querySelector("tbody");
  if (!tbody) {
      console.error("Elemen tbody tidak ditemukan di dalam memberList!");
      return;
  }

  tbody.innerHTML = members
      .map(member => `
          <tr class="border">
              <td class="p-2">${member.id || 'N/A'}</td>
              <td class="p-2">${member.nama || 'N/A'}</td>
              <td class="p-2">${member.nip || 'N/A'}</td>
              <td class="p-2">${member.profesi || 'N/A'}</td>
              <td class="p-2">${member.foto_path ? `<a href="http://127.0.0.1:4000/foto/${member.foto_path}" target="_blank">Lihat</a>` : 'N/A'}</td>
              <td class="p-2">${member.kode_qr || 'N/A'}</td>
              <td class="p-2">
                  <button data-member-id="${member.id}" class="editButton bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">Edit</button>
                  <button data-member-id="${member.id}" class="deleteButton bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 ml-2">Hapus</button>
              </td>
          </tr>
      `)
      .join('');

  // Tambahkan event listener untuk tombol edit dan hapus
  document.querySelectorAll(".editButton").forEach(button => {
      button.addEventListener("click", () => {
          const memberId = button.getAttribute("data-member-id");
          console.log("Mengklik tombol edit untuk ID:", memberId);
          editMember(memberId);
      });
  });

  document.querySelectorAll(".deleteButton").forEach(button => {
      button.addEventListener("click", () => {
          const memberId = button.getAttribute("data-member-id");
          deleteMember(memberId);
      });
  });

  const editMemberForm = document.getElementById("editMemberForm");
  if (editMemberForm && !editMemberForm.classList.contains("hidden")) {
      editMemberForm.classList.add("hidden");
      console.log("Form disembunyikan setelah loadMembers.");
  }
}
async function editMember(id) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Sesi tidak valid. Silakan login kembali.');
    window.location.href = 'index.html';
    return;
  }

  try {
    const response = await fetch(`http://localhost:4000/api/members/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!data.success) {
      alert(data.message);
      return;
    }

    const member = data.data;
    const editMemberForm = document.getElementById("editMemberForm");
    const editId = document.getElementById("editId");
    const editNama = document.getElementById("editNama");
    const editNip = document.getElementById("editNip");
    const editProfesi = document.getElementById("editProfesi");
    const editUsername = document.getElementById("editUsername");
    const editPassword = document.getElementById("editPassword");
    const editRole = document.getElementById("editRole");
    const editFoto = document.getElementById("editFoto");
    const photoPreview = document.getElementById("photoPreview");
    const previewImage = document.getElementById("previewImage");
    const messageDetail = document.getElementById("messageDetail");
    const cancelEditBtn = document.getElementById("cancelEditBtn");

    // Debug: Periksa editMemberForm
    console.log('editMemberForm:', editMemberForm);
    console.log('editMemberForm tagName:', editMemberForm ? editMemberForm.tagName : 'Tidak ditemukan');

    if (!editMemberForm || !editId || !editNama || !editNip || !editProfesi || !editUsername || !editPassword || !editRole || !editFoto || !photoPreview || !previewImage || !messageDetail || !cancelEditBtn) {
      console.error("Salah satu elemen formulir edit tidak ditemukan!");
      alert("Formulir edit tidak ditemukan, periksa HTML!");
      return;
    }

    if (editMemberForm.tagName !== 'FORM') {
      console.error('editMemberForm bukan elemen <form>! Tag ditemukan:', editMemberForm.tagName);
      alert('Kesalahan konfigurasi: editMemberForm bukan formulir HTML!');
      return;
    }

    editId.value = member.id;
    editNama.value = member.nama;
    editNip.value = member.nip;
    editProfesi.value = member.profesi || '';
    editUsername.value = member.username;
    editRole.value = member.role;
    editPassword.value = '';

    function updateProfesiBasedOnRole() {
      if (editRole.value === "admin") {
          editProfesi.value = "admin";
          editProfesi.disabled = true;
      } else {
          editProfesi.value = member.profesi || '';
          editProfesi.disabled = false;
      }
  }
  updateProfesiBasedOnRole();
  editRole.addEventListener("change", updateProfesiBasedOnRole);

    if (member.foto_path) {
      previewImage.src = `http://localhost:4000/foto/${member.foto_path}?t=${new Date().getTime()}`;
      photoPreview.classList.remove("hidden");
    } else {
      photoPreview.classList.add("hidden");
    }

    editMemberForm.classList.remove("hidden");

    // Event listener untuk tombol "Batal"
    cancelEditBtn.addEventListener('click', () => {
      editMemberForm.classList.add('hidden');
      editMemberForm.reset();
      messageDetail.innerText = '';
      photoPreview.classList.add('hidden');
      console.log('Edit dibatalkan, formulir disembunyikan.');
    });

    // Event listener untuk submit formulir
    editMemberForm.onsubmit = async (e) => {
      e.preventDefault();
      messageDetail.innerText = '';

      if (!editNama.value || !editNip.value || !editUsername.value || !editRole.value) {
        messageDetail.innerText = "⚠ Harap isi semua kolom yang diperlukan!";
        messageDetail.style.color = "orange";
        return;
      }

      if (editRole.value === 'karyawan' && (!editProfesi.value || editProfesi.value.trim() === '')) {
        messageDetail.innerText = "⚠ Profesi wajib diisi untuk karyawan!";
        messageDetail.style.color = "orange";
        return;
      }

      if (editRole.value !== 'admin' && editRole.value !== 'karyawan') {
        messageDetail.innerText = "⚠ Role tidak valid. Pilih 'admin' atau 'karyawan'.";
        messageDetail.style.color = "orange";
        return;
      }

      if (editRole.value === 'karyawan' && !editFoto.files[0] && !member.foto_path) {
        messageDetail.innerText = "⚠ Harap unggah foto untuk karyawan!";
        messageDetail.style.color = "orange";
        return;
      }

      const formData = new FormData();
      formData.append('id', editId.value);
      formData.append('nama', editNama.value);
      formData.append('nip', editNip.value);
      formData.append('profesi', editProfesi.value);
      formData.append('username', editUsername.value);
      if (editPassword.value) formData.append('password', editPassword.value);
      formData.append('role', editRole.value);
      if (editFoto.files[0]) formData.append('foto', editFoto.files[0]);

      console.log("Mengirim data edit untuk ID:", id, {
        id: editId.value,
        nama: editNama.value,
        nip: editNip.value,
        profesi: editProfesi.value,
        username: editUsername.value,
        role: editRole.value,
        foto: editFoto.files[0] ? editFoto.files[0].name : "Tidak ada foto baru"
      });

      try {
        const response = await fetch(`http://localhost:4000/api/members/${id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const result = await response.json();
        console.log("Respon API update:", result);
        messageDetail.innerText = result.message;
        messageDetail.style.color = result.success ? "green" : "red";

        if (result.success) {
          editMemberForm.classList.add("hidden");
          editMemberForm.reset();
          loadMembers();
          if (window.currentProfileData && window.currentProfileData.id === id) {
            console.log("Memperbarui profil pengguna saat ini...");
            await loadProfile();
          }
        }
      } catch (error) {
        console.error('Error:', error);
        messageDetail.innerText = "⚠ Gagal memperbarui data!";
        messageDetail.style.color = "red";
      }
    };
  } catch (error) {
    console.error('Error:', error);
    alert('Gagal memuat data karyawan');
  }
}

async function getUserData(userId) {
  const token = localStorage.getItem("token");
  const response = await fetch(`http://localhost:4000/api/profil?userId=${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  return data.success ? data.data : null;
}

// Tambahkan fungsi deleteMember
async function deleteMember(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus karyawan ini? Aksi ini tidak dapat dibatalkan!")) {
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    console.error("Token tidak ditemukan!");
    showToast("❌ Token tidak ditemukan, silakan login ulang!", "error");
    return;
  }

  try {
    const response = await fetch(`http://127.0.0.1:4000/api/members/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (data.success) {
      showToast("✅ Karyawan berhasil dihapus!", "success");
      await loadMembers();
    } else {
      throw new Error(data.message || "Gagal menghapus karyawan");
    }
  } catch (err) {
    console.error("Error deleting member:", err);
    showToast(`❌ ${err.message}`, "error");
  }
}
// Panggil saat tab Daftar aktif
document.addEventListener('DOMContentLoaded', () => {
  const tabDaftar = document.getElementById('tabDaftar');
  if (tabDaftar) {
    tabDaftar.addEventListener('click', () => {
      if (window.currentProfileData?.role === 'admin') {
        loadMembers();
      }
    });
  }
});

    async function refreshToken() {
      const refreshToken = localStorage.getItem("refreshToken");
      const response = await fetch("http://127.0.0.1:4000/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem("token", data.accessToken);
        return data.accessToken;
      }
      return null;
    }
    
    // Gunakan sebelum setiap request
    async function makeAuthenticatedRequest(url, options) {
      let token = localStorage.getItem("token");
      let response = await fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        token = await refreshToken();
        if (token) {
          options.headers.Authorization = `Bearer ${token}`;
          response = await fetch(url, options);
        }
      }
      return response;
    }

    // Fungsi untuk mengambil data absensi (misalnya dari endpoint fiktif, sesuaikan dengan API Anda)
async function fetchAttendanceData(profesi = '', date = new Date().toISOString().split('T')[0]) {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("Token tidak ditemukan!");
    return [];
  }
  try {
    const response = await fetch(`http://127.0.0.1:4000/api/attendance?profesi=${profesi}&date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (err) {
    console.error("Gagal fetch attendance:", err);
    return [];
  }
}

// Fungsi untuk laporan harian
async function generateDailyReport() {
  const profesi = document.getElementById("filterProfesi").value;
  const attendanceData = await fetchAttendanceData(profesi);
  const today = new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });
  const reportDiv = document.getElementById("dailyReport");

  if (attendanceData.length === 0) {
    reportDiv.innerHTML = `<p>Tidak ada data absensi untuk ${today}.</p>`;
    return;
  }

  const report = attendanceData.map(member => `
    <p>${member.nama} (${member.profesi}) - ${member.absent ? 'Sudah Absen' : 'Belum Absen'}</p>
  `).join('');
  reportDiv.innerHTML = `<h4>Status Absensi ${today}</h4>${report}`;
}


async function logout() {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch("http://localhost:4000/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 404) {
      alert("⛔ Endpoint logout tidak ditemukan! Pastikan server berjalan dan endpoint tersedia.");
      return;
    }
    const data = await response.json();
    console.log("Respons logout:", data);
    if (data.success) {
      localStorage.removeItem("token");
      window.location.href = "/login.html";
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error logout:", error);
    alert("Terjadi kesalahan saat logout: " + error.message);
  }
}



document.getElementById("currentDate").textContent = new Date().toLocaleDateString();

    function showEditMemberFormInner(nama, nip, profesi) {
      const sectionEditProfil = document.getElementById("sectionEditProfil");
      if (sectionEditProfil) {
        document.getElementById("editNama").value = nama || "";
        document.getElementById("editNIP").value = nip || "";
        document.getElementById("editProfesi").value = profesi || "";
        sectionEditProfil.classList.remove("hidden");
        showOnlySection(btnProfile, sectionEditProfil); // Tampilkan section edit
      }
    }
    

    
    // Panggil showEditForm dari event click tombol Edit
    const editButton = document.getElementById("editProfileBtn");
    if (editButton) {
      editButton.addEventListener("click", () => {
        console.log("Tombol Edit diklik");
        const { nama, nip, username, role, foto_path, profesi } = window.currentProfileData || {};
        editProfile(nama, nip, profesi);
      });
    }
         // Real-time clock
        function updateTime() {
            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID');
            const dateString = now.toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const timeElement = document.getElementById('currentTime');
            const dateElement = document.getElementById('todayDate');
            const currentDateElement = document.getElementById('currentDate');
            
            if (timeElement) timeElement.textContent = timeString;
            if (dateElement) dateElement.textContent = dateString.split(',')[1].trim();
            if (currentDateElement) currentDateElement.textContent = dateString;
        }

        // Update time every second
        setInterval(updateTime, 1000);
        updateTime(); // Initial call

const tabAbsensi = document.getElementById("tabAbsensi");
const tabDaftar = document.getElementById("tabDaftar");
const tabDashboard = document.getElementById("tabDashboard");
const tabLaporan = document.getElementById("tabLaporan");
const tabDetailAnggota = document.getElementById("tabDetailAnggota");
const tabPengajuan = document.getElementById("tabPengajuan");
const tabManajemen = document.getElementById("tabManajemen");
const btnProfile = document.getElementById("btnProfile");
const btnLogout = document.getElementById("btnLogout");
const sectionAbsensi = document.getElementById("sectionAbsensi");
const sectionDaftar = document.getElementById("sectionDaftar");
const sectionDashboard = document.getElementById("sectionDashboard");
const sectionLaporan = document.getElementById("sectionLaporan");
const sectionDetailAnggota = document.getElementById("sectionDetailAnggota");
const sectionPengajuan = document.getElementById("sectionPengajuan");
const sectionManajemen = document.getElementById("sectionManajemen");
const sectionProfil = document.getElementById("sectionProfil");

function showOnlySection(activeTab, activeSection) {
  console.log("Mengaktifkan tab:", activeTab?.id, "dan section:", activeSection?.id);
  const tabs = [tabAbsensi, tabDaftar, tabDashboard, tabLaporan, tabDetailAnggota, tabPengajuan, tabManajemen, btnProfile, btnLogout].filter(Boolean);
  const sections = [sectionAbsensi, sectionDaftar, sectionDashboard, sectionLaporan, sectionDetailAnggota, sectionPengajuan, sectionManajemen, sectionProfil].filter(Boolean);

  tabs.forEach((tab) => {
    tab.className = "nav-item px-6 py-3 rounded-xl font-semibold transition-all duration-300 cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-white hover:bg-opacity-20";
  });

  sections.forEach((sec) => {
    sec.classList.add("hidden");
  });

  if (activeTab && activeSection) {
    activeTab.className = "nav-item px-6 py-3 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg cursor-pointer";
    activeSection.classList.remove("hidden");
    activeSection.classList.add("animate-fade-in");
    setTimeout(() => activeSection.classList.remove("animate-fade-in"), 500);
  } else {
    console.error("❌ Tab atau section tidak valid:", activeTab, activeSection);
  }
}

function setupTabListeners(role) {
  if (tabAbsensi && sectionAbsensi) {
    tabAbsensi.addEventListener("click", () => {
      if (role === "karyawan") showOnlySection(tabAbsensi, sectionAbsensi);
    });
  }
  if (tabDaftar && sectionDaftar) {
    tabDaftar.addEventListener("click", () => {
      if (role === "admin") showOnlySection(tabDaftar, sectionDaftar);
    });
  }
  if (tabDashboard && sectionDashboard) {
    tabDashboard.addEventListener("click", () => {
      if (role === "admin") {
        showOnlySection(tabDashboard, sectionDashboard);
        loadDashboard();
      }
    });
  }
  if (tabLaporan && sectionLaporan) {
    tabLaporan.addEventListener("click", () => {
      if (role === "admin") {
        showOnlySection(tabLaporan, sectionLaporan);
        generateDailyReport();
      }
    });
  }
  if (tabDetailAnggota && sectionDetailAnggota) {
    tabDetailAnggota.addEventListener("click", () => {
      if (role === "admin") {
        showOnlySection(tabDetailAnggota, sectionDetailAnggota);
        loadMembers();
      }
    });
  }
  if (tabPengajuan && sectionPengajuan) {
    tabPengajuan.addEventListener("click", () => {
      if (role === "karyawan") showOnlySection(tabPengajuan, sectionPengajuan);
    });
  }
  if (tabManajemen && sectionManajemen) {
    tabManajemen.addEventListener("click", () => {
      if (role === "admin") {
        showOnlySection(tabManajemen, sectionManajemen);
        loadPengajuan();
      }
    });
  }
  if (btnProfile && sectionProfil) {
    btnProfile.addEventListener("click", () => {
      showOnlySection(btnProfile, sectionProfil);
    });
  }
  if (btnLogout) {
    btnLogout.addEventListener("click", logout);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadProfile();
  const role = window.currentProfileData?.role;
  console.log("Role yang digunakan:", role);

  // Atur visibilitas tab berdasarkan peran
  if (tabAbsensi) tabAbsensi.classList.remove("hidden");
  if (tabPengajuan) tabPengajuan.classList.remove("hidden");
  if (btnProfile) btnProfile.classList.remove("hidden");
  if (btnLogout) btnLogout.classList.remove("hidden");
  if (role === "admin") {
    if (tabDaftar) tabDaftar.classList.remove("hidden");
    if (tabDashboard) tabDashboard.classList.remove("hidden");
    if (tabDetailAnggota) tabDetailAnggota.classList.remove("hidden");
    if (tabLaporan) tabLaporan.classList.remove("hidden");
    if (tabManajemen) tabManajemen.classList.remove("hidden");
  } else {
    if (tabDaftar) tabDaftar.classList.add("hidden");
    if (tabDashboard) tabDashboard.classList.add("hidden");
    if (tabDetailAnggota) tabDetailAnggota.classList.add("hidden");
    if (tabLaporan) tabLaporan.classList.add("hidden");
    if (tabManajemen) tabManajemen.classList.add("hidden");
  }

  setupTabListeners(role);

  // Atur section default
  if (!window.isPostRegistration && !window.isPostAbsensi) {
    if (role === "karyawan" && tabAbsensi && sectionAbsensi) {
      showOnlySection(tabAbsensi, sectionAbsensi);
    } else if (role === "admin" && tabDashboard && sectionDashboard) {
      showOnlySection(tabDashboard, sectionDashboard);
      loadDashboard();
    }
  }
  if (role === "karyawan") {
    loadUserPengajuan(); // Memuat tabel pengajuan untuk karyawan
  }
});
