// Stub for OpenAPI Company enrichment (IT-start/IT-full)
export type CompanyInfo = {
  legal_name?: string;
  vat_number: string;
  address?: string;
  city?: string;
  country?: string;
  ateco_code?: string;
};

export async function enrichCompany(vat: string): Promise<CompanyInfo> {
  // TODO: integrate with external OpenAPI provider; for now return stub
  // Deterministic pseudo data based on VAT hash
  const hash = [...vat].reduce((a, c) => (a * 33 + c.charCodeAt(0)) % 1000, 7);
  const legal_name = `Azienda ${hash}`;
  const city = ['Milano', 'Roma', 'Torino', 'Bologna', 'Napoli'][hash % 5];
  const ateco_code = `62.${(hash % 90).toString().padStart(2, '0')}`; // example: ICT services
  return { legal_name, vat_number: vat, address: `Via ${hash}, ${city}`, city, country: 'IT', ateco_code };
}