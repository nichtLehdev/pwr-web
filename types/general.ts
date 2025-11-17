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
