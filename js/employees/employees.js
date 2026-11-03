import { showToast } from "../utils/toast.js";
import { apiRequest } from "../api/api.js";
import { loadProfile } from "../profile/profile.js";

export async function loadMembers() {
  const token = localStorage.getItem("token");
  if (!token) {
    console.error("Token tidak ditemukan!");
    showToast("❌ Silakan login terlebih dahulu!", "error");
    return;
  }
  try {
    const response = await apiRequest("/api/members", {
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

export function displayMembers(members) {
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
    .map(
      (member) => `
          <tr class="border">
              <td class="p-2">${member.id || "N/A"}</td>
              <td class="p-2">${member.nama || "N/A"}</td>
              <td class="p-2">${member.nip || "N/A"}</td>
              <td class="p-2">${member.profesi || "N/A"}</td>
              <td class="p-2">${member.foto_path ? `<a href="http://127.0.0.1:4000/foto/${member.foto_path}" target="_blank">Lihat</a>` : "N/A"}</td>
              <td class="p-2">${member.kode_qr || "N/A"}</td>
              <td class="p-2">
                  <button data-member-id="${member.id}" class="editButton bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">Edit</button>
                  <button data-member-id="${member.id}" class="deleteButton bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 ml-2">Hapus</button>
              </td>
          </tr>
      `,
    )
    .join("");

  // Tambahkan event listener untuk tombol edit dan hapus
  document.querySelectorAll(".editButton").forEach((button) => {
    button.addEventListener("click", () => {
      const memberId = button.getAttribute("data-member-id");
      console.log("Mengklik tombol edit untuk ID:", memberId);
      editMember(memberId);
    });
  });

  document.querySelectorAll(".deleteButton").forEach((button) => {
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

export async function editMember(id) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Sesi tidak valid. Silakan login kembali.");
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await apiRequest(`/api/members/${id}`);
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
    console.log("editMemberForm:", editMemberForm);
    console.log(
      "editMemberForm tagName:",
      editMemberForm ? editMemberForm.tagName : "Tidak ditemukan",
    );

    if (
      !editMemberForm ||
      !editId ||
      !editNama ||
      !editNip ||
      !editProfesi ||
      !editUsername ||
      !editPassword ||
      !editRole ||
      !editFoto ||
      !photoPreview ||
      !previewImage ||
      !messageDetail ||
      !cancelEditBtn
    ) {
      console.error("Salah satu elemen formulir edit tidak ditemukan!");
      alert("Formulir edit tidak ditemukan, periksa HTML!");
      return;
    }

    if (editMemberForm.tagName !== "FORM") {
      console.error(
        "editMemberForm bukan elemen <form>! Tag ditemukan:",
        editMemberForm.tagName,
      );
      alert("Kesalahan konfigurasi: editMemberForm bukan formulir HTML!");
      return;
    }

    editId.value = member.id;
    editNama.value = member.nama;
    editNip.value = member.nip;
    editProfesi.value = member.profesi || "";
    editUsername.value = member.username;
    editRole.value = member.role;
    editPassword.value = "";

    function updateProfesiBasedOnRole() {
      if (editRole.value === "admin") {
        editProfesi.value = "admin";
        editProfesi.disabled = true;
      } else {
        editProfesi.value = member.profesi || "";
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
    cancelEditBtn.addEventListener("click", () => {
      editMemberForm.classList.add("hidden");
      editMemberForm.reset();
      messageDetail.innerText = "";
      photoPreview.classList.add("hidden");
      console.log("Edit dibatalkan, formulir disembunyikan.");
    });

    // Event listener untuk submit formulir
    editMemberForm.onsubmit = async (e) => {
      e.preventDefault();
      messageDetail.innerText = "";

      if (
        !editNama.value ||
        !editNip.value ||
        !editUsername.value ||
        !editRole.value
      ) {
        messageDetail.innerText = "⚠ Harap isi semua kolom yang diperlukan!";
        messageDetail.style.color = "orange";
        return;
      }

      if (
        editRole.value === "karyawan" &&
        (!editProfesi.value || editProfesi.value.trim() === "")
      ) {
        messageDetail.innerText = "⚠ Profesi wajib diisi untuk karyawan!";
        messageDetail.style.color = "orange";
        return;
      }

      if (editRole.value !== "admin" && editRole.value !== "karyawan") {
        messageDetail.innerText =
          "⚠ Role tidak valid. Pilih 'admin' atau 'karyawan'.";
        messageDetail.style.color = "orange";
        return;
      }

      if (
        editRole.value === "karyawan" &&
        !editFoto.files[0] &&
        !member.foto_path
      ) {
        messageDetail.innerText = "⚠ Harap unggah foto untuk karyawan!";
        messageDetail.style.color = "orange";
        return;
      }

      const formData = new FormData();
      formData.append("id", editId.value);
      formData.append("nama", editNama.value);
      formData.append("nip", editNip.value);
      formData.append("profesi", editProfesi.value);
      formData.append("username", editUsername.value);
      if (editPassword.value) formData.append("password", editPassword.value);
      formData.append("role", editRole.value);
      if (editFoto.files[0]) formData.append("foto", editFoto.files[0]);

      console.log("Mengirim data edit untuk ID:", id, {
        id: editId.value,
        nama: editNama.value,
        nip: editNip.value,
        profesi: editProfesi.value,
        username: editUsername.value,
        role: editRole.value,
        foto: editFoto.files[0]
          ? editFoto.files[0].name
          : "Tidak ada foto baru",
      });

      try {
        const response = await apiRequest(`/api/members/${id}`, {
          method: "PUT",
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
          if (
            window.currentProfileData &&
            window.currentProfileData.id === id
          ) {
            console.log("Memperbarui profil pengguna saat ini...");
            await loadProfile();
          }
        }
      } catch (error) {
        console.error("Error:", error);
        messageDetail.innerText = "⚠ Gagal memperbarui data!";
        messageDetail.style.color = "red";
      }
    };
  } catch (error) {
    console.error("Error:", error);
    alert("Gagal memuat data karyawan");
  }
}

export async function deleteMember(id) {
  if (
    !confirm(
      "Apakah Anda yakin ingin menghapus karyawan ini? Aksi ini tidak dapat dibatalkan!",
    )
  ) {
    return;
  }

  try {
    const response = await apiRequest(`/api/members/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Gagal menghapus karyawan");
    }

    showToast("✅ Karyawan berhasil dihapus!", "success");
    await loadMembers();
  } catch (err) {
    console.error("Error deleting member:", err);
    showToast(`❌ ${err.message}`, "error");
  }
}
