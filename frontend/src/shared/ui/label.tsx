import { forwardRef, type LabelHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-medium text-foreground/90", className)}
      {...props}
    />
  ),
);
Label.displayName = "Label";
