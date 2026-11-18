import type { ServerPaymentFields } from "../../../utils/serverPayment";

// SUPERADMIN/CEO also get the server payment reminder keys on a branch.
export interface Branch extends ServerPaymentFields {
  id: string;
  name: string;
  address: string;
  status: string;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchesResponse {
  success: boolean;
  message: string;
  data: Branch[];
}

export interface BranchResponse {
  success: boolean;
  message: string;
  data: Branch;
}

export interface CreateBranchRequest {
  name: string;
  address?: string;
}

export interface UpdateBranchRequest {
  id: string;
  name?: string;
  address?: string;
}

export interface DeleteBranchResponse {
  success: boolean;
  message: string;
}

export interface ToggleBranchStatusResponse {
  success: boolean;
  message: string;
  data?: Branch;
}
