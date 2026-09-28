import { baseApi } from "../baseApi";
import { PATHS } from "./paths";
import {
  Tag,
  TagsRequest,
  TagsResponse,
  TagResponse,
  TagSelectOption,
  TagsSelectRequest,
  CreateTagRequest,
  UpdateTagRequest,
  DeleteTagResponse,
} from "./types";

const normalizeList = <T,>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
};

// Swagger's own GET /tags example includes branchId alongside the automatic
// x-branch-id header (belt-and-suspenders, same convention studentsApi/
// teachersApi already use) — "all" stands for every branch.
const buildTagsQueryString = (args: TagsRequest = {}): string => {
  const params = new URLSearchParams();
  if (args.type) params.set("type", args.type);
  if (args.branchId) params.set("branchId", args.branchId);
  if (args.page) params.set("page", String(args.page));
  if (args.limit) params.set("limit", String(args.limit));
  return params.toString();
};

export const tagsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    allTags: builder.query<TagsResponse, TagsRequest | void>({
      query: (args) => ({ url: `${PATHS.TAGS}?${buildTagsQueryString(args ?? {})}`, method: "GET" }),
      transformResponse: (response: TagsResponse) => ({
        ...response,
        data: normalizeList<Tag>(response?.data),
      }),
      providesTags: ["tag"],
    }),
    tagById: builder.query<TagResponse, string>({
      query: (id) => ({ url: `${PATHS.TAGS}/${id}`, method: "GET" }),
      providesTags: ["tag"],
    }),
    // GET /tags/select?type=STUDENT|GROUP — the dropdown-specific endpoint
    // for filtering Students/Groups by tag.
    tagsSelect: builder.query<TagSelectOption[], TagsSelectRequest>({
      query: ({ type }) => ({ url: `${PATHS.TAGS}/select?type=${encodeURIComponent(type)}`, method: "GET" }),
      transformResponse: (response: { data: unknown }) => normalizeList<TagSelectOption>(response?.data),
      providesTags: ["tag"],
    }),
    createTag: builder.mutation<TagResponse, CreateTagRequest>({
      query: ({ name, type }) => {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("type", type);
        return { url: PATHS.TAGS, method: "POST", body: formData };
      },
      invalidatesTags: ["tag"],
    }),
    updateTag: builder.mutation<TagResponse, UpdateTagRequest>({
      query: ({ id, name, type }) => {
        const formData = new FormData();
        if (name !== undefined) formData.append("name", name);
        if (type !== undefined) formData.append("type", type);
        return { url: `${PATHS.TAGS}/${id}`, method: "PATCH", body: formData };
      },
      invalidatesTags: ["tag"],
    }),
    deleteTag: builder.mutation<DeleteTagResponse, string>({
      query: (id) => ({ url: `${PATHS.TAGS}/${id}`, method: "DELETE" }),
      invalidatesTags: ["tag"],
    }),
  }),
});

export const {
  useAllTagsQuery,
  useTagByIdQuery,
  useLazyTagByIdQuery,
  useTagsSelectQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
} = tagsApi;
