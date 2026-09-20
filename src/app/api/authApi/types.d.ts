export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginUser {
  id: string;
  email: string;
  phone: string | null;
  role: string;
}

// POST /auth/login — Swagger confirms the request as multipart/form-data
// {identifier, password}; the response body wasn't expanded in Swagger's
// Responses section. `refreshToken` is modeled defensively (optional)
// because POST /auth/refresh requires a `refreshToken` string that has to
// be issued somewhere, and login is the only endpoint that plausibly does.
export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: LoginUser;
    token: string;
    refreshToken?: string;
  };
}

export interface MeUserBranchRef {
  id: string;
  name: string;
}

export interface MeUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  photo: string | null;
  role: string;
  jobTitle: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  branches: MeUserBranchRef[];
}

export interface MeResponse {
  success: boolean;
  message: string;
  data: MeUser;
}

export interface RefreshRequest {
  refreshToken: string;
}

// POST /auth/refresh — confirmed via Swagger as multipart/form-data with a
// single required field `refreshToken` (201 response, no schema shown).
// Modeled defensively as a renewed access/refresh token pair — the same
// shape as LoginResponse.data — since both plausible field-name variants
// (`token` and `accessToken`) are handled when consuming this in baseApi.
export interface RefreshResponse {
  success?: boolean;
  message?: string;
  data?: {
    token?: string;
    accessToken?: string;
    refreshToken?: string;
  };
}
