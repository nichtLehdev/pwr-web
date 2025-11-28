"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import DashboardEventCard from "./dashboard-event-card";
import type { ContentStatus } from "~/generated/prisma/client";

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
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">(
    "all",
  );
  const [sortBy, setSortBy] = useState<
    "eventDate" | "title" | "createdAt" | "status"
  >("eventDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const limit = 12;

  const { data, isLoading, error } = api.events.getDashboardEvents.useQuery({
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

    // Others can see all (their own events)
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
          {(statusFilter !== "all" || sortBy !== "eventDate") && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
              {(statusFilter !== "all" ? 1 : 0) +
                (sortBy !== "eventDate" ? 1 : 0)}
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
                    : "dark:bg-dark-background-secondary text-dark dark:text-dark-text bg-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
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
                  e.target.value as "eventDate" | "title" | "createdAt" | "status",
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
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-dark-text">
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
              className="dark:border-dark-border dark:bg-dark-surface h-48 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
            />
          ))}
        </div>
      )}

      {/* Events Grid */}
      {!isLoading && data?.events && data.events.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.events.map((event) => (
            <DashboardEventCard
              key={event.id}
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
              reviewDate={event.reviewDate ? new Date(event.reviewDate) : null}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.events && data.events.length === 0 && (
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
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
    </div>
  );
}
