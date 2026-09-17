"use client";

import { signOut } from "@/lib/auth";
import type { Session } from "@/server/better-auth/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/ui";
import { useToast } from "../ui/toast";

export function UserMenu({ session }: { session: Session }) {
  const router = useRouter();
  const toast = useToast();

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
        onError: (error) => {
          toast.error(error.error.message);
        },
      },
    });
  };

  if (!session?.user) {
    return (
      <div className="flex items-center gap-4">
        <Link
          href="/login"
          className="text-dark hover:text-ink dark:text-night-muted dark:hover:text-night-text text-sm font-medium transition-colors"
        >
          Anmelden
        </Link>
        <Link
          href="/register"
          className="semi-condensed bg-ink text-paper hover:bg-dark dark:bg-night-text dark:text-night dark:hover:bg-night-muted inline-flex h-10 items-center justify-center px-4 text-sm font-semibold transition-colors"
        >
          Registrieren
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-ink dark:text-night-text text-sm">
        {session.user.name || session.user.email}
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => void handleSignOut()}
      >
        Abmelden
      </Button>
    </div>
  );
}
