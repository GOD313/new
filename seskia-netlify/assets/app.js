const DOWNLOAD_URL = "https://seskia.online/download.php";
const shell = document.querySelector(".site-shell");
const themeButtons = [...document.querySelectorAll("[data-select-theme]")];
const preferredTheme = new URLSearchParams(window.location.search).get("theme");
const downloadButton = document.querySelector(".download-button");

downloadButton.href = DOWNLOAD_URL;

function setTheme(theme) {
  if (!["violet", "night", "sunset"].includes(theme)) return;
  shell.dataset.theme = theme;
  themeButtons.forEach((button) => {
    const active = button.dataset.selectTheme === theme;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const url = new URL(window.location.href);
  url.searchParams.set("theme", theme);
  window.history.replaceState({}, "", url);
}

if (preferredTheme) setTheme(preferredTheme);
themeButtons.forEach((button) => button.addEventListener("click", () => setTheme(button.dataset.selectTheme)));

downloadButton.addEventListener("click", () => {
  const label = downloadButton.querySelector("b");
  downloadButton.classList.add("downloading");
  label.textContent = "در حال انتقال...";
  window.setTimeout(() => {
    downloadButton.classList.remove("downloading");
    label.textContent = "دانلود مستقیم اپلیکیشن";
  }, 2400);
});

document.querySelector("#copy-link").addEventListener("click", async (event) => {
  const label = event.currentTarget.querySelector(".copy-label");
  try {
    await navigator.clipboard.writeText(DOWNLOAD_URL);
    label.textContent = "لینک کپی شد";
  } catch {
    label.textContent = DOWNLOAD_URL;
  }
  window.setTimeout(() => (label.textContent = "کپی لینک دانلود"), 1800);
});
