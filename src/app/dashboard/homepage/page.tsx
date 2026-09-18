"use client";

import { useSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { DashboardPage } from "@/app/_components/dashboard";
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
import { Tag } from "@/app/_components/programmheft/tag";

export default function DashboardHomepagePage() {
  const { data: session, isPending } = useSession();
  const hasRedirected = useRef(false);
  const toast = useToast();

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageHomepage = hasPermission(PERMISSIONS.HOMEPAGE_MANAGE);

  const utils = api.useUtils();

  const { data: items, isLoading } = api.homepage.getAll.useQuery(undefined, {
    enabled: !!profile && !!canManageHomepage,
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
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageHomepage &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      redirect("/");
    }
  }, [profile, profileLoading, permissionsLoading, canManageHomepage]);

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
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageHomepage) {
    return null;
  }

  const editingItem = showEditModal
    ? items?.find((i) => i.id === showEditModal)
    : null;

  return (
    <>
      <DashboardPage
        title="Homepage Carousel verwalten"
        description="Verwalte die Bilder und Texte im Hero-Bereich der Homepage (max. 5 Elemente)"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Homepage" },
        ]}
        actions={
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
            className="bg-primary hover:bg-primary-dark text-ink semi-condensed inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Neues Element
          </button>
        }
      >
        {items && items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`border-rule dark:border-night-rule bg-paper dark:bg-night border p-4 ${
                  !item.isActive ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="bg-rule/25 dark:bg-night-raised relative h-24 w-32 shrink-0 overflow-hidden">
                    {item.media.mimeType.startsWith("image/") ? (
                      <Image
                        src={item.media.url}
                        alt={item.media.alt || item.media.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="text-dark dark:text-night-muted h-8 w-8" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-ink dark:text-night-text font-semibold">
                            {item.title || "Standard-Titel"}
                          </h3>
                          {!item.isActive && <Tag tone="muted">Inaktiv</Tag>}
                        </div>
                        <p className="text-dark dark:text-night-muted mt-1 text-sm">
                          {item.subtitle || "Standard-Untertitel"}
                        </p>
                        <p className="text-dark dark:text-night-muted mt-1 text-xs">
                          Bild: {item.media.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0 || reorderMutation.isPending}
                        className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text p-1 disabled:opacity-50"
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
                        className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text p-1 disabled:opacity-50"
                        title="Nach unten"
                      >
                        ↓
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(item.id)}
                        className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text p-1.5"
                        title="Bearbeiten"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(item.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`border px-2 py-1 text-xs font-medium ${
                        item.isActive
                          ? "border-ink dark:border-night-text text-ink dark:text-night-text"
                          : "border-rule dark:border-night-rule text-dark dark:text-night-muted"
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
          <div className="border-rule dark:border-night-rule border p-12 text-center">
            <ImageIcon className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
            <h3 className="text-ink dark:text-night-text mt-4 text-lg font-semibold">
              Keine Carousel-Elemente
            </h3>
            <p className="text-dark dark:text-night-muted mt-2">
              Füge das erste Element hinzu, um die Homepage zu personalisieren
            </p>
          </div>
        )}

        {showAddModal && (
          <ScrollableModal>
            <ScrollableModalCard maxW="2xl">
              <ScrollableModalHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-ink dark:text-night-text text-xl font-semibold">
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
                    className="text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </ScrollableModalHeader>
              <ScrollableModalBody className="space-y-4">
                <div>
                  <label className="text-ink dark:text-night-text mb-2 block text-sm font-medium">
                    Bild *
                  </label>
                  {selectedMediaUrl ? (
                    <div className="relative">
                      <div className="bg-rule/25 dark:bg-night-raised relative h-48 w-full overflow-hidden">
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
                        className="dark:bg-night-raised dark:hover:bg-night-rule text-ink dark:text-night-text bg-rule/40 hover:bg-rule/60 mt-2 px-3 py-1 text-sm"
                      >
                        Bild ändern
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowMediaPicker(true)}
                      className="border-ink dark:border-night-text hover:bg-rule/25 dark:hover:bg-night-raised hover:border-primary w-full border-2 border-dashed p-8 text-center"
                    >
                      <ImageIcon className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
                      <p className="text-ink dark:text-night-text mt-2 text-sm font-medium">
                        Bild auswählen
                      </p>
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-ink dark:text-night-text mb-2 block text-sm font-medium">
                    Titel (optional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Posaunenwerk Rheinland"
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2"
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Leer lassen für Standard-Titel
                  </p>
                </div>

                <div>
                  <label className="text-ink dark:text-night-text mb-2 block text-sm font-medium">
                    Untertitel (optional)
                  </label>
                  <input
                    type="text"
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    placeholder="Gemeinsam Musik machen, Glauben leben"
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2"
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
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
                    className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-4 py-2"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!selectedMediaId || createMutation.isPending}
                    className="bg-primary hover:bg-primary-dark text-ink min-h-11 px-4 py-2 font-semibold disabled:opacity-50"
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

        {showEditModal && editingItem && (
          <ScrollableModal>
            <ScrollableModalCard maxW="2xl">
              <ScrollableModalHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-ink dark:text-night-text text-xl font-semibold">
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
                    className="text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </ScrollableModalHeader>
              <ScrollableModalBody className="space-y-4">
                <div>
                  <label className="text-ink dark:text-night-text mb-2 block text-sm font-medium">
                    Bild *
                  </label>
                  {selectedMediaUrl ? (
                    <div className="relative">
                      <div className="bg-rule/25 dark:bg-night-raised relative h-48 w-full overflow-hidden">
                        <Image
                          src={selectedMediaUrl}
                          alt="Selected"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <button
                        onClick={() => setShowMediaPicker(true)}
                        className="dark:bg-night-raised dark:hover:bg-night-rule text-ink dark:text-night-text bg-rule/40 hover:bg-rule/60 mt-2 px-3 py-1 text-sm"
                      >
                        Bild ändern
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowMediaPicker(true)}
                      className="border-ink dark:border-night-text hover:bg-rule/25 dark:hover:bg-night-raised hover:border-primary w-full border-2 border-dashed p-8 text-center"
                    >
                      <ImageIcon className="text-dark dark:text-night-muted mx-auto h-12 w-12" />
                      <p className="text-ink dark:text-night-text mt-2 text-sm font-medium">
                        Bild auswählen
                      </p>
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-ink dark:text-night-text mb-2 block text-sm font-medium">
                    Titel (optional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Posaunenwerk Rheinland"
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2"
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Leer lassen für Standard-Titel
                  </p>
                </div>

                <div>
                  <label className="text-ink dark:text-night-text mb-2 block text-sm font-medium">
                    Untertitel (optional)
                  </label>
                  <input
                    type="text"
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    placeholder="Gemeinsam Musik machen, Glauben leben"
                    className="border-ink dark:border-night-text dark:bg-night dark:text-night-text bg-paper w-full border px-4 py-2"
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
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
                    className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-4 py-2"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={!selectedMediaId || updateMutation.isPending}
                    className="bg-primary hover:bg-primary-dark text-ink min-h-11 px-4 py-2 font-semibold disabled:opacity-50"
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

        {showDeleteModal && (
          <ScrollableModal>
            <ScrollableModalCard maxW="md">
              <ScrollableModalBody>
                <h2 className="text-ink dark:text-night-text mb-4 text-xl font-semibold">
                  Element löschen?
                </h2>
                <p className="text-dark dark:text-night-muted mb-6">
                  Möchtest du dieses Carousel-Element wirklich löschen? Diese
                  Aktion kann nicht rückgängig gemacht werden.
                </p>
              </ScrollableModalBody>
              <ScrollableModalFooter>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteModal(null)}
                    className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised min-h-11 border px-4 py-2"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => handleDelete(showDeleteModal)}
                    disabled={deleteMutation.isPending}
                    className="min-h-11 bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? "Wird gelöscht..." : "Löschen"}
                  </button>
                </div>
              </ScrollableModalFooter>
            </ScrollableModalCard>
          </ScrollableModal>
        )}

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
      </DashboardPage>
    </>
  );
}
