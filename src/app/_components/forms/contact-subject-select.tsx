"use client";

import { Select } from "@/app/_components/ui";

/** Server-rendered Kontakt form: native `name` via hidden field on custom Select. */
export function ContactSubjectSelect({ className }: { className?: string }) {
  return (
    <Select
      id="subject"
      name="subject"
      required
      defaultValue=""
      className={className}
    >
      <option value="">Bitte wählen...</option>
      <option value="allgemein">Allgemeine Anfrage</option>
      <option value="chor">Posaunenchor gründen/finden</option>
      <option value="ausbildung">Ausbildung</option>
      <option value="termine">Termine & Veranstaltungen</option>
      <option value="materialien">Noten & Materialien</option>
      <option value="foerderverein">Förderverein</option>
      <option value="sonstiges">Sonstiges</option>
    </Select>
  );
}
