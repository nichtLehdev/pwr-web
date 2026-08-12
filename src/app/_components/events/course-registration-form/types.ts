import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import type { User } from "~/generated/prisma/client";

export type CourseWithRelations = RouterOutputs["courses"]["getById"];
export type RegistrationData = Omit<
  RouterInputs["registrations"]["create"],
  "courseId" | "totalPrice"
>;

/**
 * Extra decisions only the course team makes when it records a registration
 * itself (paper form, phone call, late sign-up) instead of a registrant
 * filling in the public form.
 */
export interface StaffRegistrationOptions {
  /** "AUTO" leaves the choice to the server: confirmed while seats are free. */
  registrationStatus: "AUTO" | "CONFIRMED" | "WAITLIST";
  /** Fee already collected — e.g. cash handed over on the spot. */
  markAsPaid: boolean;
  sendConfirmationEmail: boolean;
  /** Required to confirm a registration beyond the course capacity. */
  allowOverbooking: boolean;
}

export interface CourseRegistrationFormProps {
  course: CourseWithRelations;
  onClose: () => void;
  onSuccess: () => void;
  isWaitlist: boolean;
  currentUser?: User | null;
  /** Full page route vs fixed overlay modal */
  variant?: "modal" | "page";
  /**
   * Dashboard mode: the course team enters a registration on someone's behalf.
   * Uses the staff mutation (no deadline gate), asks for status/payment/mail
   * decisions instead of terms acceptance, and treats the address as optional.
   */
  staffMode?: boolean;
  /**
   * Free seats left in the course, used in staff mode to ask for an
   * overbooking consent as soon as the entered participants no longer fit —
   * not only when the course is already completely full.
   */
  availableSlots?: number;
}

export type Step = 1 | 2 | 3;
