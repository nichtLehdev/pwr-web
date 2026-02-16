"use client";

/**
 * Mobile-first modal: overlay scrolls when content is tall, inner card is
 * max-h-[90vh] with scrollable body and sticky footer so actions stay visible.
 */
const Z_DEFAULT = "z-50";

export function ScrollableModal({
  children,
  onBackdropClick,
  className = "",
  zIndex = Z_DEFAULT,
}: {
  children: React.ReactNode;
  onBackdropClick?: () => void;
  className?: string;
  zIndex?: string;
}) {
  return (
    <div
      className={`fixed inset-0 ${zIndex} flex min-h-full items-start justify-center overflow-y-auto bg-black/50 p-4 py-6 sm:items-center sm:py-4 ${className}`}
      onClick={onBackdropClick}
    >
      {children}
    </div>
  );
}

/**
 * Card wrapper for ScrollableModal: use max-h-[90vh], flex flex-col,
 * and put scrollable content inside ScrollableModalBody and actions in ScrollableModalFooter.
 */
const MAX_W_CLASSES = {
  md: "max-w-md",
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
} as const;

export function ScrollableModalCard({
  children,
  className = "",
  onClick,
  maxW = "lg",
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  maxW?: keyof typeof MAX_W_CLASSES;
}) {
  return (
    <div
      className={`flex w-full ${MAX_W_CLASSES[maxW]} dark:bg-dark-surface flex-col rounded-lg bg-white shadow-xl sm:max-h-[90vh] ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    >
      {children}
    </div>
  );
}

export function ScrollableModalHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`shrink-0 p-6 pb-0 ${className}`}>{children}</div>;
}

export function ScrollableModalBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-h-0 flex-1 overflow-y-auto p-6 pt-4 ${className}`}>
      {children}
    </div>
  );
}

export function ScrollableModalFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`dark:border-dark-border shrink-0 border-t border-gray-200 p-4 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}
