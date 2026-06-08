import { OpenAIKeyModal } from "@/components/OpenAIKeyModal";
import { Button } from "@/components/ui/button";
import {
  useIsOddsApiConfigured,
  useIsOpenAIConfigured,
} from "@/hooks/useBackend";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Activity, BookOpen, Settings, TrendingUp } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function Layout({ children, className }: LayoutProps) {
  const { data: isOpenAiConfigured } = useIsOpenAIConfigured();
  const { data: isOddsConfigured } = useIsOddsApiConfigured();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 bg-card border-b border-border/60 shadow-[0_1px_0_0_oklch(0.25_0_0)]">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            data-ocid="nav.home_link"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 group-hover:border-primary/60 transition-colors">
              <TrendingUp className="w-4 h-4 text-primary" />
              <Activity className="w-2.5 h-2.5 text-primary absolute -bottom-0.5 -right-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-base font-bold text-foreground tracking-tight leading-none">
                Edge<span className="text-primary">Stack</span>
              </span>
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground leading-none mt-0.5">
                Sports Intelligence
              </span>
            </div>
          </Link>

          {/* Center — terminal tag */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted/60 border border-border/40">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Live Analysis
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Status indicators */}
            <div className="hidden sm:flex items-center gap-1.5">
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-widest border",
                  isOddsConfigured
                    ? "border-primary/30 text-primary bg-primary/5"
                    : "border-destructive/30 text-destructive/70 bg-destructive/5",
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isOddsConfigured ? "bg-primary" : "bg-destructive/70",
                  )}
                />
                {isOddsConfigured ? "Odds Live" : "No Odds Key"}
              </div>
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-widest border",
                  isOpenAiConfigured
                    ? "border-primary/30 text-primary bg-primary/5"
                    : "border-border/40 text-muted-foreground bg-transparent",
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isOpenAiConfigured ? "bg-primary" : "bg-muted-foreground",
                  )}
                />
                {isOpenAiConfigured ? "AI Active" : "AI Off"}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 font-mono text-[10px] uppercase tracking-widest"
              asChild
              data-ocid="nav.history_button"
            >
              <Link to="/history">
                <BookOpen className="w-3.5 h-3.5" />
                History
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              asChild
              data-ocid="nav.settings_button"
            >
              <Link to="/settings" aria-label="Settings">
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn("flex-1", className)}>{children}</main>

      {/* Footer */}
      <footer className="bg-card border-t border-border/40 mt-auto">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-[11px] font-mono text-muted-foreground">
            © {new Date().getFullYear()} EdgeStack. For research purposes only.
          </span>
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
