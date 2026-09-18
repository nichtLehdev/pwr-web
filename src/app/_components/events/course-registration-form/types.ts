import type { RouterInputs, RouterOutputs } from "@/trpc/react";
import type { User } from "~/generated/prisma/client";

export type CourseWithRelations = RouterOutputs["courses"]["getById"];
export type RegistrationData = Omit<
  RouterInputs["registrations"]["create"],
  "courseId" | "totalPrice"
>;

/** One entry of the participant list while the form is being filled in. */
export type ParticipantDraft = RegistrationData["participants"][number];

/**
 * Structural rather than tied to one router type: `ParticipantCard` and `ParticipantEditor`
 * serve both the registration form (unsaved) and the edit page (by database id).
 */
export interface ParticipantFields {
  firstName: string;
  lastName: string;
  birthDate: Date | string | null;
  city: string;
  instrument?: string | null;
  priceOptionId?: string | null;
  /** Legacy label, for registrations saved before ids were stored. */
  priceOption?: string | null;
  customFields?: unknown;
}

/** Extra decisions only the course team makes when it records a registration itself. */
export interface StaffRegistrationOptions {
  /**
   * "AUTO": server decides, confirmed while seats are free. "SPLIT": free seats are
   * confirmed, the rest goes on the waiting list as a linked registration.
   */
  registrationStatus: "AUTO" | "CONFIRMED" | "WAITLIST" | "SPLIT";
  sendConfirmationEmail: boolean;
  /** Required to confirm a registration beyond the course capacity. */
  allowOverbooking: boolean;
  /** Down payment already received (e.g. paper form with transfer slip). */
  downPaymentAlreadyPaid: boolean;
}

export interface CourseRegistrationFormProps {
  course: CourseWithRelations;
  onClose: () => void;
  onSuccess: () => void;
  isWaitlist: boolean;
  currentUser?: User | null;
  /**
   * Dashboard mode: staff registers on someone's behalf via the staff mutation (no deadline
   * gate), with status/payment/mail decisions instead of terms acceptance; address optional.
   */
  staffMode?: boolean;
  /** Free seats left; step 3 warns as soon as the entered participants no longer fit. */
  availableSlots?: number;
  /** Free seats per price option (by id), as `getAvailableSlots` reports them. */
  capacityByPriceOption?: Record<string, number> | null;
}

export type Step = 1 | 2 | 3;
