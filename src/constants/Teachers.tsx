interface Teacher { 
  id: number;
  fullName: string;
  phone: string;
  groups: number;
}

// Static data
 export const Teachers : Teacher[] = [
    {
      id: 1,
      fullName: "John Doe",
      phone: "+1 234 567 890",
      groups: 3,
    },
    {
      id: 2,
      fullName: "Jane Smith",
      phone: "+1 987 654 321",
      groups: 2,
    },
    {
      id: 3,
      fullName: "Michael Brown",
      phone: "+1 555 123 456",
      groups: 4,
    },
    {
      id: 4,
      fullName: "Emily Johnson",
      phone: "+1 444 987 654",
      groups: 1,
    },
    {
      id: 5,
      fullName: "David Wilson",
      phone: "+1 333 246 135",
      groups: 5,
    },
  ];