"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import DashboardCourseCard from "./dashboard-course-card";
import type { ContentStatus } from "~/generated/prisma/enums";

interface DashboardCoursesListProps {
  userRole: string;
}

const statusFilters: { value: ContentStatus | "all"; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "DRAFT", label: "Entwürfe" },
  { value: "PENDING", label: "Zur Prüfung" },
  { value: "APPROVED", label: "Veröffentlicht" },
  { value: "REJECTED", label: "Abgelehnt" },
  { value: "ARCHIVED", label: "Archiviert" },
];

const sortOptions: {
  value: "startDate" | "title" | "createdAt" | "status";
  label: string;
}[] = [
  { value: "startDate", label: "Startdatum" },
  { value: "title", label: "Titel" },
  { value: "createdAt", label: "Erstellt am" },
  { value: "status", label: "Status" },
];

export default function DashboardCoursesList({
  userRole,
}: DashboardCoursesListProps) {
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">(
    "all",
  );
  const [sortBy, setSortBy] = useState<
    "startDate" | "title" | "createdAt" | "status"
  >("startDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const limit = 12;

  const { data, isLoading, error } = api.courses.getDashboardCourses.useQuery({
    page,
    limit,
    status: statusFilter === "all" ? undefined : statusFilter,
    sortBy,
    sortOrder,
  });

  // Filter status options based on role
  const availableFilters = statusFilters.filter((filter) => {
    // Admin and LPW can see all statuses
    if (userRole === "ADMIN" || userRole === "LPW") return true;

    // RPW can see all except DRAFT
    if (userRole === "RPW") {
      return filter.value !== "DRAFT";
    }

    // Others can see all (their own courses)
    return true;
  });

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
        <p className="text-sm text-red-800 dark:text-red-300">
          Fehler beim Laden der Kurse: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-dark dark:text-dark-text">
            Kurse
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data?.total ?? 0} {data?.total === 1 ? "Kurs" : "Kurse"} gefunden
          </p>
        </div>

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:bg-gray-700 sm:hidden"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filter & Sortierung
          {(statusFilter !== "all" || sortBy !== "startDate") && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
              {(statusFilter !== "all" ? 1 : 0) +
                (sortBy !== "startDate" ? 1 : 0)}
            </span>
          )}
        </button>

        {/* Desktop Filters - Always visible */}
        <div className="hidden sm:flex sm:items-center sm:gap-4">
          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            {availableFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setStatusFilter(filter.value);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === filter.value
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-dark hover:bg-gray-200 dark:bg-dark-background-secondary dark:text-dark-text dark:hover:bg-gray-700"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2 border-l border-gray-200 pl-4 dark:border-dark-border">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(
                  e.target.value as "startDate" | "title" | "createdAt" | "status",
                );
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={toggleSortOrder}
              className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-700 transition-colors hover:bg-gray-50 dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:hover:bg-gray-700"
              title={sortOrder === "asc" ? "Aufsteigend" : "Absteigend"}
            >
              {sortOrder === "asc" ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Filters Panel */}
      {filtersOpen && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-dark-border dark:bg-dark-surface sm:hidden">
          {/* Status Filter */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {availableFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => {
                    setStatusFilter(filter.value);
                    setPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    statusFilter === filter.value
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-dark hover:bg-gray-200 dark:bg-dark-background-secondary dark:text-dark-text dark:hover:bg-gray-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Controls */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text">
              Sortierung
            </label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(
                    e.target.value as
                      | "startDate"
                      | "title"
                      | "createdAt"
                      | "status",
                  );
                  setPage(1);
                }}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={toggleSortOrder}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text"
              >
                {sortOrder === "asc" ? (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                      />
                    </svg>
                    Aufsteigend
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                      />
                    </svg>
                    Absteigend
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-dark-border dark:bg-dark-surface"
            />
          ))}
        </div>
      )}

      {/* Courses Grid */}
      {!isLoading && data?.courses && data.courses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.courses.map((course) => (
            <DashboardCourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              startDate={new Date(course.startDate)}
              endDate={new Date(course.endDate)}
              location={course.location?.city}
              courseType={course.courseType}
              district={course.bezirk?.number}
              status={course.status}
              registrationOpen={course.registrationOpen}
              maxParticipants={course.maxParticipants}
              confirmedCount={course._count.participants}
              createdBy={course.createdBy}
              createdAt={new Date(course.createdAt)}
              reviewer={course.reviewer}
              reviewDate={course.reviewDate ? new Date(course.reviewDate) : null}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.courses && data.courses.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white py-12 text-center dark:border-dark-border dark:bg-dark-surface">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-dark dark:text-dark-text">
            Keine Kurse gefunden
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {statusFilter !== "all"
              ? "Es gibt keine Kurse mit diesem Status."
              : "Es gibt noch keine Kurse."}
          </p>
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-border dark:bg-dark-surface dark:hover:bg-gray-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <span className="text-sm text-dark dark:text-dark-text">
            Seite {page} von {data.pages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-border dark:bg-dark-surface dark:hover:bg-gray-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
