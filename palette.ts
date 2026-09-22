import { useTheme } from "@/contexts/ThemeContext";

const LIGHT = { series: ["#1F2A6B", "#B3261E", "#1B6B3E", "#8A5A00"], text: "#4A5070", grid: "#D6DAEA", axis: "#12152B" };
const DARK = { series: ["#9DB0FF", "#FF8A80", "#81D6A5", "#F2B705"], text: "#A9B0D0", grid: "#2A3160", axis: "#EEF0FA" };

/** Les graphiques (SVG) n'héritent pas toujours des variables CSS : on leur passe des couleurs explicites. */
export function usePalette() {
  const { theme } = useTheme();
  return theme === "dark" ? DARK : LIGHT;
}
