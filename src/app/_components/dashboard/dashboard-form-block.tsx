import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardFormBlock({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="border-primary/35 dark:border-primary/45 border-l-2 py-0.5 pl-4">
        <h3 className="text-dark dark:text-dark-text text-base font-semibold">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
