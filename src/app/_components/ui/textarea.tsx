import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm transition-colors",
          "focus:border-primary focus:ring-primary focus:ring-1 focus:outline-none",
          "dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text",
          "resize-y min-h-[80px]",
          error &&
            "border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
