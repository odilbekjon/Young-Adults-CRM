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

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: LoginUser;
    token: string;
  };
}

export interface MeUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  photo: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeResponse {
  success: boolean;
  message: string;
  data: MeUser;
}
