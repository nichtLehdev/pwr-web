import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "semi-condensed text-ink dark:text-night-text mb-1 block text-sm font-semibold",
          className,
        )}
        {...props}
      >
        {children}
        {required && (
          <span
            className="ml-1 text-red-600 dark:text-red-400"
            aria-label="required"
          >
            *
          </span>
        )}
      </label>
    );
  },
);

Label.displayName = "Label";

export { Label };
