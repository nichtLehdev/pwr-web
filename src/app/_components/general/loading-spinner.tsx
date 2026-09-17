interface LoadingSpinnerProps {
  text: string;
}

export default function LoadingSpinner({ text }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        {/* Der Kreis bleibt rund — „keine Rundungen" gilt Kästen, nicht einem
            Ladezeiger. Die Farbe wird Tinte: Orange trug hier zu viel
            Aufmerksamkeit für einen Zustand, der Sekundenbruchteile dauert. */}
        <div className="border-ink dark:border-night-text mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
        <p className="text-dark dark:text-night-muted">{text}</p>
      </div>
    </div>
  );
}
