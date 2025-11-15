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
