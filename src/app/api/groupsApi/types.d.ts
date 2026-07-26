export interface groupsRequest {
    id: string;
    name: string;
    price: string;
}

export interface groupsResponse {
    groups: groupsRequest[];
}
