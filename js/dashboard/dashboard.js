import { showToast } from "../utils/toast.js";
import { apiRequest } from "../api/api.js";

let profesiChartInstance = null;
let attendanceChartInstance = null;
export async function loadDashboard() {
  if (!localStorage.getItem("token")) {
    console.error("Token tidak ditemukan!");
    showToast("❌ Token tidak ditemukan!", "error");
    return;
  }

  try {
    const sectionDashboard = document.getElementById("sectionDashboard");
    if (!sectionDashboard) {
      console.error("Section Dashboard tidak ditemukan!");
      return;
    }

    // Ambil container yang tepat untuk setiap chart
    const profesiCanvasLama = document.getElementById("profesiChart");
    const attendanceCanvasLama = document.getElementById("attendanceChart");

    const profesiContainer = profesiCanvasLama?.parentElement;
    const attendanceContainer = attendanceCanvasLama?.parentElement;

    if (!profesiContainer || !attendanceContainer) {
      throw new Error("Container grafik dashboard tidak ditemukan.");
    }
    // Bersihkan canvas yang ada
    // const existingCanvas = sectionDashboard.querySelectorAll("canvas");
    // existingCanvas.forEach((canvas) => canvas.remove());

    // Buat canvas baru dan masukkan ke container yang tepat

    const profesiCanvas = document.createElement("canvas");
    profesiCanvas.id = "profesiChart";
    profesiCanvas.className = "w-full";
    profesiContainer.replaceChildren(profesiCanvas);

    const attendanceCanvas = document.createElement("canvas");
    attendanceCanvas.id = "attendanceChart";
    attendanceCanvas.className = "w-full";
    attendanceContainer.replaceChildren(attendanceCanvas);

    // Ambil total karyawan (kecuali admin)
    let totalEmployees = 0;
    try {
      //   const responseMembers = await fetch("http://localhost:4000/api/members", {
      //     headers: { Authorization: `Bearer ${token}` },
      //   });
      const responseMembers = await apiRequest("/api/members");
      if (!responseMembers.ok) {
        throw new Error(
          `Gagal mengambil data karyawan: ${responseMembers.statusText}`,
        );
      }
      const membersData = await responseMembers.json();
      if (membersData.success) {
        totalEmployees = membersData.data.filter(
          (member) => member.role !== "admin",
        ).length;
        document.getElementById("totalEmployees").textContent = totalEmployees;
      }
    } catch (err) {
      console.warn("Gagal mengambil total karyawan:", err.message);
      showToast(`⚠️ ${err.message}`, "warning");
      document.getElementById("totalEmployees").textContent = "0"; // Default jika gagal
    }

    let profesiData = { success: false, data: [] };
    try {
      //   const responseProfesi = await fetch(
      //     "http://localhost:4000/api/members/profesi",
      //     {
      //       headers: { Authorization: `Bearer ${token}` },
      //     },
      //   );

      const responseProfesi = await apiRequest("/api/members/profesi");

      console.log("Full response:", await responseProfesi.clone().text());
      console.log("Profesi response status:", responseProfesi.status); // Debug status
      if (!responseProfesi.ok) {
        throw new Error(
          `Gagal mengambil data profesi: ${responseProfesi.status} - ${responseProfesi.statusText}`,
        );
      }
      profesiData = await responseProfesi.json();
      console.log("Profesi data received:", profesiData);
    } catch (err) {
      console.warn("Gagal mengambil data profesi:", err.message);
      showToast(`⚠️ ${err.message}`, "warning");
    }

    if (profesiData.success) {
      const labels = profesiData.data.map((item) => item.profesi);
      const counts = profesiData.data.map((item) => item.count);

      console.log("Creating profesi chart with data:", { labels, counts });
      console.log("Canvas element:", profesiCanvas);

      // Modern gradient colors for profesi chart
      const gradientColors = [
        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
        "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
        "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
        "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
        "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
      ];

      const backgroundColors = counts.map((_, index) => {
        const colorIndex = index % gradientColors.length;
        return [
          "rgba(102, 126, 234, 0.8)",
          "rgba(240, 147, 251, 0.8)",
          "rgba(79, 172, 254, 0.8)",
          "rgba(67, 233, 123, 0.8)",
          "rgba(250, 112, 154, 0.8)",
          "rgba(168, 237, 234, 0.8)",
          "rgba(255, 236, 210, 0.8)",
          "rgba(255, 154, 158, 0.8)",
        ][colorIndex];
      });

      const borderColors = counts.map((_, index) => {
        const colorIndex = index % gradientColors.length;
        return [
          "rgba(102, 126, 234, 1)",
          "rgba(240, 147, 251, 1)",
          "rgba(79, 172, 254, 1)",
          "rgba(67, 233, 123, 1)",
          "rgba(250, 112, 154, 1)",
          "rgba(168, 237, 234, 1)",
          "rgba(255, 236, 210, 1)",
          "rgba(255, 154, 158, 1)",
        ][colorIndex];
      });
      if (profesiChartInstance) {
        profesiChartInstance.destroy();
      }

      profesiChartInstance = new Chart(profesiCanvas, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Jumlah Anggota",
              data: counts,
              backgroundColor: backgroundColors,
              borderColor: borderColors,
              borderWidth: 2,
              borderRadius: 8,
              borderSkipped: false,
              hoverBackgroundColor: backgroundColors.map((color) =>
                color.replace("0.8", "0.9"),
              ),
              hoverBorderColor: borderColors,
              hoverBorderWidth: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              titleColor: "#fff",
              bodyColor: "#fff",
              borderColor: "rgba(255, 255, 255, 0.1)",
              borderWidth: 1,
              cornerRadius: 12,
              displayColors: false,
              titleFont: {
                size: 14,
                weight: "bold",
              },
              bodyFont: {
                size: 13,
              },
              padding: 12,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(0, 0, 0, 0.05)",
                drawBorder: false,
              },
              ticks: {
                color: "#64748b",
                font: {
                  size: 12,
                  weight: "500",
                },
              },
            },
            x: {
              grid: {
                display: false,
              },
              ticks: {
                color: "#64748b",
                font: {
                  size: 12,
                  weight: "500",
                },
                maxRotation: 45,
              },
            },
          },
          animation: {
            duration: 2000,
            easing: "easeInOutQuart",
          },
        },
      });
    }

    // const responseAttendance = await fetch(
    //   `http://127.0.0.1:4000/api/attendance?date=${new Date().toISOString().split("T")[0]}`,
    //   {
    //     headers: { Authorization: `Bearer ${token}` },
    //   },
    // );

    const today = new Date().toISOString().split("T")[0];

    const responseAttendance = await apiRequest(
      `/api/attendance?date=${today}`,
    );

    console.log("Attendance API response status:", responseAttendance.status);
    if (!responseAttendance.ok) {
      throw new Error(
        `Gagal mengambil data absensi: ${responseAttendance.status} - ${responseAttendance.statusText}`,
      );
    }
    const attendanceData = await responseAttendance.json();
    console.log("Attendance data received:", attendanceData);

    if (attendanceData.success) {
      const present = attendanceData.data.filter(
        (item) => item.status === "hadir",
      ).length;
      const absent = totalEmployees - present; // Asumsi totalEmployees sudah dihitung sebelumnya

      document.getElementById("presentToday").textContent = present;
      document.getElementById("absentToday").textContent =
        absent > 0 ? absent : 0;

      console.log("Creating attendance chart with data:", {
        present,
        absent,
        totalEmployees,
      });

      console.log("Canvas element:", attendanceCanvas);

      if (attendanceChartInstance) {
        attendanceChartInstance.destroy();
      }

      attendanceChartInstance = new Chart(attendanceCanvas, {
        type: "doughnut",
        data: {
          labels: ["Hadir", "Tidak Hadir"],
          datasets: [
            {
              data: [present, absent],
              backgroundColor: [
                "rgba(34, 197, 94, 0.9)", // Green for present
                "rgba(239, 68, 68, 0.9)", // Red for absent
              ],
              borderColor: ["rgba(34, 197, 94, 1)", "rgba(239, 68, 68, 1)"],
              borderWidth: 3,
              hoverBackgroundColor: [
                "rgba(34, 197, 94, 1)",
                "rgba(239, 68, 68, 1)",
              ],
              hoverBorderColor: "#fff",
              hoverBorderWidth: 4,
              cutout: "60%",
              spacing: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                padding: 20,
                font: {
                  size: 14,
                  weight: "600",
                },
                color: "#374151",
                usePointStyle: true,
                pointStyle: "circle",
              },
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              titleColor: "#fff",
              bodyColor: "#fff",
              borderColor: "rgba(255, 255, 255, 0.1)",
              borderWidth: 1,
              cornerRadius: 12,
              displayColors: false,
              titleFont: {
                size: 14,
                weight: "bold",
              },
              bodyFont: {
                size: 13,
              },
              padding: 12,
              callbacks: {
                label: function (context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((context.parsed / total) * 100).toFixed(
                    1,
                  );
                  return `${context.label}: ${context.parsed} (${percentage}%)`;
                },
              },
            },
          },
          animation: {
            duration: 2000,
            easing: "easeInOutQuart",
          },
        },
      });
    }
  } catch (err) {
    console.error("Gagal load dashboard:", err);
    showToast(`❌ ${err.message}`, "error");
  }
}
