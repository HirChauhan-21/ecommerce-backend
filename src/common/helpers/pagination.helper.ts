export interface PaginationOptions {
  page?: string | number;
  limit?: string | number;
  viewType?: string;
}

export async function paginate<T>(
  prismaModel: any,
  options: PaginationOptions,
  queryOptions: any = {},
  message = 'Data fetched successfully',
) {
  const page = options.page ? Math.max(1, parseInt(options.page.toString(), 10)) : 1;
  const limit = options.limit ? Math.max(1, parseInt(options.limit.toString(), 10)) : 10;
  const viewType = options.viewType || 'grid';

  const skip = (page - 1) * limit;
  const take = limit;

  // Execute queries in parallel
  const [totalCount, data] = await Promise.all([
    prismaModel.count({ where: queryOptions.where }),
    prismaModel.findMany({
      ...queryOptions,
      skip,
      take,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: true,
    message,
    meta: {
      page,
      limit,
      totalCount,
      totalPages,
      viewType,
    },
    data,
  };
}
