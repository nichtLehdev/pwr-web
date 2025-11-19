import { Event } from "./strapi";

export type AuswahlChor = {
  name: string;
  slug: string;
  subtitle: string;
  founded: string;
  members: string;
  director: string;
  description: string;
  color: string;
  colorHex: string;
  concerts: Event[];
  showApplication?: boolean;
  imageCount: number;
};

export interface PosaunenratMember {
  name: string;
  role:
    | "Vorstand"
    | "Bezirksobmann"
    | "Bezirksobfrau"
    | "Landeskirchenmusikdirektor"
    | "Sachverständiger"
    | "Sachverständige";
  district?: string;
  image?: string;
  email?: string;
}

export interface HistoryEvent {
  year: number;
  title: string;
  description: string;
  image?: string;
  category?:
    | "founding"
    | "milestone"
    | "expansion"
    | "modernization"
    | "partnership";
}

export interface TeamMember {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  image?: string;
  responsibilities?: string[];
  socials?: {
    platform:
      | "website"
      | "linkedin"
      | "github"
      | "twitter"
      | "facebook"
      | "instagram"
      | "xing";
    url: string;
    label?: string;
  }[];
}

export interface ContactInfo {
  type: "geschaeftsstelle" | "internet-team";
  title: string;
  description: string;
  email: string;
  phone?: string;
  address?: {
    street: string;
    zip: string;
    city: string;
  };
  openingHours?: {
    mondayToThursday: string;
    friday: string;
    note?: string;
  };
  members: TeamMember[];
}
