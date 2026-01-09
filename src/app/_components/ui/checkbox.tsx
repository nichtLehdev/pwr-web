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
          "text-primary focus:ring-primary h-4 w-4 rounded border-gray-300 focus:ring-2",
          "dark:border-dark-border",
          error && "border-red-500 focus:ring-red-500",
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
