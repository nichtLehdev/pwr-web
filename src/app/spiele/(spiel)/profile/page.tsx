import type { Metadata } from "next";
import { ProfilePage } from "./profile-page";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false },
};

export default function Page() {
  return <ProfilePage />;
}
