"use client";

import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "@/lib/auth";
import { api } from "@/trpc/react";
import { usePermissions } from "@/lib/use-permissions";
import { DashboardPage } from "@/app/_components/dashboard";
import { Tag } from "@/app/_components/programmheft/tag";
import { SocialIcon } from "@/app/_components/ui/social-icon";
import { readSocialLinks } from "@/lib/social-links";
import { EditIcon, GlobeIcon, MusicIcon } from "lucide-react";
import { UserIcon } from "lucide-react";
import { ArrowLeftIcon } from "lucide-react";

export default function EnsembleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ensembleId = params.id as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const hasRedirected = useRef(false);

  const { data: profile, isLoading: profileLoading } =
    api.users.getMyProfile.useQuery(undefined, {
      enabled: !!session?.user,
    });

  const { hasDashboardAccess } = usePermissions();

  const { data: ensemble, isLoading: ensembleLoading } =
    api.ensembles.getById.useQuery(
      { id: ensembleId },
      { enabled: !!ensembleId && !!session?.user },
    );

  useEffect(() => {
    if (!sessionLoading && !session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push(`/login?callbackUrl=/dashboard/ensembles/${ensembleId}`);
    }
  }, [session, sessionLoading, router, ensembleId]);

  useEffect(() => {
    if (
      !profileLoading &&
      profile &&
      !hasDashboardAccess &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.push("/dashboard");
    }
  }, [profile, profileLoading, hasDashboardAccess, router]);

  if (sessionLoading || profileLoading || ensembleLoading) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="border-ink dark:border-night-text h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  if (!session || !profile || !hasDashboardAccess) {
    return null;
  }

  if (!ensemble) {
    return (
      <div className="bg-paper dark:bg-night flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-ink dark:text-night-text text-xl font-semibold">
            Ensemble nicht gefunden
          </h1>
          <Link
            href="/dashboard/ensembles"
            className="link-ink mt-4 inline-block"
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const socialLinks = readSocialLinks(ensemble.socials);

  return (
    <DashboardPage
      title={ensemble.name}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Ensembles", href: "/dashboard/ensembles" },
        { label: ensemble.name },
      ]}
      actions={
        <Link
          href={`/dashboard/ensembles/${ensembleId}/edit`}
          className="bg-ink text-paper hover:bg-primary hover:text-ink dark:bg-night-text dark:text-night dark:hover:bg-primary dark:hover:text-ink inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors"
        >
          <EditIcon className="h-4 w-4" />
          Bearbeiten
        </Link>
      }
      maxWidth="7xl"
    >
      {/* Ensemble Image and Status Badges */}
      <div className="mb-6 flex items-center gap-4">
        {ensemble.image?.url ? (
          <div className="border-rule dark:border-night-rule relative h-20 w-20 shrink-0 overflow-hidden border">
            <Image
              src={ensemble.image.url}
              alt={ensemble.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="bg-rule/25 text-dark dark:bg-night-raised dark:text-night-muted flex h-20 w-20 shrink-0 items-center justify-center">
            <MusicIcon className="h-10 w-10" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={ensemble.isActive ? "ink" : "inverse"}>
            {ensemble.isActive ? "Aktiv" : "Inaktiv"}
          </Tag>
          {ensemble.bezirk && (
            <span
              className="semi-condensed inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold text-white"
              style={{
                backgroundColor: `var(--color-district-${ensemble.bezirk.number})`,
              }}
            >
              {ensemble.bezirk.name}
            </span>
          )}
          {ensemble.internalId && (
            <Tag tone="inverse">Chor-Nr {ensemble.internalId}</Tag>
          )}
        </div>
      </div>

      {/* Description */}
      {ensemble.description && (
        <div className="border-rule dark:border-night-rule mb-6 border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-3 text-lg font-bold">
            Beschreibung
          </h2>
          <p className="text-dark dark:text-night-muted whitespace-pre-wrap">
            {ensemble.description}
          </p>
        </div>
      )}

      {/* Conductor & Representative */}
      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        {/* Conductor */}
        <div className="border-rule dark:border-night-rule border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Chorleitung
          </h2>
          {ensemble.conductorName ? (
            <div className="flex items-center gap-3">
              <div className="bg-rule/25 text-dark dark:bg-night-raised dark:text-night-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                <UserIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-ink dark:text-night-text font-medium">
                  {ensemble.conductorName}
                </p>
              </div>
            </div>
          ) : ensemble.conductor ? (
            <div className="flex items-center gap-3">
              {ensemble.conductor.profileImage ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={ensemble.conductor.profileImage.url}
                    alt={ensemble.conductor.displayName || "Chorleitung"}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="bg-rule/25 text-dark dark:bg-night-raised dark:text-night-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                  <UserIcon className="h-6 w-6" />
                </div>
              )}
              <div>
                <p className="text-ink dark:text-night-text font-medium">
                  {ensemble.conductor.displayName}
                </p>
                {ensemble.conductor.bio && (
                  <p className="text-dark dark:text-night-muted mt-1 line-clamp-2 text-sm">
                    {ensemble.conductor.bio}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-dark dark:text-night-muted italic">
              Keine Chorleitung zugewiesen
            </p>
          )}
          {(ensemble.conductorEmail || ensemble.conductorPhone) && (
            <dl className="border-rule dark:border-night-rule mt-4 space-y-1 border-t pt-3 text-sm">
              {ensemble.conductorEmail && (
                <div className="flex items-center gap-2">
                  <dt className="text-dark dark:text-night-muted w-16">
                    E-Mail
                  </dt>
                  <dd>
                    <a
                      href={`mailto:${ensemble.conductorEmail}`}
                      className="link-ink"
                    >
                      {ensemble.conductorEmail}
                    </a>
                  </dd>
                </div>
              )}
              {ensemble.conductorPhone && (
                <div className="flex items-center gap-2">
                  <dt className="text-dark dark:text-night-muted w-16">
                    Telefon
                  </dt>
                  <dd>
                    <a
                      href={`tel:${ensemble.conductorPhone}`}
                      className="link-ink"
                    >
                      {ensemble.conductorPhone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Representative */}
        <div className="border-rule dark:border-night-rule border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Ansprechpartner
          </h2>
          {ensemble.representativeName ? (
            <div className="flex items-center gap-3">
              <div className="bg-rule/25 text-dark dark:bg-night-raised dark:text-night-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                <UserIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-ink dark:text-night-text font-medium">
                  {ensemble.representativeName}
                </p>
              </div>
            </div>
          ) : ensemble.representative ? (
            <div className="flex items-center gap-3">
              {ensemble.representative.profileImage ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={ensemble.representative.profileImage.url}
                    alt={
                      ensemble.representative.displayName || "Ansprechpartner"
                    }
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="bg-rule/25 text-dark dark:bg-night-raised dark:text-night-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                  <UserIcon className="h-6 w-6" />
                </div>
              )}
              <div>
                <p className="text-ink dark:text-night-text font-medium">
                  {ensemble.representative.displayName}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-dark dark:text-night-muted italic">
              Kein Ansprechpartner zugewiesen
            </p>
          )}
          {(ensemble.representativeEmail || ensemble.representativePhone) && (
            <dl className="border-rule dark:border-night-rule mt-4 space-y-1 border-t pt-3 text-sm">
              {ensemble.representativeEmail && (
                <div className="flex items-center gap-2">
                  <dt className="text-dark dark:text-night-muted w-16">
                    E-Mail
                  </dt>
                  <dd>
                    <a
                      href={`mailto:${ensemble.representativeEmail}`}
                      className="link-ink"
                    >
                      {ensemble.representativeEmail}
                    </a>
                  </dd>
                </div>
              )}
              {ensemble.representativePhone && (
                <div className="flex items-center gap-2">
                  <dt className="text-dark dark:text-night-muted w-16">
                    Telefon
                  </dt>
                  <dd>
                    <a
                      href={`tel:${ensemble.representativePhone}`}
                      className="link-ink"
                    >
                      {ensemble.representativePhone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>

      {/* Rehearsal & Location */}
      <div className="border-rule dark:border-night-rule mb-6 border p-6">
        <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
          Probendetails
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          {/* Rehearsal Schedules */}
          <div className="sm:col-span-2">
            <dt className="text-dark dark:text-night-muted mb-2 text-sm">
              Probenzeiten
            </dt>
            <dd className="space-y-2">
              {ensemble.rehearsalSchedules &&
              ensemble.rehearsalSchedules.length > 0 ? (
                ensemble.rehearsalSchedules.map((schedule, index) => (
                  <div
                    key={index}
                    className="border-rule dark:border-night-rule flex items-center gap-3 border p-3"
                  >
                    <div className="flex-1">
                      <p className="text-ink dark:text-night-text font-medium">
                        <span>{schedule.day}</span>
                        {schedule.time && (
                          <>
                            {" "}
                            um <span>{schedule.time}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              ) : ensemble.rehearsalDay || ensemble.rehearsalTime ? (
                <div className="border-rule dark:border-night-rule flex items-center gap-3 border p-3">
                  <div className="flex-1">
                    {ensemble.rehearsalDay && (
                      <p className="text-ink dark:text-night-text font-medium">
                        <span>Tag:</span> {ensemble.rehearsalDay}
                      </p>
                    )}
                    {ensemble.rehearsalTime && (
                      <p className="text-ink dark:text-night-text mt-1 font-medium">
                        <span>Uhrzeit:</span> {ensemble.rehearsalTime}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-dark dark:text-night-muted italic">–</p>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-dark dark:text-night-muted text-sm">
              Probenort
            </dt>
            <dd className="text-ink dark:text-night-text font-medium">
              {ensemble.location ? (
                <span>
                  {ensemble.location.name}
                  {ensemble.location.street && `, ${ensemble.location.street}`}
                  {ensemble.location.city && `, ${ensemble.location.city}`}
                </span>
              ) : (
                "–"
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* Website & Social Media */}
      {(ensemble.contactWebsite || socialLinks.length > 0) && (
        <div className="border-rule dark:border-night-rule mb-6 border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Website & Social Media
          </h2>
          <div className="space-y-2">
            {ensemble.contactWebsite && (
              <a
                href={ensemble.contactWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="link-ink flex items-center gap-2"
              >
                <GlobeIcon className="h-4 w-4 shrink-0" />
                <span className="break-all">{ensemble.contactWebsite}</span>
              </a>
            )}
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link-ink flex items-center gap-2"
              >
                <SocialIcon type={social.type} className="h-4 w-4 shrink-0" />
                <span className="break-all">{social.label ?? social.url}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {ensemble.events && ensemble.events.length > 0 && (
        <div className="border-rule dark:border-night-rule mb-6 border p-6">
          <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
            Kommende Termine
          </h2>
          <div className="space-y-3">
            {ensemble.events.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="border-rule dark:border-night-rule flex items-center gap-3 border p-3"
              >
                {event.coverImage?.url ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden">
                    <Image
                      src={event.coverImage.url}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="text-primary-ink dark:text-primary shrink-0 text-center">
                    <div className="text-sm font-medium">
                      {new Date(event.eventDate).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </div>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-ink dark:text-night-text truncate font-medium">
                    {event.title}
                  </p>
                  {event.location && (
                    <p className="text-dark dark:text-night-muted truncate text-sm">
                      {event.location.name}, {event.location.city}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="border-rule dark:border-night-rule border p-6">
        <h2 className="condensed text-ink dark:text-night-text mb-4 text-lg font-bold">
          Details
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-dark dark:text-night-muted text-sm">
              Erstellt am
            </dt>
            <dd className="text-ink dark:text-night-text font-medium">
              {new Date(ensemble.createdAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-dark dark:text-night-muted text-sm">
              Zuletzt aktualisiert
            </dt>
            <dd className="text-ink dark:text-night-text font-medium">
              {new Date(ensemble.updatedAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/ensembles"
          className="border-ink dark:border-night-text text-ink dark:text-night-text hover:bg-rule/25 dark:hover:bg-night-raised inline-flex min-h-11 items-center gap-2 border px-4 py-2 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    </DashboardPage>
  );
}
