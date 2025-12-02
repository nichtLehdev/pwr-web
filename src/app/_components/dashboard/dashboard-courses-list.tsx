"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">(
    "all",
  );
  const [sortBy, setSortBy] = useState<
    "startDate" | "title" | "createdAt" | "status"
  >("startDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [newStatus, setNewStatus] = useState<ContentStatus | null>(null);
  const limit = 12;

  const utils = api.useUtils();

  const { data, isLoading, error } = api.courses.getDashboardCourses.useQuery({
    page,
    limit,
    status: statusFilter === "all" ? undefined : statusFilter,
    sortBy,
    sortOrder,
  });

  const bulkDeleteMutation = api.courses.bulkDelete.useMutation({
    onSuccess: (result) => {
      void utils.courses.getDashboardCourses.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowDeleteConfirm(false);
      alert(`${result.deletedCount} Kurs(e) gelöscht`);
    },
    onError: (error) => {
      alert(`Fehler: ${error.message}`);
    },
  });

  const duplicateMutation = api.courses.duplicate.useMutation({
    onSuccess: (newCourse) => {
      void utils.courses.getDashboardCourses.invalidate();
      router.push(`/dashboard/courses/${newCourse.id}/edit`);
    },
    onError: (error) => {
      alert(`Fehler beim Duplizieren: ${error.message}`);
    },
  });

  const bulkDuplicateMutation = api.courses.bulkDuplicate.useMutation({
    onSuccess: (result) => {
      void utils.courses.getDashboardCourses.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      alert(`${result.duplicatedCount} Kurs(e) dupliziert`);
    },
    onError: (error) => {
      alert(`Fehler beim Duplizieren: ${error.message}`);
    },
  });

  const bulkStatusChangeMutation = api.courses.bulkStatusChange.useMutation({
    onSuccess: (result) => {
      void utils.courses.getDashboardCourses.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowStatusChange(false);
      setNewStatus(null);
      alert(`${result.updatedCount} Kurs(e) aktualisiert`);
    },
    onError: (error) => {
      alert(`Fehler: ${error.message}`);
    },
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

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (data?.courses) {
      setSelectedIds(new Set(data.courses.map((c) => c.id)));
    }
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0) {
      bulkDeleteMutation.mutate({ ids: Array.from(selectedIds) });
    }
  };

  const handleDuplicate = () => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0]!;
      duplicateMutation.mutate({ id });
    }
  };

  const handleBulkDuplicate = () => {
    if (selectedIds.size > 0) {
      bulkDuplicateMutation.mutate({ ids: Array.from(selectedIds) });
    }
  };

  const handleBulkStatusChange = () => {
    if (selectedIds.size > 0 && newStatus) {
      bulkStatusChangeMutation.mutate({
        ids: Array.from(selectedIds),
        status: newStatus,
      });
    }
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
          <h2 className="text-dark dark:text-dark-text text-xl font-bold">
            Kurse
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data?.total ?? 0} {data?.total === 1 ? "Kurs" : "Kurse"} gefunden
          </p>
        </div>

        {/* Selection Mode Toggle */}
        {!selectionMode ? (
          <button
            onClick={() => setSelectionMode(true)}
            className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Auswählen
          </button>
        ) : (
          <button
            onClick={exitSelectionMode}
            className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Abbrechen
          </button>
        )}
      </div>

      {/* Selection Mode Actions Bar */}
      {selectionMode && (
        <div className="border-primary/30 bg-primary/5 dark:border-primary/50 dark:bg-primary/10 flex flex-wrap items-center gap-3 rounded-lg border p-4">
          <span className="text-dark dark:text-dark-text text-sm font-medium">
            {selectedIds.size} ausgewählt
          </span>

          <div className="flex items-center gap-2 border-l border-gray-300 pl-3 dark:border-gray-600">
            <button
              onClick={selectAll}
              className="text-primary text-sm hover:underline"
            >
              Alle auswählen
            </button>
            <span className="text-gray-400">|</span>
            <button
              onClick={deselectAll}
              className="text-primary text-sm hover:underline"
            >
              Keine
            </button>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {selectedIds.size === 1 && (
              <button
                onClick={handleDuplicate}
                disabled={duplicateMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {duplicateMutation.isPending ? "..." : "Duplizieren"}
              </button>
            )}

            {selectedIds.size > 1 && (
              <button
                onClick={handleBulkDuplicate}
                disabled={bulkDuplicateMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {bulkDuplicateMutation.isPending
                  ? "..."
                  : `${selectedIds.size} duplizieren`}
              </button>
            )}

            <button
              onClick={() => setShowStatusChange(true)}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
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
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
              Status ändern
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedIds.size === 0 || bulkDeleteMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Löschen
            </button>
          </div>
        </div>
      )}

      {/* Filters (hidden in selection mode) */}
      {!selectionMode && (
        <>
          {/* Mobile Filter Toggle */}
          <div className="sm:hidden">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <span className="flex items-center gap-2">
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
              </span>
              {(statusFilter !== "all" || sortBy !== "startDate") && (
                <span className="bg-primary flex h-5 w-5 items-center justify-center rounded-full text-xs text-white">
                  {(statusFilter !== "all" ? 1 : 0) +
                    (sortBy !== "startDate" ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

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
                      : "text-dark dark:bg-dark-background-secondary dark:text-dark-text bg-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Sort Controls */}
            <div className="dark:border-dark-border flex items-center gap-2 border-l border-gray-200 pl-4">
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
                className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:ring-1 focus:outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={toggleSortOrder}
                className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-lg border border-gray-200 bg-white p-1.5 text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
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

          {/* Mobile Filters Panel */}
          {filtersOpen && (
            <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white p-4 sm:hidden">
              {/* Status Filter */}
              <div className="mb-4">
                <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
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
                          : "text-dark dark:bg-dark-background-secondary dark:text-dark-text bg-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Controls */}
              <div>
                <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
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
                    className="focus:border-primary focus:ring-primary dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:ring-1 focus:outline-none"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={toggleSortOrder}
                    className="dark:border-dark-border dark:bg-dark-background-secondary dark:text-dark-text flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
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
        </>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="dark:border-dark-border dark:bg-dark-surface h-56 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
            />
          ))}
        </div>
      )}

      {/* Courses Grid */}
      {!isLoading && data?.courses && data.courses.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.courses.map((course) => (
            <div key={course.id} className="relative">
              {selectionMode && (
                <div
                  className={`absolute inset-0 z-10 cursor-pointer rounded-lg border-2 transition-colors ${
                    selectedIds.has(course.id)
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:border-gray-300 hover:bg-gray-50/50 dark:hover:border-gray-600"
                  }`}
                  onClick={() => toggleSelection(course.id)}
                >
                  <div className="absolute top-3 left-3">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded border-2 transition-colors ${
                        selectedIds.has(course.id)
                          ? "border-primary bg-primary text-white"
                          : "dark:bg-dark-surface border-gray-300 bg-white dark:border-gray-600"
                      }`}
                    >
                      {selectedIds.has(course.id) && (
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <DashboardCourseCard
                id={course.id}
                title={course.title}
                startDate={new Date(course.startDate)}
                endDate={new Date(course.endDate)}
                location={course.location?.city}
                courseType={course.courseType}
                district={course.bezirk?.number}
                status={course.status}
                registrationOpen={course.registrationOpen}
                registrationDeadline={
                  course.registrationDeadline
                    ? new Date(course.registrationDeadline)
                    : null
                }
                maxParticipants={course.maxParticipants}
                confirmedCount={course._count.participants}
                createdBy={course.createdBy}
                createdAt={new Date(course.createdAt)}
                reviewer={course.reviewer}
                reviewDate={
                  course.reviewDate ? new Date(course.reviewDate) : null
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.courses && data.courses.length === 0 && (
        <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white py-12 text-center">
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
          <h3 className="text-dark dark:text-dark-text mt-4 text-lg font-semibold">
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
            className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
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

          <span className="text-dark dark:text-dark-text text-sm">
            Seite {page} von {data.pages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-dark dark:text-dark-text text-lg font-bold">
              Kurse löschen?
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Möchtest du wirklich {selectedIds.size} Kurs(e) unwiderruflich
              löschen? Alle zugehörigen Anmeldungen werden ebenfalls gelöscht.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeleteMutation.isPending ? "Löschen..." : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-dark dark:text-dark-text text-lg font-bold">
              Status ändern
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Wähle den neuen Status für {selectedIds.size} Kurs(e):
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {statusFilters
                .filter((s) => s.value !== "all")
                .map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setNewStatus(status.value as ContentStatus)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      newStatus === status.value
                        ? "bg-primary text-white"
                        : "dark:bg-dark-background-secondary dark:text-dark-text bg-gray-100 text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowStatusChange(false);
                  setNewStatus(null);
                }}
                className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleBulkStatusChange}
                disabled={!newStatus || bulkStatusChangeMutation.isPending}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
              >
                {bulkStatusChangeMutation.isPending
                  ? "Ändern..."
                  : "Status ändern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
