// Appliqué avant le rendu pour éviter le flash blanc (fichier externe : compatible avec la CSP).
(function () {
  try {
    var saved = localStorage.getItem("dembele-theme");
    var dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
