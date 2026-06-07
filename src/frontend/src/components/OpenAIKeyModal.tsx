import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsOpenAIConfigured, useSetOpenAIApiKey } from "@/hooks/useBackend";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface OpenAIKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenAIKeyModal({ open, onOpenChange }: OpenAIKeyModalProps) {
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const { data: isConfigured, isLoading } = useIsOpenAIConfigured();
  const { mutate: setApiKey, isPending } = useSetOpenAIApiKey();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setApiKey(key.trim(), {
      onSuccess: () => {
        toast.success("OpenAI API key saved", {
          description: "AI analysis is now enabled for all games.",
        });
        setKey("");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error("Failed to save key", { description: err.message });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-card border-border max-w-md"
        data-ocid="openai-key.dialog"
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <KeyRound className="w-4 h-4 text-primary" />
            </div>
            <DialogTitle className="font-display text-foreground tracking-tight">
              OpenAI Configuration
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground font-body text-sm">
            Enter your OpenAI API key to enable AI-powered analysis, confidence
            reports, and plain-language betting insights.
          </DialogDescription>
        </DialogHeader>

        {/* Status */}
        {!isLoading && (
          <div
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-body",
              isConfigured
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-accent/30 bg-accent/5 text-accent",
            )}
          >
            {isConfigured ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>
              {isConfigured
                ? "API key is configured — AI analysis active"
                : "No API key configured — AI analysis disabled"}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="api-key-input"
              className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
            >
              {isConfigured ? "Update API Key" : "API Key"}
            </Label>
            <div className="relative">
              <Input
                id="api-key-input"
                type={showKey ? "text" : "password"}
                placeholder="sk-proj-..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="bg-background border-input font-mono text-sm pr-10"
                autoComplete="off"
                spellCheck={false}
                data-ocid="openai-key.input"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showKey ? "Hide key" : "Show key"}
                data-ocid="openai-key.toggle"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground font-body">
              Your key is stored securely in the canister and never exposed to
              clients.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 font-mono text-xs"
              onClick={() => onOpenChange(false)}
              data-ocid="openai-key.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 font-mono text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!key.trim() || isPending}
              data-ocid="openai-key.submit_button"
            >
              {isPending ? "Saving..." : "Save Key"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
