/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared Components
export interface Location {
  venue: string;
  street?: string;
  zipCode?: string;
  city: string;
  additionalInfo?: string;
  latitude?: number;
  longitude?: number;
}

export interface DistrictInfo {
  name: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
}

export interface PriceOption {
  price: number;
  label: string;
  description?: string;
}

export interface RegistrationField {
  fieldName: string;
  fieldType: "Text" | "Number" | "Select" | "Checkbox" | "TextArea";
  options?: string;
  isRequired: boolean;
  helpText?: string;
}

export interface Participant {
  firstName: string;
  lastName: string;
  birthDate: string;
  city: string;
  instrument?: string;
  priceOption?: string; // Welche Preisoption wurde gewählt
  customFields?: Record<string, any>;
}

// Media
export interface StrapiMedia {
  id: number;
  name: string;
  url: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: {
    thumbnail?: { url: string };
    small?: { url: string };
    medium?: { url: string };
    large?: { url: string };
  };
}

// User
export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  roleType?: string;
  district?: string;
  bio?: string;
  profileImage?: StrapiMedia;
}

// Ensemble
export interface Ensemble {
  id: number;
  name: string;
  districtInfo: DistrictInfo;
  description?: string;
  image?: StrapiMedia;
  conductor?: User;
  contactInfo?: ContactInfo;
  isActive: boolean;
}

// Event
export interface Event {
  id: number;
  title: string;
  description?: string;
  motto?: string;
  eventDate: string;
  location: Location;
  districtInfo: DistrictInfo;
  category: "Concert" | "Service" | "Rehearsal" | "Other";
  performingEnsemble?: Ensemble;
  isFree: boolean;
  priceOptions?: PriceOption[];
  priceInfo?: string;
  pendingReview: boolean;
  approved: boolean;
  reviewer?: User;
  reviewDate?: string;
  reviewNotes?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Course
export interface Course {
  id: number;
  title: string;
  description: string;
  motto?: string;
  startDate: string;
  endDate: string;
  location: Location;
  districtInfo: DistrictInfo;
  courseType: "D-Course" | "C-Course" | "Workshop" | "Training" | "Other";
  targetAudience?: "Beginners" | "Advanced" | "Conductors" | "Youth" | "All";
  instructors?: User[];
  registrationOpen: boolean;
  registrationDeadline?: string;
  maxParticipants: number;
  allowWaitingList: boolean;
  priceOptions: PriceOption[];
  isFree: boolean;
  priceInfo?: string;
  customFields?: RegistrationField[];
  prerequisites?: string;
  whatToBring?: string;
  pendingReview: boolean;
  approved: boolean;
  reviewer?: User;
  reviewDate?: string;
  reviewNotes?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Course Registration
export interface CourseRegistration {
  id: number;
  courseId: number;
  registeredBy: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    choir?: string;
    district?: string;
  };
  participants: Participant[];
  totalPrice: number;
  paymentStatus: "pending" | "paid" | "refunded";
  registrationStatus: "confirmed" | "waitlist" | "cancelled";
  createdAt: string;
  updatedAt: string;
  notes?: string;
  // Für Rechnung später:
  invoiceGenerated: boolean;
  invoiceId?: number;
  invoiceDate?: string;
}

// Post (News)
export interface Post {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: StrapiMedia;
  category: "Magazine" | "Event" | "Education" | "Districts" | "Other";
  districtInfo: DistrictInfo;
  author?: User;
  pinned: boolean;
  pendingReview: boolean;
  approved: boolean;
  reviewer?: User;
  reviewDate?: string;
  reviewNotes?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Strapi Response Wrapper
export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiCollectionResponse<T> {
  data: Array<{
    id: number;
    attributes: T;
  }>;
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}
