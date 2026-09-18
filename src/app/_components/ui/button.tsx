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
    // Eckig, ohne Schatten, kein `focus:outline-none` — der Knopf steht auch
    // ausserhalb von `.programm`, wo der globale 3px-Ring nicht greift.
    const baseStyles =
      "semi-condensed inline-flex items-center justify-center font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50";

    // Hauptaktion in Tinte: Orange ist im Heft eine Markierfläche, und weiss
    // auf Orange verfehlt den Kontrast.
    const variants = {
      primary:
        "bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted",
      secondary:
        "bg-rule/60 text-ink hover:bg-rule dark:bg-night-rule dark:text-night-text dark:hover:bg-night-muted dark:hover:text-night",
      danger: "bg-red-700 text-paper hover:bg-red-800",
      success: "bg-green-700 text-paper hover:bg-green-800",
      ghost:
        "text-ink hover:bg-rule/60 dark:text-night-text dark:hover:bg-night-rule",
      outline:
        "border-ink text-ink hover:bg-ink hover:text-paper dark:border-night-text dark:text-night-text dark:hover:bg-night-text dark:hover:text-night border-2 bg-transparent",
      link: "text-primary-ink dark:text-primary underline-offset-4 hover:underline bg-transparent",
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
