export default function CourseCardSkeleton() {
  return (
    <article className="dark:bg-dark-surface dark:shadow-dark-border flex animate-pulse gap-3 rounded-lg bg-white p-4 shadow-md transition-shadow hover:shadow-lg">
      {/* Date Range Badge Skeleton (wider for multi-day) */}
      <div className="dark:bg-dark-background-secondary h-12 min-w-20 shrink-0 rounded-lg bg-gray-200"></div>

      {/* Content Skeleton */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Category Badge */}
        <div className="bg-primary/20 mb-2 h-5 w-24 rounded"></div>

        {/* Title */}
        <div className="dark:bg-dark-background-secondary mb-2 h-4 w-4/5 rounded bg-gray-200"></div>

        {/* Location */}
        <div className="mb-2 flex items-center gap-2">
          <div className="dark:bg-dark-background-secondary h-4 w-4 rounded bg-gray-200"></div>
          <div className="dark:bg-dark-background-secondary h-3 w-28 rounded bg-gray-200"></div>
        </div>

        {/* Spots Available Badge */}
        <div className="mb-3 flex items-center gap-2">
          <div className="bg-primary/20 h-4 w-4 rounded"></div>
          <div className="bg-primary/20 h-3 w-32 rounded"></div>
        </div>

        {/* Link */}
        <div className="bg-primary/20 mt-auto h-8 w-32 rounded"></div>
      </div>
    </article>
  );
}
