import { Suspense } from "react";
import TermineClient from "@/components/TermineClient";

export default function TerminePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <div className="bg-primary text-white py-6 md:py-12 lg:py-16">
            <div className="container mx-auto px-4">
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-4">
                Termine
              </h1>
            </div>
          </div>
          <div className="container mx-auto px-4 py-8 text-center text-gray-500">
            Lade Termine und Filter...
          </div>
        </div>
      }
    >
      <TermineClient />
    </Suspense>
  );
}
