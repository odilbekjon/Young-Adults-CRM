export interface LoginRequest {
  // full_name: string;
  // email: string;
  phone: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}
