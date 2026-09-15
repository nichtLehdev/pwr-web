/**
 * EPC QR payload (BCD 002) for a SEPA credit transfer ("GiroCode"). Banking
 * apps scan this to pre-fill recipient, IBAN, amount and reference.
 *
 * Dependency-free on purpose: the invoice PDF, the registration form and the
 * confirmation mail all encode the same payload, each with their own renderer.
 */
export function buildEpcQrPayload(
  beneficiaryName: string,
  iban: string,
  amountEur: number,
  reference: string,
  bic?: string,
): string {
  return [
    "BCD", // Service tag
    "002", // Version
    "1", // Character set UTF-8
    "SCT", // SEPA Credit Transfer
    bic?.replace(/\s/g, "") ?? "", // BIC (optional for domestic)
    beneficiaryName.slice(0, 70),
    iban.replace(/\s/g, ""),
    `EUR${amountEur.toFixed(2)}`,
    "", // Purpose (optional)
    "", // Structured creditor reference
    reference.slice(0, 140), // Remittance (Verwendungszweck)
    "", // Beneficiary to originator info
  ].join("\n");
}
