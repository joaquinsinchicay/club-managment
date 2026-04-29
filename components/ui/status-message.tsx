import { cn } from "@/lib/utils";

type StatusMessageProps = {
  tone: "destructive" | "warning" | "success";
  message: string;
};

export function StatusMessage({ tone, message }: StatusMessageProps) {
  return (
    <div
      className={cn(
        "rounded-card border px-4 py-3 text-sm",
        tone === "destructive" && "border-destructive/25 bg-destructive/10 text-foreground",
        tone === "warning" && "border-warning/25 bg-warning/10 text-foreground",
        tone === "success" && "border-success/20 bg-success/10 text-foreground"
      )}
    >
      {message}
    </div>
  );
}
