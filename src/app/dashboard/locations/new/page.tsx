"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { useToast } from "@/app/_components/ui/toast";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { DashboardPage } from "@/app/_components/dashboard";
import { getErrorMessage } from "@/lib/utils";
import {
  Button,
  Input,
  Label,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  AlertDescription,
} from "@/app/_components/ui";

export default function NewLocationPage() {
  const router = useRouter();
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

  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = api.useUtils();

  const createMutation = api.locations.create.useMutation({
    onSuccess: async (data) => {
      await utils.locations.getAll.invalidate();
      toast.success("Standort erfolgreich erstellt");
      router.push(`/dashboard/locations/${data.id}`);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
      setIsSubmitting(false);
      toast.error("Fehler beim Erstellen: " + err.message);
    },
  });

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/login?callbackUrl=/dashboard/locations/new");
    }
  }, [session, sessionLoading, router]);

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

    createMutation.mutate({
      name: name.trim() || undefined,
      street: street.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      city: city.trim(),
      additionalInfo: additionalInfo.trim() || undefined,
      latitude: latitude.trim() ? parseFloat(latitude.trim()) : undefined,
      longitude: longitude.trim() ? parseFloat(longitude.trim()) : undefined,
    });
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="dark:bg-dark-background flex min-h-screen items-center justify-center bg-gray-50">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !canManageLocations) {
    return null;
  }

  return (
    <DashboardPage
      title="Neuer Standort"
      description="Erstelle einen neuen Standort"
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Standorte", href: "/dashboard/locations" },
        { label: "Neu" },
      ]}
      maxWidth="7xl"
    >
      {/* Error */}
      {error && (
        <Alert variant="error" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Grundinformationen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
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
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Optional: Name des Standorts
                  </p>
                </div>

                {/* City */}
                <div>
                  <Label required>Stadt</Label>
                  <Input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    maxLength={100}
                    placeholder="z.B. Köln"
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
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Optional: Weitere Hinweise zum Standort
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coordinates */}
          <Card>
            <CardHeader>
              <CardTitle>Koordinaten (für Kartenanzeige)</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
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
                  <p className="dark:text-dark-muted mt-1 text-xs text-gray-500">
                    Optional: Für die Anzeige auf einer Karte
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              isLoading={isSubmitting || createMutation.isPending}
            >
              Standort erstellen
            </Button>
            <Link
              href="/dashboard/locations"
              className="dark:border-dark-border dark:text-dark-text inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </Link>
          </div>
        </div>
      </form>
    </DashboardPage>
  );
}
