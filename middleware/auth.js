const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Token tidak ditemukan." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // simpan data user di req
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Token tidak valid." });
  }
}

function onlyAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Akses hanya untuk admin." });
  }
  next();
}

module.exports = { verifyToken, onlyAdmin };
