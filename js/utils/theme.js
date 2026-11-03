const themeToggle = document.getElementById("themeToggle");
const sunIcon = document.getElementById("sunIcon");
const moonIcon = document.getElementById("moonIcon");

export function updateThemeIcons(isDark) {
  if (isDark) {
    sunIcon.classList.remove("hidden");
    moonIcon.classList.add("hidden");
  } else {
    sunIcon.classList.add("hidden");
    moonIcon.classList.remove("hidden");
  }
}

const currentTheme = document.documentElement.classList.contains("dark");
updateThemeIcons(currentTheme);

themeToggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");

  const isDark = document.documentElement.classList.contains("dark");
  updateThemeIcons(isDark);
});
