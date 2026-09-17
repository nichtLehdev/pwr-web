import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "outline";
  size?: "sm" | "md" | "lg";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    // Rechteckig und gefuellt wie die `Tag`-Komponente des Hefts, nicht als
    // runde Pille. Die Toene sind auf Kontrast korrigiert: Weiss auf Orange
    // (1,99:1) und Weiss auf Gelb fielen beide durch — dort steht jetzt Tinte.
    const baseStyles =
      "semi-condensed inline-flex items-center font-semibold leading-none";

    const variants = {
      default: "bg-rule/60 text-ink dark:bg-night-rule dark:text-night-text",
      primary: "bg-primary text-ink",
      secondary: "bg-ink text-paper dark:bg-night-text dark:text-night",
      success: "bg-green-700 text-paper dark:bg-green-400 dark:text-night",
      danger: "bg-red-700 text-paper dark:bg-red-400 dark:text-night",
      warning: "bg-yellow-400 text-ink",
      outline:
        "border-ink text-ink dark:border-night-text dark:text-night-text border-2 bg-transparent",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-2.5 py-0.5 text-sm",
      lg: "px-3 py-1 text-base",
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  },
);

Badge.displayName = "Badge";

export { Badge };
