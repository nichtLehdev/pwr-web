import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative bg-primary h-[50vh] md:h-[60vh] lg:h-[70vh] flex items-center justify-center">
      {/* Gradient Overlay für bessere Lesbarkeit */}
      <div className="absolute inset-0 bg-linear-to-b from-black/30 to-black/50" />

      <div className="container relative z-10 text-center text-white px-4">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6">
          Posaunenwerk Rheinland
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl mb-6 md:mb-8 max-w-2xl mx-auto">
          Gemeinsam Musik machen, Glauben leben
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/mitmachen"
            className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark shadow-lg"
          >
            Jetzt mitmachen
          </Link>
          <Link
            href="/termine"
            className="px-6 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 shadow-lg"
          >
            Termine ansehen
          </Link>
        </div>
      </div>
    </section>
  );
}
