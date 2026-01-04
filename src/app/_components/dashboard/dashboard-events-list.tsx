"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import DashboardEventCard from "./dashboard-event-card";
import type { ContentStatus } from "~/generated/prisma/client";
import { useToast } from "@/app/_components/ui/toast";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  BanIcon,
  CheckIcon,
  CopyIcon,
  FilterIcon,
  PencilIcon,
  SquareDashed,
  TrashIcon,
  X,
} from "lucide-react";

interface DashboardEventsListProps {
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
  value: "eventDate" | "title" | "createdAt" | "status";
  label: string;
}[] = [
  { value: "eventDate", label: "Datum" },
  { value: "title", label: "Titel" },
  { value: "createdAt", label: "Erstellt am" },
  { value: "status", label: "Status" },
];

export default function DashboardEventsList({
  userRole,
}: DashboardEventsListProps) {
  const router = useRouter();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">(
    "all",
  );
  const [sortBy, setSortBy] = useState<
    "eventDate" | "title" | "createdAt" | "status"
  >("eventDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showOnlyUpcoming, setShowOnlyUpcoming] = useState(true);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [newStatus, setNewStatus] = useState<ContentStatus | null>(null);
  const limit = 12;

  const utils = api.useUtils();

  const { data, isLoading, error } = api.events.getDashboardEvents.useQuery({
    page,
    limit,
    status: statusFilter === "all" ? undefined : statusFilter,
    sortBy,
    sortOrder,
    upcomingOnly: showOnlyUpcoming,
  });

  const bulkDeleteMutation = api.events.bulkDelete.useMutation({
    onSuccess: (result) => {
      void utils.events.getDashboardEvents.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowDeleteConfirm(false);
      toast.success(`${result.deletedCount} Event(s) gelöscht`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const bulkCancelMutation = api.events.bulkCancel.useMutation({
    onSuccess: (result) => {
      void utils.events.getDashboardEvents.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowCancelConfirm(false);
      toast.success(`${result.cancelledCount} Event(s) abgesagt`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const duplicateMutation = api.events.duplicate.useMutation({
    onSuccess: (newEvent) => {
      void utils.events.getDashboardEvents.invalidate();
      toast.success("Event dupliziert");
      router.push(`/dashboard/events/${newEvent.id}/edit`);
    },
    onError: (error) => {
      toast.error(`Fehler beim Duplizieren: ${error.message}`);
    },
  });

  const bulkDuplicateMutation = api.events.bulkDuplicate.useMutation({
    onSuccess: (result) => {
      void utils.events.getDashboardEvents.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      toast.success(`${result.duplicatedCount} Event(s) dupliziert`);
    },
    onError: (error) => {
      toast.error(`Fehler beim Duplizieren: ${error.message}`);
    },
  });

  const bulkStatusChangeMutation = api.events.bulkStatusChange.useMutation({
    onSuccess: (result) => {
      void utils.events.getDashboardEvents.invalidate();
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowStatusChange(false);
      setNewStatus(null);
      toast.success(`${result.updatedCount} Event(s) aktualisiert`);
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const availableFilters = statusFilters.filter((filter) => {
    if (userRole === "ADMIN" || userRole === "LPW") return true;

    if (userRole === "RPW") {
      return filter.value !== "DRAFT";
    }

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
    if (data?.events) {
      setSelectedIds(new Set(data.events.map((e) => e.id)));
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

  const handleBulkCancel = () => {
    if (selectedIds.size > 0) {
      bulkCancelMutation.mutate({ ids: Array.from(selectedIds) });
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
          Fehler beim Laden der Events: {error.message}
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
            Events
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data?.total ?? 0} {data?.total === 1 ? "Event" : "Events"} gefunden
          </p>
        </div>

        {/* Selection Mode Toggle */}
        {!selectionMode ? (
          <button
            onClick={() => setSelectionMode(true)}
            className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <SquareDashed className="h-4 w-4" />
            Auswählen
          </button>
        ) : (
          <button
            onClick={exitSelectionMode}
            className="dark:border-dark-border dark:bg-dark-surface dark:text-dark-text flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
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
                <CopyIcon className="h-4 w-4" />
                {duplicateMutation.isPending ? "..." : "Duplizieren"}
              </button>
            )}

            {selectedIds.size > 1 && (
              <button
                onClick={handleBulkDuplicate}
                disabled={bulkDuplicateMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <CopyIcon className="h-4 w-4" />
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
              <PencilIcon className="h-4 w-4" />
              Status ändern
            </button>

            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={selectedIds.size === 0 || bulkCancelMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
            >
              <BanIcon className="h-4 w-4" />
              Absagen
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedIds.size === 0 || bulkDeleteMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4" />
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
                <FilterIcon className="h-4 w-4" />
                Filter & Sortierung
              </span>
              {(statusFilter !== "all" || sortBy !== "eventDate") && (
                <span className="bg-primary flex h-5 w-5 items-center justify-center rounded-full text-xs text-white">
                  {(statusFilter !== "all" ? 1 : 0) +
                    (sortBy !== "eventDate" ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Desktop Filters - Always visible */}
          <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-4">
            {/* Upcoming Filter Toggle */}
            <button
              onClick={() => {
                setShowOnlyUpcoming(!showOnlyUpcoming);
                setPage(1);
              }}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                showOnlyUpcoming
                  ? "bg-primary text-white"
                  : "dark:bg-dark-background-secondary text-dark dark:text-dark-text bg-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <ArrowUpDownIcon className="h-4 w-4" />
              Nur zukünftige
            </button>

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
                      : "dark:bg-dark-background-secondary text-dark dark:text-dark-text bg-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
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
                      | "eventDate"
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
              {/* Upcoming Filter Toggle */}
              <div className="mb-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showOnlyUpcoming}
                    onChange={(e) => {
                      setShowOnlyUpcoming(e.target.checked);
                      setPage(1);
                    }}
                    className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
                  />
                  <span className="dark:text-dark-text text-sm font-medium text-gray-700">
                    Nur zukünftige Termine anzeigen
                  </span>
                </label>
              </div>

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
                          : "dark:bg-dark-background-secondary text-dark dark:text-dark-text bg-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
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
                          | "eventDate"
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
              className="dark:border-dark-border dark:bg-dark-surface h-48 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
            />
          ))}
        </div>
      )}

      {/* Events Grid */}
      {!isLoading && data?.events && data.events.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.events.map((event) => (
            <div key={event.id} className="relative">
              {selectionMode && (
                <div
                  className={`absolute inset-0 z-10 cursor-pointer rounded-lg border-2 transition-colors ${
                    selectedIds.has(event.id)
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:border-gray-300 hover:bg-gray-50/50 dark:hover:border-gray-600"
                  }`}
                  onClick={() => toggleSelection(event.id)}
                >
                  <div className="absolute top-3 left-3">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded border-2 transition-colors ${
                        selectedIds.has(event.id)
                          ? "border-primary bg-primary text-white"
                          : "dark:bg-dark-surface border-gray-300 bg-white dark:border-gray-600"
                      }`}
                    >
                      {selectedIds.has(event.id) && (
                        <CheckIcon className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>
              )}
              <DashboardEventCard
                id={event.id}
                title={event.title}
                date={new Date(event.eventDate)}
                location={event.location?.city ?? ""}
                category={event.category}
                district={event.bezirk?.number}
                status={event.status}
                cancelled={event.cancelled}
                createdBy={event.createdBy}
                createdAt={new Date(event.createdAt)}
                reviewer={event.reviewer}
                reviewDate={
                  event.reviewDate ? new Date(event.reviewDate) : null
                }
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.events && data.events.length === 0 && (
        <div className="dark:border-dark-border dark:bg-dark-surface rounded-lg border border-gray-200 bg-white py-12 text-center">
          <SquareDashed className="h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="text-dark dark:text-dark-text mt-4 text-lg font-semibold">
            Keine Events gefunden
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {statusFilter !== "all"
              ? "Es gibt keine Events mit diesem Status."
              : "Es gibt noch keine Events."}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-dark dark:text-dark-text text-lg font-bold">
              Events löschen?
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Möchtest du wirklich {selectedIds.size} Event(s) unwiderruflich
              löschen?
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

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="dark:bg-dark-surface w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-dark dark:text-dark-text text-lg font-bold">
              Events absagen?
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Möchtest du wirklich {selectedIds.size} Event(s) als abgesagt
              markieren?
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleBulkCancel}
                disabled={bulkCancelMutation.isPending}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
              >
                {bulkCancelMutation.isPending ? "Absagen..." : "Absagen"}
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
              Wähle den neuen Status für {selectedIds.size} Event(s):
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
