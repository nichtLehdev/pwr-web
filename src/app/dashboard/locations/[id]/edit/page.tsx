"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import {
  DashboardPage,
  DashboardSectionedFormLayout,
  DashboardFormZoneHeader,
  DashboardFormBlock,
  type DashboardSectionNavItem,
} from "@/app/_components/dashboard";
import { getErrorMessage } from "@/lib/utils";

const LOCATION_EDIT_NAV_ITEMS: DashboardSectionNavItem[] = [
  { href: "#location-edit-grunddaten", label: "Grunddaten" },
  { href: "#location-edit-koordinaten", label: "Koordinaten" },
];

export default function EditLocationPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const toast = useToast();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { data: canManageLocations } = api.permissions.canManage.useQuery(
    undefined,
    { enabled: !!session?.user },
  );

  const { data: location, isLoading: locationLoading } =
    api.locations.getById.useQuery(
      { id: locationId },
      { enabled: !!locationId && !!session?.user },
    );

  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (location && !initialized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(location.name || "");
      setStreet(location.street || "");
      setZipCode(location.zipCode || "");
      setCity(location.city);
      setAdditionalInfo(location.additionalInfo || "");
      setLatitude(location.latitude?.toString() || "");
      setLongitude(location.longitude?.toString() || "");
      setInitialized(true);
    }
  }, [location, initialized]);

  const utils = api.useUtils();

  const updateMutation = api.locations.update.useMutation({
    onSuccess: async () => {
      await utils.locations.getAll.invalidate();
      await utils.locations.getById.invalidate({ id: locationId });
      toast.success("Standort erfolgreich aktualisiert");
      router.push(`/dashboard/locations/${locationId}`);
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
      router.push(`/login?callbackUrl=/dashboard/locations/${locationId}/edit`);
    }
  }, [session, sessionLoading, router, locationId]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !canManageLocations &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, canManageLocations, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    updateMutation.mutate({
      id: locationId,
      name: name.trim() || undefined,
      street: street.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      city: city.trim() || undefined,
      additionalInfo: additionalInfo.trim() || undefined,
      latitude: latitude.trim() ? parseFloat(latitude.trim()) : undefined,
      longitude: longitude.trim() ? parseFloat(longitude.trim()) : undefined,
    });
  };

  if (sessionLoading || profileLoading || locationLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageLocations) {
    return null;
  }

  if (!location) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="dark:text-dark-text text-xl font-semibold text-gray-900">
            Standort nicht gefunden
          </h1>
          <Link
            href="/dashboard/locations"
            className="text-primary mt-4 inline-block hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DashboardPage
      title="Standort bearbeiten"
      description="Bearbeite die Informationen des Standorts"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Standorte", href: "/dashboard/locations" },
        {
          label: location.name || "Unbenannter Standort",
          href: `/dashboard/locations/${locationId}`,
        },
        { label: "Bearbeiten" },
      ]}
      maxWidth="7xl"
    >
      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <DashboardSectionedFormLayout
          navItems={LOCATION_EDIT_NAV_ITEMS}
          contentClassName="space-y-14 sm:space-y-16"
        >
          <div
            id="location-edit-grunddaten"
            className="dashboard-form-scroll-anchor"
          >
            <DashboardFormZoneHeader
              step={1}
              title="Grunddaten"
              description="Name, Adresse und optionale Hinweise für diesen Veranstaltungsstandort."
            />
            <DashboardFormBlock title="Adresse">
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={200}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Gemeindehaus Köln-Deutz"
                  />
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Optional: Name des Standorts
                  </p>
                </div>

                {/* City */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Stadt
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={100}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Köln"
                  />
                </div>

                {/* Street */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Straße
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    maxLength={200}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Musterstraße 123"
                  />
                </div>

                {/* Zip Code */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Postleitzahl
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    maxLength={20}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. 50679"
                  />
                </div>

                {/* Additional Info */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Zusätzliche Informationen
                  </label>
                  <textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Eingang über den Hinterhof"
                  />
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Optional: Weitere Hinweise zum Standort
                  </p>
                </div>
              </div>
            </DashboardFormBlock>
          </div>

          <div
            id="location-edit-koordinaten"
            className="dark:border-dark-border dashboard-form-scroll-anchor border-t border-gray-200/80 pt-14"
          >
            <DashboardFormZoneHeader
              step={2}
              title="Koordinaten"
              description="Optional: geografische Punkte für Karten auf der öffentlichen Seite."
            />
            <DashboardFormBlock title="Kartenposition">
              <div className="space-y-6">
                {/* Latitude */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Breitengrad (Latitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. 50.9375"
                  />
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Optional: Für die Anzeige auf einer Karte
                  </p>
                </div>

                {/* Longitude */}
                <div>
                  <label className="dark:text-dark-text mb-1 block text-sm font-medium text-gray-700">
                    Längengrad (Longitude)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="dark:border-dark-border dark:bg-dark-background dark:text-dark-text w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. 6.9603"
                  />
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Optional: Für die Anzeige auf einer Karte
                  </p>
                </div>
              </div>
            </DashboardFormBlock>
          </div>

          {/* Actions */}
          <div className="dark:border-dark-border mt-16 flex flex-col gap-3 border-t border-gray-200/80 pt-10 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={isSubmitting || updateMutation.isPending}
              className="bg-primary hover:bg-primary/90 rounded-lg px-6 py-2.5 font-medium text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting || updateMutation.isPending
                ? "Wird gespeichert..."
                : "Änderungen speichern"}
            </button>
            <Link
              href={`/dashboard/locations/${locationId}`}
              className="dark:border-dark-border dark:text-dark-text inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
          </div>
        </DashboardSectionedFormLayout>
      </form>
    </DashboardPage>
  );
}
