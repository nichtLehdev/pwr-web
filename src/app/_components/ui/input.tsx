import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Eckig, Haarlinie in Tinte, kein Schatten. Kein `focus:outline-none`:
          // Dieser Baustein steht auch ausserhalb von `.programm`, wo der
          // globale 3px-Ring nicht greift — dort bleibt sonst gar keine
          // Fokusmarkierung uebrig.
          "border-ink bg-paper text-ink block w-full border px-3 py-2 transition-colors",
          "dark:border-night-text dark:bg-night dark:text-night-text",
          error && "border-red-600 dark:border-red-400",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
