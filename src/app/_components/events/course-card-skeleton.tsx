/** Lade-Platzhalter für `CourseCard`. */
export default function CourseCardSkeleton() {
  return (
    <div
      aria-hidden
      className="border-rule dark:border-night-rule flex animate-pulse items-start gap-4 border-b px-1 py-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="bg-rule dark:bg-night-rule h-6 w-4/5" />
        <div className="bg-rule dark:bg-night-rule h-3 w-1/3" />
        <div className="bg-rule dark:bg-night-rule h-3 w-1/2" />
      </div>
    </div>
  );
}
