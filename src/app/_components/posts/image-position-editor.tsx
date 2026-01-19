"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/app/_components/ui";

interface ImagePositionEditorProps {
  imageUrl: string;
  positionX: number | null | undefined;
  positionY: number | null | undefined;
  onPositionChange: (x: number, y: number) => void;
  onClose: () => void;
}

export default function ImagePositionEditor({
  imageUrl,
  positionX,
  positionY,
  onPositionChange,
  onClose,
}: ImagePositionEditorProps) {
  const [currentX, setCurrentX] = useState(positionX ?? 50);
  const [currentY, setCurrentY] = useState(positionY ?? 50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentX(positionX ?? 50);
    setCurrentY(positionY ?? 50);
  }, [positionX, positionY]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updatePosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      updatePosition(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updatePosition = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x =
      ((e.clientX || (e as React.TouchEvent).touches[0]?.clientX || 0) -
        rect.left) /
      rect.width;
    const y =
      ((e.clientY || (e as React.TouchEvent).touches[0]?.clientY || 0) -
        rect.top) /
      rect.height;

    const newX = Math.max(0, Math.min(100, x * 100));
    const newY = Math.max(0, Math.min(100, y * 100));

    setCurrentX(newX);
    setCurrentY(newY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updatePosition(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      updatePosition(e);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    onPositionChange(currentX, currentY);
    onClose();
  };

  const handleReset = () => {
    setCurrentX(50);
    setCurrentY(50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="dark:bg-dark-surface max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="dark:border-dark-border flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="dark:text-dark-text text-lg font-semibold text-gray-900">
            Bildposition anpassen
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Schließen"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <div className="dark:border-dark-border border-b border-gray-200 bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Klicke oder ziehe auf das Bild, um den Fokuspunkt zu setzen. Der
            Fokuspunkt bestimmt, welcher Teil des Bildes beim Zuschneiden im
            Vordergrund steht.
          </p>
        </div>

        {/* Image Container */}
        <div className="p-6">
          <div
            ref={containerRef}
            className="dark:border-dark-border relative aspect-video w-full cursor-crosshair overflow-hidden rounded-lg border-2 border-gray-300 bg-gray-100 select-none dark:bg-gray-800"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <Image
              src={imageUrl}
              alt="Bildposition bearbeiten"
              fill
              className="object-cover"
              style={{
                objectPosition: `${currentX}% ${currentY}%`,
              }}
            />
            {/* Focal Point Indicator */}
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transform"
              style={{
                left: `${currentX}%`,
                top: `${currentY}%`,
              }}
            >
              <div className="relative">
                {/* Crosshair */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-0.5 bg-white shadow-lg" />
                  <div className="h-0.5 w-8 bg-white shadow-lg" />
                </div>
                {/* Circle */}
                <div className="h-12 w-12 rounded-full border-4 border-white shadow-lg" />
              </div>
            </div>
          </div>

          {/* Position Display */}
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <div className="text-gray-600 dark:text-gray-400">
              X:{" "}
              <span className="font-mono font-semibold">
                {currentX.toFixed(1)}%
              </span>
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              Y:{" "}
              <span className="font-mono font-semibold">
                {currentY.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="dark:border-dark-border flex items-center justify-end gap-3 border-t border-gray-200 p-4">
          <Button type="button" variant="outline" onClick={handleReset}>
            Zurücksetzen
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" onClick={handleSave}>
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}
