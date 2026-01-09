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
    const baseStyles = "inline-flex items-center rounded-full font-medium";

    const variants = {
      default:
        "bg-gray-100 text-gray-800 dark:bg-dark-background-secondary dark:text-dark-text",
      primary: "bg-primary text-white dark:bg-primary-light",
      secondary: "bg-gray-600 text-white dark:bg-gray-500",
      success: "bg-green-600 text-white dark:bg-green-500",
      danger: "bg-red-600 text-white dark:bg-red-500",
      warning: "bg-yellow-500 text-white dark:bg-yellow-400",
      outline:
        "border-2 border-gray-300 bg-transparent text-gray-700 dark:border-dark-border dark:text-dark-text",
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
