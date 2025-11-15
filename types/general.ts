export type AuswahlChor = {
  name: string;
  slug: string; // <-- Add slug to your data
  subtitle: string;
  founded: string;
  members: string;
  director: string;
  description: string;
  color: string;
  colorHex: string;
  concerts: { date: string; title: string; location: string; type: string }[];
  showApplication?: boolean;
  imageCount: number; // <-- We will populate this from the server
};
