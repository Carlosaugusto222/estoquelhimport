import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      className={
        "relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground " +
        className
      }
    >
      <Sun
        className={
          "h-[18px] w-[18px] transition-all duration-500 " +
          (isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100")
        }
      />
      <Moon
        className={
          "absolute h-[18px] w-[18px] transition-all duration-500 " +
          (isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0")
        }
      />
    </Button>
  );
}