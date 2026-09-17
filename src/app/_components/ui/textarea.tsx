import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "border-ink bg-paper text-ink block w-full border px-3 py-2 transition-colors",
          "dark:border-night-text dark:bg-night dark:text-night-text",
          "min-h-[80px] resize-y",
          error && "border-red-600 dark:border-red-400",
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
