import { z } from "zod";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = {
  page: number;
  pageSize: number;
};

export const parsePagination = (params: URLSearchParams): PaginationInput => {
  return paginationSchema.parse({
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
  });
};

export const paginate = <T>(items: T[], page: number, pageSize: number) => {
  const total = items.length;
  const offset = (page - 1) * pageSize;
  const pagedItems = items.slice(offset, offset + pageSize);

  return {
    items: pagedItems,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
};
