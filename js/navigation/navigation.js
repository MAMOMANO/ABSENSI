const tabs = [
  "tabAbsensi",
  "tabDaftar",
  "tabDashboard",
  "tabLaporan",
  "tabDetailAnggota",
  "tabPengajuan",
  "tabManajemen",
  "btnProfile",
  "btnLogout",
];

const sections = [
  "sectionAbsensi",
  "sectionDaftar",
  "sectionDashboard",
  "sectionLaporan",
  "sectionDetailAnggota",
  "sectionPengajuan",
  "sectionManajemen",
  "sectionProfil",
];

const activeClasses = [
  "bg-gradient-to-r",
  "from-blue-500",
  "to-purple-600",
  "text-white",
  "shadow-lg",
];

export function showOnlySection(activeTab, activeSection) {
  console.log(
    "Mengaktifkan tab:",
    activeTab?.id,
    "dan section:",
    activeSection?.id,
  );

  tabs.forEach((id) => {
    const tab = document.getElementById(id);
    if (!tab) return;

    tab.classList.remove(...activeClasses);
    tab.classList.add(
      "text-gray-700",
      "dark:text-gray-300",
      "hover:bg-white",
      "hover:bg-opacity-20",
    );
  });

  sections.forEach((id) => {
    document.getElementById(id)?.classList.add("hidden");
  });

  if (!activeTab || !activeSection) {
    console.error("Tab atau section tidak valid:", activeTab, activeSection);
    return;
  }

  activeTab.classList.remove(
    "text-gray-700",
    "dark:text-gray-300",
    "hover:bg-white",
    "hover:bg-opacity-20",
  );
  activeTab.classList.add(...activeClasses);

  activeSection.classList.remove("hidden");
  activeSection.classList.add("animate-fade-in");

  setTimeout(() => {
    activeSection.classList.remove("animate-fade-in");
  }, 500);
}

export function setupTabListeners({
  role,
  loadDashboard,
  generateDailyReport,
  loadMembers,
  loadPengajuan,
  logout,
}) {
  const onClick = (tabId, sectionId, allowedRole, callback) => {
    const tab = document.getElementById(tabId);
    const section = document.getElementById(sectionId);

    if (!tab || !section) return;

    tab.addEventListener("click", () => {
      if (allowedRole && role !== allowedRole) return;

      showOnlySection(tab, section);

      if (typeof callback === "function") {
        callback();
      }
    });
  };

  onClick("tabAbsensi", "sectionAbsensi", "karyawan");
  onClick("tabDaftar", "sectionDaftar", "admin");
  onClick("tabDashboard", "sectionDashboard", "admin", loadDashboard);
  onClick("tabLaporan", "sectionLaporan", "admin", generateDailyReport);
  onClick("tabDetailAnggota", "sectionDetailAnggota", "admin", loadMembers);
  onClick("tabPengajuan", "sectionPengajuan", "karyawan");
  onClick("tabManajemen", "sectionManajemen", "admin", loadPengajuan);
  onClick("btnProfile", "sectionProfil", null);

  const btnLogout = document.getElementById("btnLogout");

  if (btnLogout && typeof logout === "function") {
    btnLogout.addEventListener("click", logout);
  }
}
