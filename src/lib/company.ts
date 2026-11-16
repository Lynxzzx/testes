export type CompanyValues = {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  responsible: string;
  about: string;
  differentials: string;
};

export function toCompanyValues(
  c?: Partial<Record<keyof CompanyValues, string | null | undefined>> | null
): CompanyValues {
  return {
    name: c?.name ?? "",
    cnpj: c?.cnpj ?? "",
    email: c?.email ?? "",
    phone: c?.phone ?? "",
    website: c?.website ?? "",
    address: c?.address ?? "",
    responsible: c?.responsible ?? "",
    about: c?.about ?? "",
    differentials: c?.differentials ?? "",
  };
}
