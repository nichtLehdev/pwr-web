"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import DashboardCourseCard from "./dashboard-course-card";
import type { ContentStatus } from "~/generated/prisma/enums";
import { useToast } from "@/app/_components/ui/toast";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  FilterIcon,
  PencilIcon,
  SquareDashed,
  TrashIcon,
  X,
} from "lucide-react";
import { Button, Select } from "@/app/_components/ui";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

interface DashboardCoursesListProps {}

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

export default function DashboardCoursesList({}: DashboardCoursesListProps) {
  const router = useRouter();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">(
    "all",
  );
  const [sortBy, setSortBy] = useState<
    "startDate" | "title" | "createdAt" | "status"
  >("startDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
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
      toast.success(`${result.deletedCount} Kurs(e) gelöscht`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const duplicateMutation = api.courses.duplicate.useMutation({
    onSuccess: (newCourse) => {
      void utils.courses.getDashboardCourses.invalidate();
      toast.success("Kurs dupliziert");
      router.push(`/dashboard/courses/${newCourse.id}/edit`);
    },
    onError: (error) => {
      toast.error(`Fehler beim Duplizieren: ${error.message}`);
    },
  });

  const bulkDuplicateMutation = api.courses.bulkDuplicate.useMutation({
    onSuccess: (result) => {
      void utils.courses.getDashboardCourses.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      toast.success(`${result.duplicatedCount} Kurs(e) dupliziert`);
    },
    onError: (error) => {
      toast.error(`Fehler beim Duplizieren: ${error.message}`);
    },
  });

  const bulkStatusChangeMutation = api.courses.bulkStatusChange.useMutation({
    onSuccess: (result) => {
      void utils.courses.getDashboardCourses.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowStatusChange(false);
      setNewStatus(null);
      toast.success(`${result.updatedCount} Kurs(e) aktualisiert`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const { data: userPermissions } = api.permissions.getMyPermissions.useQuery();

  const hasApprovePermission =
    Array.isArray(userPermissions) &&
    userPermissions.some((perm: string) => perm === "courses.approve");

  const availableFilters = statusFilters.filter((filter) => {
    if (hasApprovePermission) return true;

    // Non-reviewers can't see drafts
    return filter.value !== "DRAFT";
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
          <Button
            onClick={() => setSelectionMode(true)}
            variant="outline"
            size="sm"
          >
            <SquareDashed className="h-4 w-4" />
            Auswählen
          </Button>
        ) : (
          <Button onClick={exitSelectionMode} variant="outline" size="sm">
            <X className="h-4 w-4" />
            Abbrechen
          </Button>
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
              <Button
                onClick={handleDuplicate}
                disabled={duplicateMutation.isPending}
                variant="secondary"
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
                isLoading={duplicateMutation.isPending}
              >
                <CopyIcon className="h-4 w-4" />
                Duplizieren
              </Button>
            )}

            {selectedIds.size > 1 && (
              <Button
                onClick={handleBulkDuplicate}
                disabled={bulkDuplicateMutation.isPending}
                variant="secondary"
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
                isLoading={bulkDuplicateMutation.isPending}
              >
                <CopyIcon className="h-4 w-4" />
                {selectedIds.size} duplizieren
              </Button>
            )}

            <Button
              onClick={() => setShowStatusChange(true)}
              disabled={selectedIds.size === 0}
              variant="secondary"
              size="sm"
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              <PencilIcon className="h-4 w-4" />
              Status ändern
            </Button>

            <Button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedIds.size === 0 || bulkDeleteMutation.isPending}
              variant="danger"
              size="sm"
              isLoading={bulkDeleteMutation.isPending}
            >
              <TrashIcon className="h-4 w-4" />
              Löschen
            </Button>
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
                <FilterIcon className="h-4 w-4" />
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
                <Button
                  key={filter.value}
                  onClick={() => {
                    setStatusFilter(filter.value);
                    setPage(1);
                  }}
                  variant={
                    statusFilter === filter.value ? "primary" : "secondary"
                  }
                  size="sm"
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {/* Sort Controls */}
            <div className="dark:border-dark-border flex items-center gap-2 border-l border-gray-200 pl-4">
              <Select
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
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <button
                onClick={toggleSortOrder}
                className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text rounded-lg border border-gray-200 bg-white p-1.5 text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                title={sortOrder === "asc" ? "Aufsteigend" : "Absteigend"}
              >
                {sortOrder === "asc" ? (
                  <ArrowUpIcon className="h-4 w-4" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4" />
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
                        <ArrowUpIcon className="h-4 w-4" />
                        Aufsteigend
                      </>
                    ) : (
                      <>
                        <ArrowDownIcon className="h-4 w-4" />
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
                        <CheckIcon className="h-4 w-4" />
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
                registrationOpensAt={
                  course.registrationOpensAt
                    ? new Date(course.registrationOpensAt)
                    : null
                }
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
          <SquareDashed className="h-12 w-12 text-gray-400 dark:text-gray-500" />
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
            <ArrowLeftIcon className="h-4 w-4" />
          </button>

          <span className="text-dark dark:text-dark-text text-sm">
            Seite {page} von {data.pages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700"
          >
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
              <h3 className="text-dark dark:text-dark-text text-lg font-bold">
                Kurse löschen?
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Möchtest du wirklich {selectedIds.size} Kurs(e) unwiderruflich
                löschen? Alle zugehörigen Anmeldungen werden ebenfalls gelöscht.
              </p>
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
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
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}

      {/* Status Change Modal */}
      {showStatusChange && (
        <ScrollableModal>
          <ScrollableModalCard maxW="md">
            <ScrollableModalBody>
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
                      onClick={() =>
                        setNewStatus(status.value as ContentStatus)
                      }
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
            </ScrollableModalBody>
            <ScrollableModalFooter>
              <div className="flex justify-end gap-3">
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
            </ScrollableModalFooter>
          </ScrollableModalCard>
        </ScrollableModal>
      )}
    </div>
  );
}
