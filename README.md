Winnicode Absensi
Deskripsi
Winnicode Absensi adalah aplikasi berbasis web yang memanfaatkan teknologi QR Code dan Face Recognition untuk mempermudah proses absensi karyawan. Aplikasi ini dirancang untuk mendukung manajemen absensi secara otomatis dengan fitur seperti pemindaian wajah, pembuatan QR Code, dan laporan analitik.
Fitur Utama

Absensi Wajah: Gunakan kamera untuk absensi otomatis dengan pengenalan wajah.
Pendaftaran Karyawan: Tambahkan karyawan baru dengan data lengkap termasuk foto profil.
Dashboard: Lihat statistik absensi dan distribusi profesi karyawan.
Detail Anggota: Kelola data karyawan dan edit informasi.
Laporan: Tampilkan laporan harian, mingguan, dan ekspor data ke format XLSX.
Profil Pengguna: Lihat dan edit data pribadi pengguna.

Teknologi yang Digunakan

Frontend: HTML, CSS, JavaScript
Library: p5.js (untuk pemindaian QR), Chart.js (untuk visualisasi data)
Backend: Node.js (dengan endpoint seperti http://localhost:4000)
Autentikasi: Token berbasis JWT

Instalasi

Clone repository ini:git clone https://github.com/username/winnicode-absensi.git


Masuk ke direktori proyek:cd winnicode-absensi


Instal dependensi (jika ada backend):npm install


Jalankan server lokal (sesuaikan dengan backend Anda):npm start


Buka index.html di browser atau akses http://localhost:4000 jika menggunakan server.

Penggunaan

Absensi: Klik "Aktifkan Kamera" di tab Absensi, arahkan wajah ke kamera, dan tunggu pemindaian.
Pendaftaran: Isi formulir di tab Pendaftaran, unggah foto, dan daftarkan karyawan.
Dashboard & Laporan: Akses tab Dashboard atau Laporan untuk analisis data.
Profil: Kelola data pribadi di tab Profil.

Kontribusi
Kontribusi diterima! Silakan buat issue atau pull request di repository ini. Pastikan untuk:

Mengikuti gaya kode yang ada.
Menguji perubahan sebelum mengirimkan.

Lisensi
Proyek ini dilisensikan di bawah MIT License.
Kontak

Email: [marnojuluk@gmail.com]
GitHub: MAMOMANO

Catatan Pengembangan

Pastikan kamera dan geolokasi diizinkan oleh browser.
Gunakan token autentikasi yang disimpan di localStorage untuk akses API.
Tanggal saat ini: 17 Juli 2025.

akun admin pertama untuk sistem absensi mahasiswa magang dilakukan secara manual melalui perintah MySQL langsung, yang merupakan metode inisialisasi awal untuk mengatur akses administratif. Proses ini melibatkan akses ke database sistem menggunakan kredensial default (misalnya, sebagai "root"), pemilihan database terkait, dan eksekusi perintah INSERT INTO untuk menambahkan entri akun admin ke tabel pengguna, seperti users atau admin

INSERT INTO users (username, password, role, qr_code, face_data, location, created_at)
VALUES ('admin1', MD5('password123'), 'admin', 'QR_CODE_UNIQUE', 'ENCODED_FACE_DATA', 'POINT(-6.9175 107.6191)', NOW());
akun admin yang sudah ada 
username: ayu
password: ayu123