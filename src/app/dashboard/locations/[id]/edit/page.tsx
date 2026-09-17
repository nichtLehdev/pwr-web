"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import {
  AddressAutocomplete,
  DashboardPage,
  DashboardSectionedFormLayout,
  DashboardFormZoneHeader,
  DashboardFormBlock,
  DEFAULT_LOCATION_COUNTRY,
  type DashboardSectionNavItem,
} from "@/app/_components/dashboard";
import { getErrorMessage } from "@/lib/utils";
import { Button, Input, Label, Textarea } from "@/app/_components/ui";

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

  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManageLocations = hasPermission(
    PERMISSIONS.ORGANIZATION_MANAGE_LOCATIONS,
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
  const [country, setCountry] = useState(DEFAULT_LOCATION_COUNTRY);
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
      setCountry(location.country || DEFAULT_LOCATION_COUNTRY);
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
      !permissionsLoading &&
      !canManageLocations &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, permissionsLoading, canManageLocations, router]);

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
      country: country.trim() || DEFAULT_LOCATION_COUNTRY,
      additionalInfo: additionalInfo.trim() || undefined,
      latitude: latitude.trim() ? parseFloat(latitude.trim()) : undefined,
      longitude: longitude.trim() ? parseFloat(longitude.trim()) : undefined,
    });
  };

  if (sessionLoading || profileLoading || locationLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageLocations) {
    return null;
  }

  if (!location) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Standort nicht gefunden
          </h1>
          <Link
            href="/dashboard/locations"
            className="link-ink mt-4 inline-block"
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
        <div className="mb-6 border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
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
                {/* Address search — same component as the new-location form,
                    here it overwrites the fields of an existing standort. */}
                <AddressAutocomplete
                  hint="Vorschlag auswählen, um die Felder unten zu überschreiben"
                  onSelect={(suggestion) => {
                    if (suggestion.name) setName(suggestion.name);
                    if (suggestion.street) setStreet(suggestion.street);
                    if (suggestion.zipCode) setZipCode(suggestion.zipCode);
                    if (suggestion.city) setCity(suggestion.city);
                    if (suggestion.country) setCountry(suggestion.country);
                    setLatitude(String(suggestion.latitude));
                    setLongitude(String(suggestion.longitude));
                  }}
                />

                {/* Name */}
                <div>
                  <Label>Name</Label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={200}
                    placeholder="z.B. Gemeindehaus Köln-Deutz"
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Optional: Name des Standorts
                  </p>
                </div>

                {/* City */}
                <div>
                  <Label>Stadt</Label>
                  <Input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={100}
                    placeholder="z.B. Köln"
                  />
                </div>

                {/* Country */}
                <div>
                  <Label>Land</Label>
                  <Input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    maxLength={100}
                    autoComplete="country-name"
                    placeholder={DEFAULT_LOCATION_COUNTRY}
                  />
                </div>

                {/* Street */}
                <div>
                  <Label>Straße</Label>
                  <Input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    maxLength={200}
                    placeholder="z.B. Musterstraße 123"
                  />
                </div>

                {/* Zip Code */}
                <div>
                  <Label>Postleitzahl</Label>
                  <Input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    maxLength={20}
                    placeholder="z.B. 50679"
                  />
                </div>

                {/* Additional Info */}
                <div>
                  <Label>Zusätzliche Informationen</Label>
                  <Textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="z.B. Eingang über den Hinterhof"
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Optional: Weitere Hinweise zum Standort
                  </p>
                </div>
              </div>
            </DashboardFormBlock>
          </div>

          <div
            id="location-edit-koordinaten"
            className="border-rule dark:border-night-rule dashboard-form-scroll-anchor border-t pt-14"
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
                  <Label>Breitengrad (Latitude)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="z.B. 50.9375"
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Optional: Für die Anzeige auf einer Karte
                  </p>
                </div>

                {/* Longitude */}
                <div>
                  <Label>Längengrad (Longitude)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="z.B. 6.9603"
                  />
                  <p className="text-dark dark:text-night-muted mt-1 text-xs">
                    Optional: Für die Anzeige auf einer Karte
                  </p>
                </div>
              </div>
            </DashboardFormBlock>
          </div>

          {/* Actions */}
          <div className="border-rule dark:border-night-rule mt-16 flex flex-col gap-3 border-t pt-10 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || updateMutation.isPending}
              isLoading={isSubmitting || updateMutation.isPending}
            >
              Änderungen speichern
            </Button>
            <Link
              href={`/dashboard/locations/${locationId}`}
              className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center justify-center gap-2 border px-4 py-2.5 transition-colors"
            >
              Abbrechen
            </Link>
          </div>
        </DashboardSectionedFormLayout>
      </form>
    </DashboardPage>
  );
}
