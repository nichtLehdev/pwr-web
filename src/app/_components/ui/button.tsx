import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "success"
    | "ghost"
    | "outline"
    | "link";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      primary:
        "bg-primary text-white hover:bg-primary-dark dark:bg-primary-light dark:hover:bg-primary shadow-lg",
      secondary:
        "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-dark-background-secondary dark:text-dark-text dark:hover:bg-dark-border",
      danger: "bg-red-600 text-white hover:bg-red-700 shadow",
      success: "bg-green-600 text-white hover:bg-green-700 shadow",
      ghost:
        "text-gray-700 hover:bg-gray-100 dark:text-dark-text dark:hover:bg-dark-background-secondary",
      outline:
        "border-2 border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-background-secondary",
      link: "text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary underline-offset-4 hover:underline bg-transparent shadow-none",
    };

    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 py-2.5",
      lg: "h-12 px-6 text-lg",
      icon: "h-10 w-10 p-0",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {size !== "icon" && "Wird geladen..."}
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
