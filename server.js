const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const mysql = require("mysql2/promise");
const QRCode = require("qrcode");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ExcelJS = require("exceljs"); // Tambahkan ini jika belum ada
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const refreshTokens = new Map();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // Batas 5MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('File harus berupa gambar!'), false);
        }
        cb(null, true);
    }
});

// Middleware untuk menangani error multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({ success: false, message: `Error upload file: ${err.message}` });
  } else if (err) {
      console.error('Server error:', err);
      return res.status(500).json({ success: false, message: `Error server: ${err.message}` });
  }
  next();
});
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Batas 100 permintaan per IP
  message: { success: false, message: "⛔ Terlalu banyak permintaan, coba lagi nanti!" }
});


// Terapkan ke endpoint /absensi
app.use("/absensi", limiter);

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "absensi_qr",
  port: process.env.DB_PORT || 8111,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Cache untuk hari libur (diperbarui setiap hari)
let holidaysCache = { year: null, holidays: [] };
const fetchHolidays = async (year) => {
  if (holidaysCache.year === year) {
    return holidaysCache.holidays;
  }
  try {
    const response = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/ID`);
    holidaysCache = { year, holidays: response.data.map(h => h.date) };
    console.log(`Hari libur ${year} diambil:`, holidaysCache.holidays);
    return holidaysCache.holidays;
  } catch (err) {
    console.error("❌ Error fetching holidays:", err.message);
    return [];
  }
};


// Fungsi utilitas untuk koneksi database
async function getConnection() {
  return await pool.getConnection();
}

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(403).json({ success: false, message: "Token diperlukan!" });
  jwt.verify(token, process.env.JWT_SECRET || "rahasia_super_aman", (err, decoded) => {
    if (err) {
      console.log("Error verifying token:", err.message); // Tambahkan log untuk debug
      return res.status(401).json({ success: false, message: "Token tidak valid!" });
    }
    req.user = decoded;
    next();
  });
};

const requireAdmin = async (req, res, next) => {
  let connection;
  try {
    connection = await pool.getConnection(); // Gunakan pool, bukan dbConfig
    const [rows] = await connection.query('SELECT role FROM user WHERE id = ?', [req.user.id]);
    if (rows.length === 0 || rows[0].role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Hanya admin yang dapat mengakses' });
    }
    next();
  } catch (err) {
    console.error('Error di requireAdmin:', err);
    res.status(500).json({ success: false, message: 'Gagal memeriksa peran admin' });
  } finally {
    if (connection) connection.release(); // Lepaskan koneksi kembali ke pool
  }
};

// Get all members (hanya untuk admin)
app.get('/api/members', verifyToken, requireAdmin, async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.query('SELECT id, user_id, nama, nip, profesi, foto_path AS fotoPath, kode_qr FROM karyawan');
    conn.release();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Error fetching members:", err);
    if (err.name === 'JsonWebTokenError') {
      res.status(403).json({ success: false, message: "Token tidak valid" });
    } else {
      res.status(500).json({ success: false, message: "Gagal mengambil data karyawan" });
    }
  }
});


app.get('/api/members/profesi', verifyToken, requireAdmin, async (req, res) => {
  console.log('Request to /api/members/profesi from:', req.ip, 'with token:', req.headers.authorization);
  let connection;
  try {
    connection = await getConnection();
    const [rows] = await connection.query(
      'SELECT COALESCE(profesi, "Tidak Ditentukan") as profesi, COUNT(*) as count FROM karyawan GROUP BY COALESCE(profesi, "Tidak Ditentukan")'
    );
    console.log('Query result:', rows);
    if (rows.length === 0) {
      console.log('No data found in karyawan table');
      return res.status(404).json({ success: false, message: 'Tidak ada data profesi' });
    }
    console.log('Profesi data fetched:', rows);
    connection.release();
    res.json({ success: true, data: rows });
  } catch (err) {
    if (connection) connection.release();
    console.error('Database error:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Gagal mengambil data profesi' });
  }
});


app.get('/api/members/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const conn = await getConnection();

  try {
    const [rows] = await conn.query(
      'SELECT u.id, u.username, u.role, u.nama, u.nip, k.profesi, k.foto_path, k.kode_qr ' +
      'FROM user u LEFT JOIN karyawan k ON u.id = k.user_id WHERE u.id = ?',
      [id]
    );
    conn.release();

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Anggota tidak ditemukan' });
    }

    const member = rows[0];
    if (member.foto_path) {
      member.foto_path = path.basename(member.foto_path);
    }

    res.json({ success: true, data: member });
  } catch (error) {
    conn.release();
    console.error('Error fetching member:', error);
    res.status(500).json({ success: false, message: 'Gagal memuat data anggota: ' + error.message });
  }
});


// Tambahkan endpoint ini di sini
// Endpoint untuk mengambil foto
app.get('/foto/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'face-recognition', 'database', filename);
  console.log(`Mencoba mengakses file: ${filePath}`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    console.error(`File tidak ditemukan: ${filePath}`);
    res.status(404).json({ success: false, message: `Foto dengan nama ${filename} tidak ditemukan` });
  }
});

// Endpoint untuk memperbarui data karyawan
app.put('/api/members/:id', verifyToken, requireAdmin, upload.single('foto'), async (req, res) => {
  const { id } = req.params;
  const { nama, nip, profesi, username, password, role } = req.body;

  // Validasi role
  if (!['admin', 'karyawan'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Role tidak valid. Harus "admin" atau "karyawan".' });
  }

  // Validasi profesi
  if (role === 'karyawan' && (!profesi || profesi.trim() === '')) {
    return res.status(400).json({ success: false, message: 'Profesi wajib diisi untuk karyawan.' });
  }

  const connection = await pool.getConnection();
  try {
    // Cek apakah pengguna ada di tabel user
    const [existingUser] = await connection.execute(
      'SELECT * FROM user WHERE id = ?', [id]
    );
    if (existingUser.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    // Cek apakah karyawan ada
    const [existingKaryawan] = await connection.execute(
      'SELECT * FROM karyawan WHERE user_id = ?', [id]
    );
    if (existingKaryawan.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });
    }

    // Cek apakah username sudah digunakan
    if (username && username !== existingUser[0].username) {
      const [existingUserWithUsername] = await connection.execute(
        'SELECT * FROM user WHERE username = ? AND id != ?', [username, id]
      );
      if (existingUserWithUsername.length > 0) {
        connection.release();
        return res.status(400).json({ success: false, message: 'Username sudah digunakan' });
      }
    }

    // Bangun query untuk tabel user
    let updateUserQuery = 'UPDATE user SET nama = ?, nip = ?, username = ?, role = ?';
    const userParams = [nama, nip, username, role];
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateUserQuery += ', password = ?';
      userParams.push(hashedPassword);
    }
    updateUserQuery += ' WHERE id = ?';
    userParams.push(id);

    // Bangun query untuk tabel karyawan
    let updateKaryawanQuery = 'UPDATE karyawan SET nama = ?, nip = ?';
    const karyawanParams = [nama, nip];
    if (role === 'karyawan') {
      updateKaryawanQuery += ', profesi = ?';
      karyawanParams.push(profesi || '');
    } else if (role === 'admin') {
      updateKaryawanQuery += ', profesi = NULL';
    }

    // Penanganan foto
    let fotoPath = existingKaryawan[0].foto_path;
    if (req.file) {
      const filename = role === 'admin' ? `${nip}.jpg` : `${existingKaryawan[0].kode_qr || nip}.jpg`;
      fotoPath = path.join(__dirname, 'face-recognition', 'database', filename);
      console.log("Menyimpan file ke:", fotoPath);
      if (!fs.existsSync(path.dirname(fotoPath))) {
        fs.mkdirSync(path.dirname(fotoPath), { recursive: true });
      }
      if (existingKaryawan[0].foto_path) {
        const oldFotoPath = path.join(__dirname, 'face-recognition', 'database', existingKaryawan[0].foto_path);
        if (fs.existsSync(oldFotoPath)) {
          fs.unlinkSync(oldFotoPath);
        }
      }
      fs.writeFileSync(fotoPath, req.file.buffer);
      updateKaryawanQuery += ', foto_path = ?';
      karyawanParams.push(path.basename(filename));
    } else if (existingKaryawan[0].foto_path && nip && nip !== existingKaryawan[0].nip && role === 'admin') {
      const oldFotoPath = path.join(__dirname, 'face-recognition', 'database', existingKaryawan[0].foto_path);
      const newFilename = `${nip}.jpg`;
      const newFotoPath = path.join(__dirname, 'face-recognition', 'database', newFilename);
      if (fs.existsSync(oldFotoPath)) {
        fs.renameSync(oldFotoPath, newFotoPath);
        console.log(`Mengganti nama file dari ${existingKaryawan[0].foto_path} ke ${newFilename}`);
        updateKaryawanQuery += ', foto_path = ?';
        karyawanParams.push(newFilename);
      }
    }

    updateKaryawanQuery += ' WHERE user_id = ?';
    karyawanParams.push(id);

    console.log("Query user:", updateUserQuery, userParams);
    console.log("Query karyawan:", updateKaryawanQuery, karyawanParams);

    await connection.execute(updateUserQuery, userParams);
    await connection.execute(updateKaryawanQuery, karyawanParams);
    connection.release();

    res.json({ success: true, message: 'Data karyawan berhasil diperbarui' });
  } catch (error) {
    connection.release();
    console.error('Error memperbarui karyawan:', error);
    res.status(500).json({ success: false, message: 'Gagal memperbarui karyawan: ' + error.message });
  }
});

// Hapus member (hanya untuk admin) - Menggantikan semua endpoint DELETE sebelumnya
app.delete('/api/members/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  let connection;

  try {
    connection = await getConnection();
    await connection.beginTransaction();

    // Periksa apakah karyawan ada
    const [existingKaryawan] = await connection.query('SELECT user_id FROM karyawan WHERE id = ?', [id]);
    if (existingKaryawan.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan' });
    }

    const userId = existingKaryawan[0].user_id;

    // Hapus dari tabel karyawan
    await connection.query('DELETE FROM karyawan WHERE id = ?', [id]);
    console.log(`Karyawan dengan id ${id} dihapus dari tabel karyawan`);

    // Hapus dari tabel user
    await connection.query('DELETE FROM user WHERE id = ?', [userId]);
    console.log(`User dengan id ${userId} dihapus dari tabel user`);

    await connection.commit();
    connection.release();

    res.json({ success: true, message: 'Karyawan berhasil dihapus' });
  } catch (err) {
    if (connection) await connection.rollback();
    if (connection) connection.release();
    console.error('Error deleting member:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus karyawan' });
  }
});

app.get("/admin/rekap-absensi", verifyToken, requireAdmin, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    let query = `
      SELECT 
        a.id AS absensi_id,
        k.nama,
        k.nip,
        a.tanggal,
        COALESCE(
          a.status,
          CASE 
            WHEN p.status = 'disetujui' THEN p.jenis
            ELSE 'tidak_hadir'
          END
        ) AS status,
        p.keterangan AS pengajuan_keterangan
      FROM karyawan k
      LEFT JOIN absensi a ON k.id = a.karyawan_id
      LEFT JOIN pengajuan p ON k.id = p.karyawan_id 
        AND p.status = 'disetujui'
        AND a.tanggal BETWEEN p.tanggal_mulai AND p.tanggal_selesai
    `;
    const params = [];
    const { tanggal, nip, bulan } = req.query;

    if (tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      conn.release();
      return res.status(400).json({ success: false, message: "Format tanggal tidak valid!" });
    }

    let conditions = [];
    if (tanggal) {
      conditions.push("DATE(a.tanggal) = ? OR (a.tanggal IS NULL AND ? BETWEEN p.tanggal_mulai AND p.tanggal_selesai)");
      params.push(tanggal, tanggal);
    }
    if (nip) {
      conditions.push("k.nip = ?");
      params.push(nip);
    }
    if (bulan) {
      conditions.push("MONTH(a.tanggal) = ? OR (a.tanggal IS NULL AND MONTH(?) = MONTH(p.tanggal_mulai))");
      params.push(bulan, bulan);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY a.tanggal DESC, k.nama ASC";
    const [rows] = await conn.query(query, params);

    const formattedRows = [];
    const seen = new Set();
    rows.forEach(row => {
      const key = `${row.nip}-${row.tanggal || tanggal}`;
      if (!seen.has(key)) {
        formattedRows.push({
          absensi_id: row.absensi_id,
          nama: row.nama,
          nip: row.nip,
          tanggal: row.tanggal || tanggal,
          status: row.status,
          pengajuan_keterangan: row.pengajuan_keterangan || "-",
        });
        seen.add(key);
      }
    });

    conn.release();
    res.json({ success: true, data: formattedRows });
  } catch (err) {
    conn.release();
    console.error("Gagal ambil rekap absensi:", err);
    res.status(500).json({ success: false, message: "Gagal ambil data absensi: " + err.message });
  }
});

// Endpoint /daftar-dengan-foto
app.post("/daftar-dengan-foto", verifyToken, requireAdmin, upload.single("foto"), async (req, res) => {
  console.log("Received data:", req.body);
  console.log("File diterima:", req.file ? { originalname: req.file.originalname, size: req.file.size } : "Tidak ada file");
  const { nama, nip, username, password, role, profesi } = req.body;
  let kode_qr = null;
  let qrUrl = null;

  // Hanya buat kode_qr dan qrUrl untuk role karyawan
  if (role === "karyawan") {
      kode_qr = `EMP-${nip}`;
      qrUrl = await QRCode.toDataURL(kode_qr);
  }

  const conn = await getConnection();

  try {
      await conn.beginTransaction();

      if (!nama || !nip || !username || !password || !role) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ success: false, message: "⚠ Semua field wajib diisi!" });
      }
      if (!["admin", "karyawan"].includes(role)) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ success: false, message: "⚠ Role tidak valid!" });
      }

      const [existingNIP] = await conn.query("SELECT * FROM karyawan WHERE nip = ?", [nip]);
      if (existingNIP.length) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ success: false, message: "⚠ NIP sudah terdaftar!" });
      }

      const [existingUsername] = await conn.query("SELECT * FROM user WHERE username = ?", [username]);
      if (existingUsername.length) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ success: false, message: "⚠ Username sudah digunakan!" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [userResult] = await conn.query(
          "INSERT INTO user (username, password, role, nama, nip, kode_qr, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
          [username, hashedPassword, role, nama, nip, kode_qr]
      );
      const userId = userResult.insertId;

      // peubahan di mulai dari sini
      let fotoPath = null;
      if (req.file) {
          const filename = role === "karyawan" ? `${kode_qr}.jpg` : `${nip}.jpg`;
          fotoPath = path.join(__dirname, "face-recognition", "database", filename);
          console.log("Menyimpan foto ke:", fotoPath);
          if (!fs.existsSync(path.dirname(fotoPath))) fs.mkdirSync(path.dirname(fotoPath), { recursive: true });
          fs.writeFileSync(fotoPath, req.file.buffer);
      }

      const finalProfesi = role === "admin" ? "admin" : (profesi || "");

      await conn.query(
          "INSERT INTO karyawan (user_id, nama, nip, kode_qr, foto_path, profesi, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
          [userId, nama, nip, kode_qr, fotoPath ? path.basename(fotoPath) : null, finalProfesi]
      );

      await conn.commit();
      conn.release();

      const responseData = {
          success: true,
          message: "✅ Karyawan + akun berhasil dibuat!",
      };
      if (qrUrl) {
          responseData.qr_code_url = qrUrl;
          responseData.kode_qr = kode_qr;
      }

      res.json(responseData);
  } catch (err) {
      await conn.rollback();
      conn.release();
      console.error("❌ Error daftar:", err);
      res.status(500).json({ success: false, message: "❌ Gagal menyimpan data: " + err.message });
  }
});

app.post("/absensi", verifyToken, upload.single("image"), async (req, res) => {
  console.log("Request diterima:", {
    file: req.file ? { size: req.file.size, mimetype: req.file.mimetype, isBuffer: Buffer.isBuffer(req.file.buffer) } : null,
    body: req.body,
  });
  const waktu = new Date();
  const day = waktu.getDay();
  const hour = waktu.getHours();
  const conn = await getConnection();
  console.log("File diterima:", req.file ? { size: req.file.size, mimetype: req.file.mimetype } : "Tidak ada file");

  // Validasi hari libur dari API
  const today = waktu.toISOString().split("T")[0];
  const holidays = await fetchHolidays(waktu.getFullYear());
  if (holidays.includes(today)) {
    conn.release();
    return res.status(403).json({
      success: false,
      message: "⛔ Absensi tidak diizinkan pada hari libur nasional!",
    });
  }

  // Validasi lokasi dari header x-location
  if (req.headers["x-location"]) {
    const [lat, lon] = req.headers["x-location"].split(",").map(Number);
    if (isNaN(lat) || isNaN(lon)) {
      conn.release();
      return res.status(400).json({
        success: false,
        message: "⛔ Format lokasi tidak valid!",
      });
    }
    const distance = getDistanceFromLatLonInKm(-6.922265838681203, 107.61572561092594, lat, lon);
    if (distance > 600) { // Radius 150 meter
      conn.release();
      return res.status(403).json({
        success: false,
        message: "⛔ Lokasi di luar area kerja!",
      });
    }
  } else {
    conn.release();
    return res.status(400).json({
      success: false,
      message: "⛔ Lokasi diperlukan!",
    });
  }

  // Validasi waktu
  if (day < 1 || day > 5 || hour < 8 || hour >= 17) {
    conn.release();
    return res.status(403).json({
      success: false,
      message: "⛔ Absensi hanya diizinkan Senin–Jumat, pukul 08:00–17:00",
    });
  }

  try {
    if (!req.file || !Buffer.isBuffer(req.file.buffer)) {
      conn.release();
      console.error("❌ Tidak ada file gambar atau buffer tidak valid:", req.file);
      return res.status(400).json({ success: false, message: "⚠ Foto wajah wajib disertakan!" });
    }

    const qrData = req.body.qrData;
    const databaseFolder = path.join(__dirname, "absensi_photos");
    if (!fs.existsSync(databaseFolder)) fs.mkdirSync(databaseFolder, { recursive: true });

    let karyawan = null;
    if (qrData) {
      const [karyawanRows] = await conn.query("SELECT * FROM karyawan WHERE kode_qr = ?", [qrData]);
      if (karyawanRows.length) karyawan = karyawanRows[0];
    }
    const form = new FormData();
    console.log("Tipe req.file.buffer:", typeof req.file.buffer, "Is Buffer:", Buffer.isBuffer(req.file.buffer));
    console.log("Ukuran Buffer:", req.file.buffer.length, "MIME:", req.file.mimetype);
    console.log("Sample buffer content:", req.file.buffer.slice(0, 10).toString("hex"));
    form.append("image", req.file.buffer, {
      filename: "selfie.jpg",
      contentType: req.file.mimetype,
    });
    if (req.body.qrData) {
      form.append("qrData", req.body.qrData);
      console.log("qrData ditambahkan ke FormData:", req.body.qrData);
    } else {
      console.log("qrData tidak tersedia di req.body:", req.body);
    }

    let faceResp;
    try {
      console.log("Mengirim ke verify-face...");
      faceResp = await axios.post("http://localhost:5000/verify-face", form, {
        headers: form.getHeaders(),
      });
      console.log("Respons verifikasi wajah:", faceResp.data);
    } catch (err) {
      conn.release();
      console.error("❌ Error verifikasi wajah:", err.message, err.stack);
      console.error("Detail error dari server:", err.response?.data || "Tidak ada respons");
      return res.status(err.response?.status || 500).json({
        success: false,
        message: err.response?.data?.message || "❌ Error dari verifikasi wajah!",
      });
    }

    const { matched, kode_qr } = faceResp.data;
    console.log("Verifikasi wajah:", { matched, kode_qr });

    if (!matched || !kode_qr) {
      conn.release();
      return res.status(400).json({ success: false, message: "❌ Wajah tidak cocok atau tidak dikenali!" });
    }

    if (!karyawan) {
      const [karyawanRows] = await conn.query("SELECT * FROM karyawan WHERE kode_qr = ?", [kode_qr]);
      if (!karyawanRows.length) {
        conn.release();
        return res.status(404).json({ success: false, message: "⚠ Data karyawan tidak ditemukan!" });
      }
      karyawan = karyawanRows[0];
    }

    const [user] = await conn.query("SELECT role FROM user WHERE id = (SELECT user_id FROM karyawan WHERE id = ?)", [
      karyawan.id,
    ]);
    if (user[0].role === "admin") {
      conn.release();
      return res.status(403).json({ success: false, message: "⛔ Admin tidak diizinkan untuk absen!" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [pengajuanRows] = await conn.query(
      "SELECT * FROM pengajuan WHERE karyawan_id = ? AND status = 'disetujui' AND tanggal_mulai <= ? AND tanggal_selesai >= ?",
      [karyawan.id, today, today]
    );
    if (pengajuanRows.length > 0) {
      conn.release();
      return res.status(403).json({
        success: false,
        message: `⛔ Karyawan memiliki ${pengajuanRows[0].jenis} yang disetujui pada tanggal ini!`,
      });
    }

    const [absensiHariIni] = await conn.query(
      "SELECT * FROM absensi WHERE karyawan_id = ? AND tanggal >= ? AND tanggal < ?",
      [karyawan.id, today, tomorrow]
    );

    if (absensiHariIni.length > 0) {
      conn.release();
      return res.status(400).json({
        success: false,
        message: "⚠ Karyawan sudah melakukan absensi hari ini!",
      });
    }

    const fotoAbsenPath = path.join(databaseFolder, `${kode_qr}_absen_${Date.now()}.jpg`);
    fs.writeFileSync(fotoAbsenPath, req.file.buffer);

    await conn.query(
      "INSERT INTO absensi (karyawan_id, tanggal, status, foto_absen, created_at) VALUES (?, ?, ?, ?, NOW())",
      [karyawan.id, waktu, "hadir", fotoAbsenPath]
    );

    await conn.query(
      "INSERT INTO device_logs (device_id, karyawan_id, log_time, log_type, details, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      ["device_001", karyawan.id, waktu, "scan", "Absensi sukses"]
    );

    conn.release();

    res.json({
      success: true,
      faceVerified: true,
      name: karyawan.nama,
      message: `✅ Absensi berhasil untuk ${karyawan.nama}!`,
    });
  } catch (err) {
    conn.release();
    console.error("❌ Error absensi:", err.stack);
    res.status(500).json({ success: false, message: `❌ Terjadi kesalahan pada proses absensi: ${err.message}` });
  }

  function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius bumi dalam km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
});
// Endpoint GET /pengajuan (untuk admin)
app.get("/pengajuan", verifyToken, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "⛔ Hanya admin yang dapat mengakses!" });
  }
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      "SELECT p.id, k.nama, p.jenis, p.tanggal_mulai, p.tanggal_selesai, p.keterangan, p.status " +
      "FROM pengajuan p JOIN karyawan k ON p.karyawan_id = k.id"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error GET /pengajuan:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server: " + error.message });
  } finally {
    conn.release();
  }
});

// Endpoint Pengajuan Izin/Sakit
app.post("/pengajuan", verifyToken, async (req, res) => {
  const { jenis, tanggal_mulai, tanggal_selesai, keterangan } = req.body;
  const conn = await pool.getConnection();

  try {
    // Validasi input
    if (!jenis || !["izin", "sakit"].includes(jenis)) {
      conn.release();
      return res.status(400).json({ success: false, message: "⚠ Jenis pengajuan harus 'izin' atau 'sakit'!" });
    }
    if (!tanggal_mulai || !tanggal_selesai) {
      conn.release();
      return res.status(400).json({ success: false, message: "⚠ Tanggal mulai dan selesai diperlukan!" });
    }
    const startDate = new Date(tanggal_mulai);
    const endDate = new Date(tanggal_selesai);
    if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
      conn.release();
      return res.status(400).json({ success: false, message: "⚠ Format tanggal tidak valid atau tanggal mulai lebih besar dari tanggal selesai!" });
    }

    // Cek karyawan
    const [karyawanRows] = await conn.query("SELECT * FROM karyawan WHERE user_id = ?", [req.user.id]);
    if (!karyawanRows.length) {
      conn.release();
      return res.status(404).json({ success: false, message: "⚠ Karyawan tidak ditemukan!" });
    }
    const karyawan = karyawanRows[0];

    // Cek pengajuan yang sudah ada untuk tanggal yang sama
    const [existingRows] = await conn.query(
      "SELECT * FROM pengajuan WHERE karyawan_id = ? AND ((tanggal_mulai <= ? AND tanggal_selesai >= ?) OR (tanggal_mulai <= ? AND tanggal_selesai >= ?))",
      [karyawan.id, startDate, startDate, endDate, endDate]
    );
    if (existingRows.length > 0) {
      conn.release();
      return res.status(400).json({ success: false, message: "⚠ Pengajuan sudah ada untuk rentang tanggal ini!" });
    }

    // Simpan pengajuan
    await conn.query(
      "INSERT INTO pengajuan (karyawan_id, jenis, tanggal_mulai, tanggal_selesai, keterangan, status) VALUES (?, ?, ?, ?, ?, 'pending')",
      [karyawan.id, jenis, tanggal_mulai, tanggal_selesai, keterangan || ""]
    );

    conn.release();
    res.json({ success: true, message: `✅ Pengajuan ${jenis} berhasil diajukan, menunggu persetujuan!` });
  } catch (err) {
    conn.release();
    console.error("❌ Error pengajuan:", err.stack);
    res.status(500).json({ success: false, message: `❌ Terjadi kesalahan pada proses pengajuan: ${err.message}` });
  }
});

// Endpoint PUT /pengajuan/:id (untuk admin)
app.put("/pengajuan/:id", verifyToken, async (req, res) => {
  const conn = await pool.getConnection();
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "⛔ Hanya admin yang dapat mengubah status!" });
  }
  const { status } = req.body;
  const { id } = req.params;
  if (!status || !["disetujui", "ditolak"].includes(status)) {
    return res.status(400).json({ success: false, message: "⛔ Status tidak valid!" });
  }
  try {
    const [result] = await conn.query("UPDATE pengajuan SET status = ? WHERE id = ?", [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "⛔ Pengajuan tidak ditemukan!" });
    }
    res.json({ success: true, message: `✅ Pengajuan berhasil ${status}!` });
  } catch (error) {
    console.error("Error PUT /pengajuan/:id:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server!" });
  }
});


// Endpoint untuk karyawan melihat pengajuan mereka sendiri
app.get("/api/pengajuan/user", verifyToken, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    // Cek apakah user adalah karyawan
    const [karyawanRows] = await conn.query("SELECT id FROM karyawan WHERE user_id = ?", [req.user.id]);
    if (!karyawanRows.length) {
      conn.release();
      return res.status(404).json({ success: false, message: "⚠ Karyawan tidak ditemukan!" });
    }
    const karyawanId = karyawanRows[0].id;

    // Ambil daftar pengajuan untuk karyawan ini
    const [rows] = await conn.query(
      "SELECT id, jenis, tanggal_mulai, tanggal_selesai, keterangan, status " +
      "FROM pengajuan WHERE karyawan_id = ? ORDER BY created_at DESC",
      [karyawanId]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error GET /api/pengajuan/user:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server: " + error.message });
  } finally {
    conn.release();
  }
});


app.get("/api/get-qr/:nip?", verifyToken, async (req, res) => {
  const nip = req.params.nip;
  if (!nip) {
    return res.status(400).json({ success: false, message: "NIP diperlukan!" });
  }

  const conn = await getConnection();
  try {
    const [rows] = await conn.query("SELECT kode_qr FROM karyawan WHERE nip = ?", [nip]);
    conn.release();

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Karyawan tidak ditemukan!" });
    }

    const kode_qr = rows[0].kode_qr;
    const qrUrl = await QRCode.toDataURL(kode_qr);
    res.json({ success: true, qr_url: qrUrl, kode_qr });
  } catch (err) {
    conn.release();
    console.error("Error fetching QR:", err);
    res.status(500).json({ success: false, message: "Gagal mengambil QR code!" });
  }
});

// Endpoint /login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const conn = await getConnection();

  try {
    const [users] = await conn.query("SELECT * FROM user WHERE username = ?", [username]);
    if (!users.length) {
      return res.status(401).json({ success: false, message: "Username tidak ditemukan." });
    }
    const user = users[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Password salah." });
    }
    const accessToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "rahasia_super_aman",
      { expiresIn: "1h" }
    );
    const refreshToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_REFRESH_SECRET || "rahasia_refresh_aman",
      { expiresIn: "7d" }
    );
    console.log("Refresh token dibuat:", refreshToken);
    console.log("JWT_REFRESH_SECRET:", process.env.JWT_REFRESH_SECRET || "rahasia_refresh_aman");
    await conn.query(
      "INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))",
      [refreshToken, user.id]
    );
    res.json({
      success: true,
      message: "Login berhasil.",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        nama: user.nama,
        nip: user.nip,
        kode_qr: user.kode_qr
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat login." });
  } finally {
    conn.release();
  }
});


app.post("/api/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  const conn = await getConnection();
  console.log("Refresh token diterima:", refreshToken);
  console.log("JWT_REFRESH_SECRET untuk verifikasi:", process.env.JWT_REFRESH_SECRET || "rahasia_refresh_aman");
  try {
    const [tokens] = await conn.query(
      "SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()",
      [refreshToken]
    );
    if (!tokens.length) {
      conn.release();
      return res.status(403).json({ success: false, message: "Refresh token tidak valid." });
    }
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "rahasia_refresh_aman");
    console.log("Refresh token terverifikasi:", decoded);
    const accessToken = jwt.sign(
      { id: decoded.id, username: decoded.username, role: decoded.role },
      process.env.JWT_SECRET || "rahasia_super_aman",
      { expiresIn: "1h" }
    );
    res.json({ success: true, accessToken });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(403).json({ success: false, message: "Refresh token tidak valid atau kadaluarsa." });
  } finally {
    conn.release();
  }
});

// Routing statis untuk file frontend
app.use(express.static(path.join(__dirname)));
// ... (dependensi dan middleware sebelumnya)

app.get("/admin/absensi", verifyToken, requireAdmin, async (req, res) => {
  const { nip, tanggal } = req.query;
  const conn = await getConnection();

  try {
    let query = "SELECT a.*, k.nama FROM absensi a JOIN karyawan k ON a.karyawan_id = k.id WHERE 1=1";
    const params = [];

    if (nip) {
      query += " AND k.nip = ?";
      params.push(nip);
    }

    if (tanggal) {
      query += " AND DATE(a.tanggal) = ?";
      params.push(tanggal);
    }

    const [rows] = await conn.query(query, params);
    conn.release();

    res.json({ success: true, data: rows });
  } catch (err) {
    conn.release();
    console.error("❌ Error ambil data absensi:", err);
    res.status(500).json({ success: false, message: "Gagal ambil data absensi" });
  }
});

app.get("/admin/absensi/export", verifyToken, requireAdmin, async (req, res) => {
  const { nip, tanggal, startDate, endDate } = req.query;
  const conn = await getConnection();

  try {
    let query = "SELECT a.tanggal, a.status, k.nama, k.nip, k.kode_qr FROM absensi a JOIN karyawan k ON a.karyawan_id = k.id WHERE 1=1";
    const params = [];

    if (nip) {
      query += " AND k.nip = ?";
      params.push(nip);
      console.log("Filter NIP:", nip);
    }


    if (startDate && endDate) {
      query += " AND a.tanggal BETWEEN ? AND ?";
      params.push(new Date(startDate).toISOString().split("T")[0], new Date(endDate).toISOString().split("T")[0]);
      console.log("Filter Rentang Tanggal:", startDate, "to", endDate);
    } else if (tanggal) {
      query += " AND DATE(a.tanggal) = ?";
      params.push(tanggal);
      console.log("Filter Tanggal:", tanggal);
    }

    const [rows] = await conn.query(query, params);
    console.log("Data yang diekspor:", rows);

    if (rows.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: "Tidak ada data absensi untuk filter ini." });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Rekap Absensi");

    sheet.columns = [
      { header: "Nama", key: "nama", width: 25 },
      { header: "NIP", key: "nip", width: 15 },
      { header: "Kode QR", key: "kode_qr", width: 20 },
      { header: "Tanggal", key: "tanggal", width: 25 },
      { header: "Status", key: "status", width: 20 },
    ];

    rows.forEach(row => {
      sheet.addRow({
        nama: row.nama,
        nip: row.nip || "",
        kode_qr: row.kode_qr || "",
        tanggal: row.tanggal ? new Date(row.tanggal).toISOString().split("T")[0] : "",
        status: row.status || "Tidak ada status",
      });
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=rekap-absensi.xlsx");
    await workbook.xlsx.write(res);
    res.end();
    console.log("File Excel dikirim.");
  } catch (err) {
    conn.release();
    console.error("❌ Error export Excel:", err);
    res.status(500).json({ success: false, message: "Gagal export Excel" });
  }
});

app.get("/api/absensi/stats", verifyToken, requireAdmin, async (req, res) => {
  const conn = await getConnection();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [rows] = await conn.query(
      "SELECT status, COUNT(*) as count FROM absensi WHERE tanggal >= ? AND tanggal < ? GROUP BY status",
      [today, tomorrow]
    );
    conn.release();

    const stats = {
      hadir: rows.find(r => r.status === "hadir")?.count || 0,
      terlambat: rows.find(r => r.status === "terlambat")?.count || 0,
      wfh: rows.find(r => r.status === "wfh")?.count || 0
    };
    res.json({ success: true, stats });
  } catch (err) {
    conn.release();
    console.error("❌ Error ambil statistik:", err);
    res.status(500).json({ success: false, message: "Gagal ambil statistik" });
  }
});

app.get("/api/absensi/chart", verifyToken, requireAdmin, async (req, res) => {
  const { period = "weekly" } = req.query; // "weekly" atau "monthly"
  const conn = await getConnection();
  try {
    let query, params;
    const today = new Date();
    if (period === "monthly") {
      query = `
        SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') as date, COUNT(*) as count 
        FROM absensi 
        WHERE tanggal >= DATE_SUB(?, INTERVAL 1 MONTH) 
        GROUP BY DATE(tanggal)
      `;
      params = [today];
    } else {
      query = `
        SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') as date, COUNT(*) as count 
        FROM absensi 
        WHERE tanggal >= DATE_SUB(?, INTERVAL 7 DAY) 
        GROUP BY DATE(tanggal)
      `;
      params = [today];
    }
    const [rows] = await conn.query(query, params);
    conn.release();

    const chartData = {
      labels: rows.map(row => row.date),
      datasets: [{
        label: "Jumlah Kehadiran",
        data: rows.map(row => row.count),
        backgroundColor: "#4CAF50",
        borderColor: "#388E3C",
        borderWidth: 1
      }]
    };
    res.json({ success: true, chartData });
  } catch (err) {
    conn.release();
    console.error("❌ Error ambil data chart:", err);
    res.status(500).json({ success: false, message: "Gagal ambil data chart" });
  }
});


app.get("/api/print-qr-card/:nip", verifyToken, requireAdmin, async (req, res) => {
  const { nip } = req.params;
  const conn = await getConnection();
  try {
    const [rows] = await conn.query("SELECT kode_qr, nama, nip FROM karyawan WHERE nip = ?", [nip]);
    conn.release();

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "⚠ Karyawan tidak ditemukan!" });
    }

    const { kode_qr, nama } = rows[0];
    const qrUrl = await QRCode.toDataURL(kode_qr);
    res.json({
      success: true,
      data: { qrUrl, nama, nip },
      message: "✅ Kartu QR berhasil dihasilkan!"
    });
  } catch (err) {
    conn.release();
    console.error("❌ Error generate QR card:", err);
    res.status(500).json({ success: false, message: "Gagal generate kartu QR" });
  }
});


// CREATE Karyawan
app.post("/admin/karyawan", verifyToken, requireAdmin, upload.single("foto"), async (req, res) => {
  const { nama, nip, username, password, role, profesi } = req.body;
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [existingNIP] = await conn.query("SELECT * FROM karyawan WHERE nip = ?", [nip]);
    if (existingNIP.length) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: "NIP sudah terdaftar!" });
    }

    const [existingUsername] = await conn.query("SELECT * FROM user WHERE username = ?", [username]);
    if (existingUsername.length) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: "Username sudah digunakan!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const kode_qr = role === "karyawan" ? `EMP-${nip}` : null;
    const [userResult] = await conn.query(
      "INSERT INTO user (username, password, role, nama, nip, kode_qr, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [username, hashedPassword, role, nama, nip, kode_qr]
    );
    const userId = userResult.insertId;

    let fotoPath = null;
    if (role !== "admin" && req.file) {
      fotoPath = path.join(__dirname, "face-recognition", "database", `${kode_qr || nip}.jpg`);
      if (!fs.existsSync(path.dirname(fotoPath))) fs.mkdirSync(path.dirname(fotoPath), { recursive: true });
      fs.writeFileSync(fotoPath, req.file.buffer);
    }

    const finalProfesi = role === "admin" ? "admin" : (profesi || "");

    await conn.query(
      "INSERT INTO karyawan (user_id, nama, nip, kode_qr, foto_path, profesi, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [userId, nama, nip, kode_qr, fotoPath, finalProfesi]
    );

    await conn.commit();
    conn.release();
    res.json({ success: true, message: "Karyawan berhasil ditambahkan!" });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("Gagal tambah karyawan:", err);
    res.status(500).json({ success: false, message: "Gagal tambah karyawan" });
  }
});

// READ Semua Karyawan
app.get("/admin/karyawan", verifyToken, requireAdmin, async (req, res) => {
  const conn = await getConnection();
  try {
    const [rows] = await conn.query("SELECT * FROM karyawan");
    conn.release();
    res.json({ success: true, data: rows });
  } catch (err) {
    conn.release();
    console.error("Gagal ambil karyawan:", err);
    res.status(500).json({ success: false, message: "Gagal ambil data karyawan" });
  }
});

app.get("/api/profil", verifyToken, async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const conn = await getConnection();
  try {
    const userId = req.user.id;
    console.log("Mengambil profil untuk userId:", userId);

    const [rows] = await conn.query(
      "SELECT u.id, u.username, u.role, u.nama, u.nip, k.profesi, k.foto_path, k.kode_qr " +
      "FROM user u LEFT JOIN karyawan k ON u.id = k.user_id WHERE u.id = ?",
      [userId]
    );
    conn.release();

    if (!rows.length) {
      console.error("Profil tidak ditemukan untuk userId:", userId);
      return res.status(404).json({ success: false, message: "Profil tidak ditemukan" });
    }

    const profile = rows[0];
    if (profile.foto_path) {
      profile.foto_path = path.basename(profile.foto_path);
    }
    console.log("Data profil yang dikembalikan:", profile);

    res.json({ success: true, data: profile });
  } catch (err) {
    conn.release();
    console.error("Gagal ambil profil:", err);
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Token tidak valid" });
    }
    res.status(500).json({ success: false, message: "Gagal mengambil profil: " + err.message });
  }
});

app.get("/api/karyawan", verifyToken, requireAdmin, async (req, res) => {
  const conn = await getConnection();
  try {
    const [rows] = await conn.query("SELECT id, nama, nip, profesi, foto_path FROM karyawan");
    conn.release();
    res.json({ success: true, data: rows });
  } catch (err) {
    conn.release();
    console.error("Gagal ambil daftar karyawan:", err);
    res.status(500).json({ success: false, message: "Gagal ambil daftar karyawan" });
  }
});

// Endpoint untuk data absensi harian
app.get('/api/attendance', verifyToken, requireAdmin, async (req, res) => {
  const { profesi, date } = req.query;
  let connection;
  try {
    connection = await getConnection();
    // Konversi date ke format datetime dengan zona waktu WIB
    const startOfDay = date 
      ? new Date(`${date}T00:00:00+07:00`) 
      : new Date().toISOString().replace('Z', '+07:00').replace(/T\d{2}:\d{2}:\d{2}/, 'T00:00:00');
    const endOfDay = date 
      ? new Date(`${date}T23:59:59+07:00`) 
      : new Date().toISOString().replace('Z', '+07:00').replace(/T\d{2}:\d{2}:\d{2}/, 'T23:59:59');

    let query = 'SELECT k.id, u.nama, k.profesi, a.tanggal, a.status FROM karyawan k JOIN user u ON k.user_id = u.id LEFT JOIN absensi a ON k.id = a.karyawan_id AND a.tanggal BETWEEN ? AND ?';
    const params = [startOfDay, endOfDay];
    if (profesi) {
      query += ' WHERE k.profesi = ?';
      params.push(profesi);
    }
    const [rows] = await connection.query(query, params);

    // Hanya ubah null menjadi 'tidak_hadir' jika tidak ada absensi
    const formattedRows = rows.map(row => ({
      ...row,
      status: row.status || 'tidak_hadir' // Default ke 'tidak_hadir' jika null
    }));

    connection.release();
    res.json({ success: true, data: formattedRows });
  } catch (err) {
    if (connection) connection.release();
    console.error('Error fetching attendance:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data absensi' });
  }
});

// Endpoint untuk data absensi mingguan
app.get('/api/attendance/weekly', verifyToken, requireAdmin, async (req, res) => {
  const { start, end } = req.query;
  let connection;
  try {
    connection = await getConnection();
    const startDate = start ? `${start} 00:00:00` : new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().slice(0, 19).replace('T', ' ');
    const endDate = end ? `${end} 23:59:59` : new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/:..$/, ':59:59');
    const [rows] = await connection.query(
      'SELECT k.id, u.nama, k.profesi, a.tanggal, a.status AS absent FROM karyawan k JOIN user u ON k.user_id = u.id LEFT JOIN absensi a ON k.id = a.karyawan_id WHERE a.tanggal BETWEEN ? AND ?',
      [startDate, endDate]
    );
    const formattedRows = rows.map(row => ({
      ...row,
      absent: row.absent === 'hadir' // true jika status adalah 'hadir', false jika 'tidak_hadir'
    }));
    connection.release();
    res.json({ success: true, data: formattedRows });
  } catch (err) {
    if (connection) connection.release();
    console.error('Error fetching weekly attendance:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil data absensi mingguan' });
  }
});

// Endpoint POST /logout
app.post("/logout", verifyToken, async (req, res) => {
  const authHeader = req.headers["authorization"];
  const conn = await pool.getConnection();

  const token = authHeader && authHeader.split(" ")[1];
  try {
    await conn.query("INSERT INTO token_blacklist (token) VALUES (?)", [token]);
    res.json({ success: true, message: "✅ Berhasil logout!" });
  } catch (error) {
    console.error("Error POST /logout:", error);
    res.status(500).json({ success: false, message: "Terjadi kesalahan server!" });
  }
});



//  bermaslalh di edit foto untuk admin
// Jalankan server
app.listen(process.env.PORT || 4000, () => {
  console.log("🚀 Server berjalan di http://localhost:" + (process.env.PORT || 4000));
});

