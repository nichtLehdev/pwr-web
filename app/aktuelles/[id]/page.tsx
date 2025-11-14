"use client";

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { use, useState, useEffect } from "react";
import { mockPosts } from "@/lib/mockData";
import { getDistrictColor } from "@/lib/districtColors";
import ImageLightbox from "@/components/ImageLightbox";
import "../../article-content.css";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function NewsDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const post = mockPosts.find((p) => p.id === parseInt(id));
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  // Add click handlers to images after content is rendered
  useEffect(() => {
    const images = document.querySelectorAll(".article-content img");
    images.forEach((img) => {
      img.addEventListener("click", () => {
        setLightboxImage({
          src: img.getAttribute("src") || "",
          alt: img.getAttribute("alt") || "",
        });
      });
    });

    return () => {
      images.forEach((img) => {
        img.removeEventListener("click", () => {});
      });
    };
  }, [post]);

  if (!post) {
    notFound();
  }

  const districtColor = getDistrictColor(post.districtInfo.name);
  const publishDate = new Date(post.publishedAt || post.createdAt);

  // Ähnliche Beiträge (gleiche Kategorie oder Bezirk)
  const relatedPosts = mockPosts
    .filter(
      (p) =>
        p.id !== post.id &&
        p.approved &&
        p.publishedAt &&
        (p.category === post.category ||
          p.districtInfo.name === post.districtInfo.name)
    )
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      {/* Header mit Bild */}
      {post.coverImage?.url ? (
        <section className="relative h-[40vh] md:h-[50vh] lg:h-[60vh]">
          <Image
            src={post.coverImage.url}
            alt={post.coverImage.alternativeText || post.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />

          {/* Breadcrumb & Meta */}
          <div className="absolute bottom-0 left-0 right-0 text-white">
            <div className="container mx-auto px-4 pb-6 md:pb-8">
              {/* Breadcrumb */}
              <nav className="text-sm mb-4 flex items-center gap-2">
                <Link href="/" className="hover:text-primary transition-colors">
                  Start
                </Link>
                <span>/</span>
                <Link
                  href="/aktuelles"
                  className="hover:text-primary transition-colors"
                >
                  Aktuelles
                </Link>
                <span>/</span>
                <span className="opacity-80">Beitrag</span>
              </nav>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ backgroundColor: districtColor }}
                >
                  {post.category}
                </span>
                <span className="text-sm">
                  {publishDate.toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                {post.districtInfo.name !== "All Districts" && (
                  <span
                    className="text-xs font-semibold text-white px-3 py-1 rounded-full border-2"
                    style={{ borderColor: districtColor }}
                  >
                    {post.districtInfo.name}
                  </span>
                )}
                {post.pinned && (
                  <span className="flex items-center gap-1 text-sm">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M16 12V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v8l-2 2v2h5v5l1 1 1-1v-5h5v-2l-2-2zm-6 0V4h4v8.13l1.07 1.07.6.6H8.34l.6-.6L10 12.13z" />
                    </svg>
                    Angepinnt
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold max-w-4xl">
                {post.title}
              </h1>
            </div>
          </div>
        </section>
      ) : (
        /* Header ohne Bild */
        <section className="bg-primary text-white py-8 md:py-12 lg:py-16">
          <div className="container mx-auto px-4">
            {/* Breadcrumb */}
            <nav className="text-sm mb-4 flex items-center gap-2 opacity-90">
              <Link href="/" className="hover:text-white transition-colors">
                Start
              </Link>
              <span>/</span>
              <Link
                href="/aktuelles"
                className="hover:text-white transition-colors"
              >
                Aktuelles
              </Link>
              <span>/</span>
              <span>Beitrag</span>
            </nav>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
                {post.category}
              </span>
              <span className="text-sm">
                {publishDate.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {post.districtInfo.name !== "All Districts" && (
                <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
                  {post.districtInfo.name}
                </span>
              )}
              {post.pinned && (
                <span className="flex items-center gap-1 text-sm">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M16 12V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v8l-2 2v2h5v5l1 1 1-1v-5h5v-2l-2-2zm-6 0V4h4v8.13l1.07 1.07.6.6H8.34l.6-.6L10 12.13z" />
                  </svg>
                  Angepinnt
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold max-w-4xl">
              {post.title}
            </h1>
          </div>
        </section>
      )}

      {/* Content */}
      <article className="py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Author Info (falls vorhanden) */}
            {post.author && (
              <div className="flex items-center gap-4 mb-8 pb-8 border-b">
                {post.author.profileImage?.url && (
                  <Image
                    src={post.author.profileImage.url}
                    alt={post.author.displayName}
                    width={60}
                    height={60}
                    className="rounded-full"
                  />
                )}
                <div>
                  <p className="font-semibold text-dark">
                    {post.author.displayName}
                  </p>
                  {post.author.bio && (
                    <p className="text-sm text-gray-600">{post.author.bio}</p>
                  )}
                </div>
              </div>
            )}

            {/* Excerpt */}
            {post.excerpt && (
              <div className="text-xl text-gray-700 mb-8 pb-8 border-b font-medium leading-relaxed">
                {post.excerpt}
              </div>
            )}

            {/* Main Content */}
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Share & Back */}
            <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <Link
                href="/aktuelles"
                className="inline-flex items-center text-primary hover:text-primary-dark font-semibold transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
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
                Zurück zur Übersicht
              </Link>

              {/* Share Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 mr-2">Teilen:</span>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Auf Facebook teilen"
                >
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Auf Twitter teilen"
                >
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </button>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Per E-Mail teilen"
                >
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Ähnliche Beiträge */}
      {relatedPosts.length > 0 && (
        <section className="py-12 bg-background-secondary">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-dark mb-6">
              Ähnliche Beiträge
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => {
                const relatedDistrictColor = getDistrictColor(
                  relatedPost.districtInfo.name
                );
                return (
                  <article
                    key={relatedPost.id}
                    className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow overflow-hidden border-l-4"
                    style={{ borderLeftColor: relatedDistrictColor }}
                  >
                    {relatedPost.coverImage?.url && (
                      <div className="relative w-full h-48 bg-gray-200">
                        <Image
                          src={relatedPost.coverImage.url}
                          alt={relatedPost.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-primary">
                          {relatedPost.category}
                        </span>
                        <time className="text-xs text-gray-500">
                          {new Date(
                            relatedPost.publishedAt || relatedPost.createdAt
                          ).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </time>
                      </div>
                      <h3 className="text-lg font-bold text-dark mb-2 line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      {relatedPost.excerpt && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {relatedPost.excerpt}
                        </p>
                      )}
                      <Link
                        href={`/aktuelles/${relatedPost.id}`}
                        className="inline-flex items-center text-primary hover:text-primary-dark font-semibold text-sm"
                      >
                        Weiterlesen
                        <svg
                          className="w-4 h-4 ml-1"
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
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}
