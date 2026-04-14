import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Notenwaage",
  description:
    "Notenwerte ausgleichen: links vorgegeben, rechts auffüllen bis die Waage im Gleichgewicht ist.",
};

export default function NotenwaageLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-background dark:bg-dark-background flex min-h-0 flex-1 flex-col overflow-y-auto">
      {children}
    </div>
  );
}
