"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
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
import { cn } from "@/lib/utils";

type DashboardCoursesListProps = Record<string, never>;

type DashboardCoursesScheduleFilter = "active" | "all" | "past";

const scheduleFilters: {
  value: DashboardCoursesScheduleFilter;
  label: string;
}[] = [
  { value: "active", label: "Aktuell" },
  { value: "all", label: "Alle Zeiträume" },
  { value: "past", label: "Vergangen" },
];

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
  const [scheduleFilter, setScheduleFilter] =
    useState<DashboardCoursesScheduleFilter>("active");
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
    schedule: scheduleFilter,
    sortBy,
    sortOrder,
  });

  useEffect(() => {
    if (data && data.pages > 0 && page > data.pages) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clamp page when total pages shrink (filters / data)
      setPage(data.pages);
    }
  }, [data, page]);

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

  const { hasPermission } = usePermissions();

  const hasApprovePermission = hasPermission("courses.approve" as any);

  const availableFilters = statusFilters.filter((filter) => {
    if (hasApprovePermission) return true;

    // Non-reviewers can't see drafts
    return filter.value !== "DRAFT";
  });

  const adjustedFilterCount = useMemo(() => {
    return (
      (statusFilter !== "all" ? 1 : 0) +
      (scheduleFilter !== "active" ? 1 : 0) +
      (sortBy !== "startDate" || sortOrder !== "asc" ? 1 : 0)
    );
  }, [statusFilter, scheduleFilter, sortBy, sortOrder]);

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

  const scheduleSegment = (
    <div className="dark:border-dark-border inline-flex max-w-full rounded-md border border-gray-200/90 p-0.5">
      {scheduleFilters.map((sf) => (
        <button
          key={sf.value}
          type="button"
          onClick={() => {
            setScheduleFilter(sf.value);
            setPage(1);
          }}
          className={cn(
            "min-w-0 shrink-0 rounded px-2.5 py-1.5 text-center text-xs font-medium transition-colors sm:text-sm",
            scheduleFilter === sf.value
              ? "dark:bg-dark-surface dark:text-dark-text bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200",
          )}
        >
          {sf.label}
        </button>
      ))}
    </div>
  );

  const selectClass =
    "dark:border-dark-border dark:bg-dark-background min-h-9 min-w-0 rounded-md border border-gray-200/90 bg-white px-2.5 py-1.5 text-sm text-gray-900 dark:text-dark-text";

  const filterControlsRow = (
    <div className="-mx-0.5 flex flex-nowrap items-center gap-x-2 overflow-x-auto px-0.5 pb-1 sm:mx-0 sm:gap-x-3 sm:overflow-visible sm:pb-0">
      <div className="shrink-0">{scheduleSegment}</div>
      <Select
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value as ContentStatus | "all");
          setPage(1);
        }}
        className={cn(selectClass, "w-[10.25rem] shrink-0 sm:w-[11.75rem]")}
        aria-label="Status"
      >
        {availableFilters.map((filter) => (
          <option key={String(filter.value)} value={String(filter.value)}>
            {filter.label}
          </option>
        ))}
      </Select>
      <div className="flex shrink-0 items-center gap-1.5">
        <Select
          value={sortBy}
          onChange={(e) => {
            setSortBy(
              e.target.value as "startDate" | "title" | "createdAt" | "status",
            );
            setPage(1);
          }}
          className={cn(selectClass, "w-[9.5rem]")}
          aria-label="Sortierung"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <button
          type="button"
          onClick={toggleSortOrder}
          className="text-dark dark:text-dark-text dark:border-dark-border dark:bg-dark-background-secondary dark:hover:bg-dark-surface inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200/90 bg-white text-gray-600 transition-colors hover:bg-gray-50"
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
  );

  return (
    <div className="space-y-3">
      {!selectionMode && (
        <div className="dark:border-dark-border border-b border-gray-200/80 pb-2">
          <div className="hidden w-full flex-nowrap items-center gap-x-3 sm:flex">
            <p className="shrink-0 text-sm text-gray-600 tabular-nums dark:text-gray-400">
              {isLoading ? (
                <span className="text-gray-500">Liste wird geladen…</span>
              ) : data ? (
                <>
                  <span className="text-dark dark:text-dark-text font-semibold">
                    {data.total}
                  </span>{" "}
                  {data.total === 1 ? "Kurs" : "Kurse"}
                  {scheduleFilter === "active" && " · aktuell & geplant"}
                  {scheduleFilter === "past" && " · vergangen"}
                  {scheduleFilter === "all" && " · alle Zeiträume"}
                </>
              ) : null}
            </p>
            <div className="min-w-0 flex-1">{filterControlsRow}</div>
            <Button
              onClick={() => setSelectionMode(true)}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <SquareDashed className="h-4 w-4" />
              Auswählen
            </Button>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 sm:hidden">
            <p className="text-sm text-gray-600 tabular-nums dark:text-gray-400">
              {isLoading ? (
                <span className="text-gray-500">Liste wird geladen…</span>
              ) : data ? (
                <>
                  <span className="text-dark dark:text-dark-text font-semibold">
                    {data.total}
                  </span>{" "}
                  {data.total === 1 ? "Kurs" : "Kurse"}
                  {scheduleFilter === "active" && " · aktuell & geplant"}
                  {scheduleFilter === "past" && " · vergangen"}
                  {scheduleFilter === "all" && " · alle Zeiträume"}
                </>
              ) : null}
            </p>
            <Button
              onClick={() => setSelectionMode(true)}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <SquareDashed className="h-4 w-4" />
              Auswählen
            </Button>
          </div>

          <div className="mt-2 sm:hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="dark:border-dark-border flex w-full items-center justify-between gap-2 rounded-md border border-gray-200/80 px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              <span className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4 text-gray-400" />
                Zeitraum, Status, Sortierung
              </span>
              {adjustedFilterCount > 0 ? (
                <span className="dark:bg-dark-border rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 tabular-nums dark:text-gray-200">
                  {adjustedFilterCount}
                </span>
              ) : null}
            </button>
            {filtersOpen ? (
              <div className="dark:border-dark-border mt-2 space-y-3 rounded-md border border-gray-200/80 p-3">
                {filterControlsRow}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {selectionMode && (
        <div className="dark:border-dark-border flex flex-wrap items-center gap-3 gap-y-2 border-b border-gray-200/80 pb-2">
          <span className="text-dark dark:text-dark-text text-sm font-medium tabular-nums">
            {selectedIds.size} ausgewählt
          </span>

          <div className="dark:border-dark-border flex items-center gap-2 border-l border-gray-200/90 pl-3">
            <button
              type="button"
              onClick={selectAll}
              className="hover:text-primary text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              Alle
            </button>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <button
              type="button"
              onClick={deselectAll}
              className="hover:text-primary text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              Keine
            </button>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {selectedIds.size === 1 && (
              <Button
                onClick={handleDuplicate}
                disabled={duplicateMutation.isPending}
                variant="outline"
                size="sm"
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
                variant="outline"
                size="sm"
                isLoading={bulkDuplicateMutation.isPending}
              >
                <CopyIcon className="h-4 w-4" />
                {selectedIds.size} duplizieren
              </Button>
            )}

            <Button
              onClick={() => setShowStatusChange(true)}
              disabled={selectedIds.size === 0}
              variant="outline"
              size="sm"
            >
              <PencilIcon className="h-4 w-4" />
              Status
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

            <Button onClick={exitSelectionMode} variant="outline" size="sm">
              <X className="h-4 w-4" />
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="dark:border-dark-border dark:bg-dark-surface h-52 animate-pulse rounded-lg border border-gray-200/70 bg-gray-100"
            />
          ))}
        </div>
      )}

      {/* Courses Grid */}
      {!isLoading && data?.courses && data.courses.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.courses && data.courses.length === 0 && (
        <div className="dark:border-dark-border border-t border-gray-200/80 py-14 text-center">
          <SquareDashed className="mx-auto h-10 w-10 text-gray-400/80 dark:text-gray-500" />
          <h3 className="text-dark dark:text-dark-text mt-4 text-lg font-semibold">
            Keine Kurse gefunden
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {statusFilter !== "all"
              ? "Für diese Statusfilter gibt es keine Treffer."
              : scheduleFilter === "active"
                ? "Keine Kurse mehr im aktuellen Zeitraum. Versuche „Alle Zeiträume“ oder „Vergangen“, oder lege einen neuen Kurs an."
                : scheduleFilter === "past"
                  ? "Keine vergangenen Kurse gefunden."
                  : "Es gibt noch keine Kurse."}
          </p>
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="dark:border-dark-border dark:bg-dark-surface dark:hover:bg-dark-background-secondary rounded-lg border border-gray-200/90 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>

          <span className="text-dark dark:text-dark-text text-sm tabular-nums">
            Seite {page} von {data.pages}
          </span>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="dark:border-dark-border dark:bg-dark-surface dark:hover:bg-dark-background-secondary rounded-lg border border-gray-200/90 bg-white px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                  type="button"
                  onClick={handleBulkStatusChange}
                  disabled={!newStatus || bulkStatusChangeMutation.isPending}
                  className="bg-primary hover:bg-primary-dark rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
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
