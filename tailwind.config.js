/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",           // Memindai semua file HTML di root (dashboard.html, index.html, login.html)
    "./src/**/*.{html,js}", // Memindai file di folder src (saat ini hanya input.css, tapi bisa ditambahkan JS di masa depan)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}