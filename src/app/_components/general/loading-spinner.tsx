interface LoadingSpinnerProps {
  text: string;
}

export default function LoadingSpinner({ text }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
        <p className="text-gray-600">{text}</p>
      </div>
    </div>
  );
}
