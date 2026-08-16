import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import type { ResultType } from "../constants";

export interface CertificateDto {
  serial: string;
  result: ResultType;
  issuedAt: string;
  fileUrl: string | null;
  event: { slug: string; title: string; startsAt: string | null };
  club: { slug: string; name: string };
}

export interface CertificateListResult {
  certificates: CertificateDto[];
  total: number;
  page: number;
  limit: number;
}

export function certificatesQueryOptions(page = 1, limit = 20) {
  return queryOptions({
    queryKey: ["certificates", "list", page, limit] as const,
    queryFn: ({ signal }) =>
      api.get<CertificateListResult>("/certificates", {
        signal,
        params: { page, limit },
      }),
  });
}

export interface CertificateVerificationDto {
  serial: string;
  result: ResultType;
  issuedAt: string;
  fileUrl: string | null;
  recipient: { fullName: string };
  event: { title: string; startsAt: string | null; venue: string | null };
  club: { name: string };
  college: { name: string };
}

export function verificationQueryOptions(serial: string) {
  return queryOptions({
    queryKey: ["certificates", "verify", serial] as const,
    queryFn: ({ signal }) =>
      api.get<{ certificate: CertificateVerificationDto }>(
        `/certificates/${serial}`,
        { signal },
      ),
    retry: false,
  });
}
