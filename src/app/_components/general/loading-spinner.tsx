interface LoadingSpinnerProps {
  text: string;
}

export default function LoadingSpinner({ text }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        {/* Bewusst rund: „keine Rundungen“ gilt Kästen, nicht einem Ladezeiger. */}
        <div className="border-ink dark:border-night-text mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
        <p className="text-dark dark:text-night-muted">{text}</p>
      </div>
    </div>
  );
}
