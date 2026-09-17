import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        className={cn(
          // Eckig statt abgerundet; das Haekchen traegt Tinte statt Orange,
          // weil Orange auf hellem Grund den Kontrast nicht erreicht.
          "border-ink accent-ink h-4 w-4 border",
          "dark:border-night-text dark:accent-night-text",
          error && "border-red-600 dark:border-red-400",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
