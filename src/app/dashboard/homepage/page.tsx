"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";
import { UserRole } from "~/generated/prisma/enums";
import { Plus, Edit, Trash2, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import { useToast } from "@/app/_components/ui/toast";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalHeader,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

const DASHBOARD_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.LPW];

export default function DashboardHomepagePage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const toast = useToast();

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const utils = api.useUtils();

  const { data: items, isLoading } = api.homepage.getAll.useQuery(undefined, {
    enabled: !!profile && DASHBOARD_ROLES.includes(profile.role),
  });

  const createMutation = api.homepage.create.useMutation({
    onSuccess: () => {
      utils.homepage.getAll.invalidate();
      setShowAddModal(false);
      setSelectedMediaId(null);
      setCustomTitle("");
      setCustomSubtitle("");
      toast.success("Carousel-Element hinzugefügt");
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Hinzufügen");
    },
  });

  const updateMutation = api.homepage.update.useMutation({
    onSuccess: () => {
      utils.homepage.getAll.invalidate();
      setShowEditModal(null);
      toast.success("Carousel-Element aktualisiert");
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Aktualisieren");
    },
  });

  const deleteMutation = api.homepage.delete.useMutation({
    onSuccess: () => {
      utils.homepage.getAll.invalidate();
      setShowDeleteModal(null);
      toast.success("Carousel-Element gelöscht");
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Löschen");
    },
  });

  const reorderMutation = api.homepage.reorder.useMutation({
    onSuccess: () => {
      utils.homepage.getAll.invalidate();
      toast.success("Reihenfolge aktualisiert");
    },
    onError: (error) => {
      toast.error(error.message || "Fehler beim Aktualisieren der Reihenfolge");
    },
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [customSubtitle, setCustomSubtitle] = useState("");

  useEffect(() => {
    if (!isPending && !session && !hasRedirected.current) {
      hasRedirected.current = true;
      redirect("/login?callbackUrl=/dashboard/homepage");
    }
  }, [isPending, session]);

  useEffect(() => {
    if (!profileLoading && profile && !hasRedirected.current) {
      if (!DASHBOARD_ROLES.includes(profile.role)) {
        hasRedirected.current = true;
        redirect("/");
      }
    }
  }, [profile, profileLoading]);

  const handleAdd = () => {
    if (!selectedMediaId) {
      toast.error("Bitte wähle ein Bild aus");
      return;
    }

    const maxSortOrder = items
      ? Math.max(...items.map((item) => item.sortOrder), -1)
      : -1;

    createMutation.mutate({
      mediaId: selectedMediaId,
      title: customTitle || undefined,
      subtitle: customSubtitle || undefined,
      sortOrder: maxSortOrder + 1,
    });
  };

  const handleEdit = (itemId: string) => {
    const item = items?.find((i) => i.id === itemId);
    if (!item) return;

    setSelectedMediaId(item.mediaId);
    setSelectedMediaUrl(item.media.url);
    setCustomTitle(item.title || "");
    setCustomSubtitle(item.subtitle || "");
    setShowEditModal(itemId);
  };

  const handleUpdate = () => {
    if (!showEditModal || !selectedMediaId) {
      toast.error("Bitte wähle ein Bild aus");
      return;
    }

    updateMutation.mutate({
      id: showEditModal,
      mediaId: selectedMediaId,
      title: customTitle || null,
      subtitle: customSubtitle || null,
    });
  };

  const handleDelete = (itemId: string) => {
    deleteMutation.mutate({ id: itemId });
  };

  const handleMoveUp = (index: number) => {
    if (!items || index === 0) return;

    const newItems = [...items];
    const currentItem = newItems[index];
    const previousItem = newItems[index - 1];

    if (!currentItem || !previousItem) return;

    const temp = currentItem.sortOrder;
    currentItem.sortOrder = previousItem.sortOrder;
    previousItem.sortOrder = temp;

    reorderMutation.mutate({
      items: newItems.map((item) => ({
        id: item.id,
        sortOrder: item.sortOrder,
      })),
    });
  };

  const handleMoveDown = (index: number) => {
    if (!items || index === items.length - 1) return;

    const newItems = [...items];
    const currentItem = newItems[index];
    const nextItem = newItems[index + 1];

    if (!currentItem || !nextItem) return;

    const temp = currentItem.sortOrder;
    currentItem.sortOrder = nextItem.sortOrder;
    nextItem.sortOrder = temp;

    reorderMutation.mutate({
      items: newItems.map((item) => ({
        id: item.id,
        sortOrder: item.sortOrder,
      })),
    });
  };

  const handleToggleActive = (item: NonNullable<typeof items>[0]) => {
    updateMutation.mutate({
      id: item.id,
      isActive: !item.isActive,
    });
  };

  if (isPending || profileLoading || isLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !DASHBOARD_ROLES.includes(profile.role)) {
    return null;
  }

  const editingItem = showEditModal
    ? items?.find((i) => i.id === showEditModal)
    : null;

  return (
    <main className="dark:bg-dark-background min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/dashboard"
                className="dark:text-dark-muted dark:hover:text-primary hover:text-primary text-gray-500"
              >
                Dashboard
              </Link>
            </li>
            <li className="dark:text-dark-muted text-gray-400">/</li>
            <li className="dark:text-dark-text text-gray-900">Homepage</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="dark:text-dark-text text-3xl font-bold text-gray-900">
              Homepage Carousel verwalten
            </h1>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              Verwalte die Bilder und Texte im Hero-Bereich der Homepage (max. 5
              Elemente)
            </p>
          </div>
          <button
            onClick={() => {
              if (items && items.length >= 5) {
                toast.error("Maximum von 5 Carousel-Elementen erreicht");
                return;
              }
              setShowAddModal(true);
              setSelectedMediaId(null);
              setSelectedMediaUrl(null);
              setCustomTitle("");
              setCustomSubtitle("");
            }}
            disabled={items && items.length >= 5}
            className="bg-primary hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Neues Element
          </button>
        </div>

        {/* Items List */}
        {items && items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-4 ${
                  !item.isActive ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Image Preview */}
                  <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {item.media.mimeType.startsWith("image/") ? (
                      <Image
                        src={item.media.url}
                        alt={item.media.alt || item.media.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="dark:text-dark-text font-semibold text-gray-900">
                            {item.title || "Standard-Titel"}
                          </h3>
                          {!item.isActive && (
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                              Inaktiv
                            </span>
                          )}
                        </div>
                        <p className="dark:text-dark-muted mt-1 text-sm text-gray-600">
                          {item.subtitle || "Standard-Untertitel"}
                        </p>
                        <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                          Bild: {item.media.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0 || reorderMutation.isPending}
                        className="dark:bg-dark-background dark:hover:bg-dark-border rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                        title="Nach oben"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={
                          index === items.length - 1 ||
                          reorderMutation.isPending
                        }
                        className="dark:bg-dark-background dark:hover:bg-dark-border rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                        title="Nach unten"
                      >
                        ↓
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(item.id)}
                        className="dark:bg-dark-background dark:hover:bg-dark-border rounded p-1.5 text-gray-600 hover:bg-gray-100"
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(item.id)}
                        className="dark:bg-dark-background dark:hover:bg-dark-border rounded p-1.5 text-red-600 hover:bg-red-50"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`rounded px-2 py-1 text-xs ${
                        item.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {item.isActive ? "Aktiv" : "Inaktiv"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="dark:bg-dark-surface dark:border-dark-border rounded-lg border border-gray-200 bg-white p-12 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="dark:text-dark-text mt-4 text-lg font-semibold text-gray-900">
              Keine Carousel-Elemente
            </h3>
            <p className="dark:text-dark-muted mt-2 text-gray-600">
              Füge das erste Element hinzu, um die Homepage zu personalisieren
            </p>
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <ScrollableModal>
            <ScrollableModalCard maxW="2xl">
              <ScrollableModalHeader>
                <div className="flex items-center justify-between">
                  <h2 className="dark:text-dark-text text-xl font-semibold text-gray-900">
                    Neues Carousel-Element
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedMediaId(null);
                      setSelectedMediaUrl(null);
                      setCustomTitle("");
                      setCustomSubtitle("");
                    }}
                    className="dark:text-dark-text text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </ScrollableModalHeader>
              <ScrollableModalBody className="space-y-4">
                {/* Media Selection */}
                <div>
                  <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                    Bild *
                  </label>
                  {selectedMediaUrl ? (
                    <div className="relative">
                      <div className="relative h-48 w-full overflow-hidden rounded-lg bg-gray-100">
                        <Image
                          src={selectedMediaUrl}
                          alt="Selected"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setSelectedMediaId(null);
                          setSelectedMediaUrl(null);
                        }}
                        className="dark:bg-dark-background dark:hover:bg-dark-border mt-2 rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                      >
                        Bild ändern
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowMediaPicker(true)}
                      className="dark:bg-dark-background dark:border-dark-border dark:hover:bg-dark-border hover:border-primary w-full rounded-lg border-2 border-dashed border-gray-300 p-8 text-center"
                    >
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="dark:text-dark-text mt-2 text-sm font-medium text-gray-700">
                        Bild auswählen
                      </p>
                    </button>
                  )}
                </div>

                {/* Custom Title */}
                <div>
                  <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                    Titel (optional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Posaunenwerk Rheinland"
                    className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2"
                  />
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Leer lassen für Standard-Titel
                  </p>
                </div>

                {/* Custom Subtitle */}
                <div>
                  <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                    Untertitel (optional)
                  </label>
                  <input
                    type="text"
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    placeholder="Gemeinsam Musik machen, Glauben leben"
                    className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2"
                  />
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Leer lassen für Standard-Untertitel
                  </p>
                </div>
              </ScrollableModalBody>
              <ScrollableModalFooter>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedMediaId(null);
                      setSelectedMediaUrl(null);
                      setCustomTitle("");
                      setCustomSubtitle("");
                    }}
                    className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!selectedMediaId || createMutation.isPending}
                    className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-white disabled:opacity-50"
                  >
                    {createMutation.isPending
                      ? "Wird hinzugefügt..."
                      : "Hinzufügen"}
                  </button>
                </div>
              </ScrollableModalFooter>
            </ScrollableModalCard>
          </ScrollableModal>
        )}

        {/* Edit Modal */}
        {showEditModal && editingItem && (
          <ScrollableModal>
            <ScrollableModalCard maxW="2xl">
              <ScrollableModalHeader>
                <div className="flex items-center justify-between">
                  <h2 className="dark:text-dark-text text-xl font-semibold text-gray-900">
                    Carousel-Element bearbeiten
                  </h2>
                  <button
                    onClick={() => {
                      setShowEditModal(null);
                      setSelectedMediaId(null);
                      setSelectedMediaUrl(null);
                      setCustomTitle("");
                      setCustomSubtitle("");
                    }}
                    className="dark:text-dark-text text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </ScrollableModalHeader>
              <ScrollableModalBody className="space-y-4">
                {/* Media Selection */}
                <div>
                  <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                    Bild *
                  </label>
                  {selectedMediaUrl ? (
                    <div className="relative">
                      <div className="relative h-48 w-full overflow-hidden rounded-lg bg-gray-100">
                        <Image
                          src={selectedMediaUrl}
                          alt="Selected"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <button
                        onClick={() => setShowMediaPicker(true)}
                        className="dark:bg-dark-background dark:hover:bg-dark-border mt-2 rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                      >
                        Bild ändern
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowMediaPicker(true)}
                      className="dark:bg-dark-background dark:border-dark-border dark:hover:bg-dark-border hover:border-primary w-full rounded-lg border-2 border-dashed border-gray-300 p-8 text-center"
                    >
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="dark:text-dark-text mt-2 text-sm font-medium text-gray-700">
                        Bild auswählen
                      </p>
                    </button>
                  )}
                </div>

                {/* Custom Title */}
                <div>
                  <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                    Titel (optional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Posaunenwerk Rheinland"
                    className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2"
                  />
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Leer lassen für Standard-Titel
                  </p>
                </div>

                {/* Custom Subtitle */}
                <div>
                  <label className="dark:text-dark-text mb-2 block text-sm font-medium text-gray-700">
                    Untertitel (optional)
                  </label>
                  <input
                    type="text"
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    placeholder="Gemeinsam Musik machen, Glauben leben"
                    className="dark:bg-dark-background dark:border-dark-border dark:text-dark-text w-full rounded-lg border border-gray-300 px-4 py-2"
                  />
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Leer lassen für Standard-Untertitel
                  </p>
                </div>
              </ScrollableModalBody>
              <ScrollableModalFooter>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowEditModal(null);
                      setSelectedMediaId(null);
                      setSelectedMediaUrl(null);
                      setCustomTitle("");
                      setCustomSubtitle("");
                    }}
                    className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={!selectedMediaId || updateMutation.isPending}
                    className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-white disabled:opacity-50"
                  >
                    {updateMutation.isPending
                      ? "Wird gespeichert..."
                      : "Speichern"}
                  </button>
                </div>
              </ScrollableModalFooter>
            </ScrollableModalCard>
          </ScrollableModal>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <ScrollableModal>
            <ScrollableModalCard maxW="md">
              <ScrollableModalBody>
                <h2 className="dark:text-dark-text mb-4 text-xl font-semibold text-gray-900">
                  Element löschen?
                </h2>
                <p className="dark:text-dark-muted mb-6 text-gray-600">
                  Möchtest du dieses Carousel-Element wirklich löschen? Diese
                  Aktion kann nicht rückgängig gemacht werden.
                </p>
              </ScrollableModalBody>
              <ScrollableModalFooter>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteModal(null)}
                    className="dark:border-dark-border dark:text-dark-text rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteModal)}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? "Wird gelöscht..." : "Löschen"}
                  </button>
                </div>
              </ScrollableModalFooter>
            </ScrollableModalCard>
          </ScrollableModal>
        )}

        {/* Media Picker Modal */}
        <MediaPickerModal
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(url, _alt, mediaId) => {
            if (mediaId) {
              setSelectedMediaId(mediaId);
              setSelectedMediaUrl(url);
            }
            setShowMediaPicker(false);
          }}
        />
      </div>
    </main>
  );
}
