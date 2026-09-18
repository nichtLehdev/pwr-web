"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/app/_components/ui";
import {
  ScrollableModal,
  ScrollableModalCard,
  ScrollableModalHeader,
  ScrollableModalBody,
  ScrollableModalFooter,
} from "@/app/_components/ui/scrollable-modal";

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
    let clientX: number;
    let clientY: number;

    if ("touches" in e) {
      const touchEvent = e as React.TouchEvent;
      if (touchEvent.touches.length > 0) {
        clientX = touchEvent.touches[0]?.clientX ?? 0;
        clientY = touchEvent.touches[0]?.clientY ?? 0;
      } else {
        return;
      }
    } else {
      const mouseEvent = e as React.MouseEvent;
      clientX = mouseEvent.clientX;
      clientY = mouseEvent.clientY;
    }

    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;

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
    <ScrollableModal className="bg-black/80">
      <ScrollableModalCard maxW="4xl">
        <ScrollableModalHeader className="border-rule dark:border-night-rule border-b pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-ink dark:text-night-text text-lg font-semibold">
              Bildposition anpassen
            </h2>
            <button
              onClick={onClose}
              className="text-dark hover:bg-rule/60 hover:text-ink dark:text-night-muted dark:hover:bg-night-rule dark:hover:text-night-text p-2 transition-colors"
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
        </ScrollableModalHeader>

        <ScrollableModalBody className="p-0">
          <div className="border-rule dark:border-night-rule border-b bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Klicke oder ziehe auf das Bild, um den Fokuspunkt zu setzen. Der
              Fokuspunkt bestimmt, welcher Teil des Bildes beim Zuschneiden im
              Vordergrund steht.
            </p>
          </div>

          <div className="p-6">
            <div
              ref={containerRef}
              className="border-rule dark:border-night-rule bg-rule/25 dark:bg-night-raised relative aspect-video w-full cursor-crosshair overflow-hidden border-2 select-none"
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
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-0.5 bg-white shadow-lg" />
                    <div className="h-0.5 w-8 bg-white shadow-lg" />
                  </div>
                  <div className="h-12 w-12 rounded-full border-4 border-white shadow-lg" />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <div className="text-dark dark:text-night-muted">
                X:{" "}
                <span className="font-mono font-semibold">
                  {currentX.toFixed(1)}%
                </span>
              </div>
              <div className="text-dark dark:text-night-muted">
                Y:{" "}
                <span className="font-mono font-semibold">
                  {currentY.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </ScrollableModalBody>

        <ScrollableModalFooter>
          <div className="flex items-center justify-end gap-3">
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
        </ScrollableModalFooter>
      </ScrollableModalCard>
    </ScrollableModal>
  );
}
