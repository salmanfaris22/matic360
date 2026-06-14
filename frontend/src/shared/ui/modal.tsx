import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/shared/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "sheet" slides up from the bottom (mobile); "center" is a dialog. */
  variant?: "center" | "sheet";
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl" };

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "center",
  size = "md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden bg-card shadow-xl",
          sizes[size],
          variant === "sheet"
            ? "rounded-t-2xl sm:rounded-2xl"
            : "rounded-2xl",
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-border p-5">
            <div>
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border p-4">{footer}</div>}
      </div>
    </div>
  );
}
