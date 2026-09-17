export interface RoomBranch {
  id: string;
  name: string;
  address: string;
  status: string;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  branchId: string;
  status: string;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  branch: RoomBranch;
}

export interface RoomsResponse {
  success: boolean;
  message: string;
  data: Room[];
}

export interface RoomResponse {
  success: boolean;
  message: string;
  data: Room;
}

export interface CreateRoomRequest {
  name: string;
  capacity: number;
  branchId: string;
}

export interface UpdateRoomRequest {
  id: string;
  name?: string;
  capacity?: number;
  branchId?: string;
}

export interface DeleteRoomResponse {
  success: boolean;
  message: string;
}

export interface ToggleRoomStatusResponse {
  success: boolean;
  message: string;
  data?: Room;
}
