import { apiRequest } from "../api/api.js";

async function fetchAttendanceData(
  profesi = "",
  date = new Date().toISOString().split("T")[0],
) {
  try {
    const params = new URLSearchParams({ profesi, date });
    const response = await apiRequest(`/api/attendance?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return data.success ? data.data : [];
  } catch (err) {
    console.error("Gagal mengambil data absensi:", err);
    return [];
  }
}

export async function generateDailyReport() {
  const profesi = document.getElementById("filterProfesi").value;
  const attendanceData = await fetchAttendanceData(profesi);

  const today = new Date().toLocaleDateString("id-ID", {
    dateStyle: "full",
  });

  const reportDiv = document.getElementById("dailyReport");

  if (attendanceData.length === 0) {
    reportDiv.textContent = `Tidak ada data absensi untuk ${today}.`;
    return;
  }

  const report = attendanceData
    .map(
      (member) =>
        `<p>${member.nama} (${member.profesi}) - ${
          member.absent ? "Sudah Absen" : "Belum Absen"
        }</p>`,
    )
    .join("");

  reportDiv.innerHTML = `<h4>Status Absensi ${today}</h4>${report}`;
}
