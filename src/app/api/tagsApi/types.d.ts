export type TagType = "STUDENT" | "GROUP";

export interface TagUserRef {
  id: string;
  name: string;
  phone?: string | null;
  photo?: string | null;
}

export interface Tag {
  id: string;
  name: string;
  type: TagType;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: TagUserRef | null;
  updatedBy?: TagUserRef | null;
}

export interface TagsRequest {
  page?: number;
  limit?: number;
  branchId?: string;
  type?: TagType;
}

export interface TagsResponse {
  success: boolean;
  data: Tag[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TagResponse {
  success: boolean;
  message?: string;
  data: Tag;
}

export interface TagSelectOption {
  id: string;
  name: string;
}

// GET /tags/select — Swagger lists only `type` as a query param (branch
// scoping goes through the automatic x-branch-id header, unlike the plain
// list endpoint below which also accepts branchId directly).
export interface TagsSelectRequest {
  type: TagType;
}

export interface CreateTagRequest {
  name: string;
  type: TagType;
}

export interface UpdateTagRequest {
  id: string;
  name?: string;
  type?: TagType;
}

export interface DeleteTagResponse {
  success: boolean;
  message?: string;
}
