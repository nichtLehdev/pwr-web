import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import type { User } from "~/generated/prisma/client";

export type CourseWithRelations = RouterOutputs["courses"]["getById"];
export type RegistrationData = Omit<
  RouterInputs["registrations"]["create"],
  "courseId" | "totalPrice"
>;

export interface CourseRegistrationFormProps {
  course: CourseWithRelations;
  onClose: () => void;
  onSuccess: () => void;
  isWaitlist: boolean;
  currentUser?: User | null;
  /** Full page route vs fixed overlay modal */
  variant?: "modal" | "page";
}

export type Step = 1 | 2 | 3;
