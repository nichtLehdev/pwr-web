"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/utils";
import { DashboardPage } from "@/app/_components/dashboard";
import MediaPickerModal from "@/app/_components/editor/media-picker-modal";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Textarea,
} from "@/app/_components/ui";

export default function EditHistoryEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageOrganization = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_HISTORY,
  );

  const { data: historyEvent, isLoading: eventLoading } =
    api.organization.getHistoryEvent.useQuery(
      { id: eventId },
      { enabled: !!eventId && !!session?.user },
    );

  const [year, setYear] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (historyEvent && !initializedRef.current) {
      initializedRef.current = true;
      startTransition(() => {
        setYear(historyEvent.year.toString());
        setTitle(historyEvent.title);
        setDescription(historyEvent.description);
        setCategory(historyEvent.category || "");
        setImageId(historyEvent.imageId);
        setImageUrl(historyEvent.image?.url ?? "");
        setImageAlt(historyEvent.imageAlt || "");
        setSortOrder(historyEvent.sortOrder.toString());
      });
    }
  }, [historyEvent]);

  const utils = api.useUtils();

  const updateMutation = api.organization.updateHistoryEvent.useMutation({
    onSuccess: async () => {
      await utils.organization.getHistory.invalidate();
      await utils.organization.getHistoryEvent.invalidate({ id: eventId });
      toast.success("Ereignis erfolgreich aktualisiert");
      router.push(`/dashboard/history-timeline/${eventId}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
      toast.error("Fehler beim Aktualisieren: " + err.message);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(
        `/login?callbackUrl=/dashboard/history-timeline/${eventId}/edit`,
      );
    }
  }, [session, sessionLoading, router, eventId]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !permissionsLoading &&
      !canManageOrganization &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [
    profile,
    profileLoading,
    permissionsLoading,
    canManageOrganization,
    router,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    updateMutation.mutate({
      id: eventId,
      year: parseInt(year, 10),
      title: title.trim(),
      description: description.trim(),
      category: category
        ? (category as
            | "FOUNDING"
            | "MILESTONE"
            | "EXPANSION"
            | "MODERNIZATION"
            | "PARTNERSHIP")
        : null,
      imageId: imageId || null,
      imageAlt: imageAlt.trim() || undefined,
      sortOrder: parseInt(sortOrder, 10) || 0,
    });
  };

  const handleMediaSelect = (url: string, alt: string, mediaId?: string) => {
    setImageUrl(url);
    setImageId(mediaId ?? null);
    if (!imageAlt && alt) {
      setImageAlt(alt);
    }
    setShowMediaPicker(false);
  };

  if (sessionLoading || profileLoading || eventLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageOrganization) {
    return null;
  }

  if (!historyEvent) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Ereignis nicht gefunden
          </h1>
          <Link
            href="/dashboard/history-timeline"
            className="link-ink mt-4 inline-block"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardPage
        title="Ereignis bearbeiten"
        description="Bearbeite die Informationen des Ereignisses"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Historie-Timeline", href: "/dashboard/history-timeline" },
          {
            label: historyEvent.title,
            href: `/dashboard/history-timeline/${eventId}`,
          },
          { label: "Bearbeiten" },
        ]}
        maxWidth="7xl"
      >
        {/* Error */}
        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Grundinformationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Year */}
                <div>
                  <Label required>Jahr</Label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    required
                    min="1900"
                    max="2100"
                    placeholder="z.B. 1995"
                  />
                </div>

                {/* Title */}
                <div>
                  <Label required>Titel</Label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={255}
                    placeholder="z.B. Gründung des Posaunenwerks"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label required>Beschreibung</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={6}
                    maxLength={5000}
                    placeholder="Beschreibe das Ereignis..."
                  />
                </div>

                {/* Category */}
                <div>
                  <Label>Kategorie</Label>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Keine Kategorie</option>
                    <option value="FOUNDING">Gründung</option>
                    <option value="MILESTONE">Meilenstein</option>
                    <option value="EXPANSION">Erweiterung</option>
                    <option value="MODERNIZATION">Modernisierung</option>
                    <option value="PARTNERSHIP">Partnerschaft</option>
                  </Select>
                </div>

                {/* Sort Order */}
                <div>
                  <Label>Sortierreihenfolge</Label>
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    min="0"
                    placeholder="0"
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Niedrigere Zahlen erscheinen zuerst bei gleichem Jahr
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Image */}
            <Card>
              <CardHeader>
                <CardTitle>Bild</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Bild</Label>
                  {imageUrl ? (
                    <div className="flex items-start gap-4">
                      <div className="border-rule dark:border-night-rule relative h-24 w-24 overflow-hidden border">
                        <Image
                          src={imageUrl}
                          alt={imageAlt || title || "Ereignis Bild"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-2">
                        <Button
                          type="button"
                          onClick={() => setShowMediaPicker(true)}
                          variant="outline"
                          size="sm"
                        >
                          Ändern
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            setImageUrl("");
                            setImageId(null);
                            setImageAlt("");
                          }}
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Entfernen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="border-ink dark:border-night-text hover:border-primary-ink dark:hover:bg-night-raised text-dark dark:text-night-muted hover:bg-rule/25 flex h-24 w-full items-center justify-center border-2 border-dashed transition-colors"
                    >
                      <div className="text-center">
                        <svg
                          className="mx-auto h-8 w-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="mt-1 block text-sm">
                          Bild auswählen
                        </span>
                      </div>
                    </button>
                  )}
                </div>

                {/* Image Alt */}
                {imageUrl && (
                  <div>
                    <Label>Alt-Text für Bild</Label>
                    <Input
                      type="text"
                      value={imageAlt}
                      onChange={(e) => setImageAlt(e.target.value)}
                      maxLength={255}
                      placeholder="Beschreibung des Bildes für Barrierefreiheit"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || updateMutation.isPending}
                isLoading={isSubmitting || updateMutation.isPending}
              >
                Änderungen speichern
              </Button>
              <Link
                href={`/dashboard/history-timeline/${eventId}`}
                className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center justify-center gap-2 border px-4 py-2.5 transition-colors"
              >
                Abbrechen
              </Link>
            </div>
          </div>
        </form>
      </DashboardPage>
      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaSelect}
      />
    </>
  );
}
