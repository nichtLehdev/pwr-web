"use client";

import { signOut } from "@/lib/auth";
import type { Session } from "@/server/better-auth/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function UserMenu({ session }: { session: Session }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  if (!session?.user) {
    return (
      <div className="flex items-center gap-4">
        <Link
          href="/login"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Anmelden
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Registrieren
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-700">
        {session.user.name || session.user.email}
      </span>
      <button
        onClick={handleSignOut}
        className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
      >
        Abmelden
      </button>
    </div>
  );
}
