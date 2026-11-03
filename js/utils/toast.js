export function showToast(message, type = "success") {
  const toast = document.createElement("div");
  const icons = {
    success:
      '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
    error:
      '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"></path></svg>',
    warning:
      '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"></path></svg>',
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
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    });
  }
}
