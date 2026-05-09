// src/constants/teachers.ts

export interface Student {
  id: number;
  name: string;
  phone: string;
  active: boolean;
}

export interface Group {
  id: number;
  name: string;
  badge: string;
  badgeColor: "blue" | "green" | "amber";
  startDate: string;
  endDate: string;
  schedule: string;
  room: string;
  roomCapacity?: number;
  studentCount: number;
  students: Student[];
  // Group page uchun qo'shimcha maydonlar
  course: string;
  teacher: string;
  teacherId: number;
  price?: number;
  days: string;
  lessonStartTime: string;
  branch?: string;
}

export interface Teacher {
  id: number;
  fullName: string;
  phone: string;
  telegram?: string;
  uid: string;
  role: string;
  branch: string;
  percent?: string;
  dob?: string;
  gender?: string;
  groups: Group[];
}

export const TEACHERS_DATA: Teacher[] = [
  {
    id: 1,
    fullName: "Pardayev Jahongir",
    phone: "93 986 66 76",
    telegram: "@pardayev",
    uid: "1591260",
    role: "Teacher",
    branch: "YA IELTS Campus",
    percent: "20",
    dob: "1995-06-14",
    gender: "Male",
    groups: [
      {
        id: 101,
        name: "KIDS English",
        badge: "English Planet",
        badgeColor: "blue",
        startDate: "2026-04-15",
        endDate: "2026-09-15",
        schedule: "Odd days • 11:00",
        days: "Odd days",
        lessonStartTime: "11:00",
        room: "5-xona",
        roomCapacity: 20,
        studentCount: 11,
        course: "English",
        teacher: "Pardayev Jahongir",
        teacherId: 1,
        price: 500000,
        branch: "YA IELTS Campus",
        students: [
          { id: 1, name: "Bo'ronov Oybek", phone: "(77) 022-25-04", active: true },
          { id: 2, name: "Xo'shboqova Charos", phone: "(97) 242-14-80", active: true },
          { id: 3, name: "Eshboyev Abdulla", phone: "(93) 846-41-46", active: true },
          { id: 4, name: "Baxtiyorova Shahribonu", phone: "(93) 600-92-25", active: true },
          { id: 5, name: "Jumayev Asror", phone: "(94) 167-67-17", active: true },
          { id: 6, name: "O'tashev Asror", phone: "(94) 713-82-84", active: true },
          { id: 7, name: "Nortojiyeva Nafosat", phone: "(91) 588-14-05", active: true },
          { id: 8, name: "Ostanaqulova Marjona", phone: "(99) 015-93-11", active: true },
          { id: 9, name: "Turdimurodova Xumora", phone: "(94) 543-33-87", active: true },
          { id: 10, name: "Turdimurodov Asadbek", phone: "(94) 543-33-87", active: true },
          { id: 11, name: "Eshmo'minova Yasira", phone: "(94) 386-67-00", active: true },
        ],
      },
      {
        id: 102,
        name: "IELTS",
        badge: "CRAM",
        badgeColor: "green",
        startDate: "2026-04-13",
        endDate: "2026-12-13",
        schedule: "Odd days • 16:00",
        days: "Odd days",
        lessonStartTime: "16:00",
        room: "3-xona",
        roomCapacity: 25,
        studentCount: 5,
        course: "IELTS",
        teacher: "Pardayev Jahongir",
        teacherId: 1,
        price: 800000,
        branch: "YA IELTS Campus",
        students: [
          { id: 1, name: "Aliyev Bobur", phone: "(90) 123-45-67", active: true },
          { id: 2, name: "Karimova Dilnoza", phone: "(93) 234-56-78", active: true },
          { id: 3, name: "Toshmatov Jasur", phone: "(94) 345-67-89", active: false },
          { id: 4, name: "Nazarova Kamola", phone: "(95) 456-78-90", active: true },
          { id: 5, name: "Ergashev Temur", phone: "(94) 333-44-55", active: true },
        ],
      },
      {
        id: 103,
        name: "Koreys tili",
        badge: "New group",
        badgeColor: "amber",
        startDate: "2026-04-13",
        endDate: "2026-08-13",
        schedule: "Odd days • 14:00",
        days: "Odd days",
        lessonStartTime: "14:00",
        room: "2-xona",
        roomCapacity: 15,
        studentCount: 3,
        course: "Korean",
        teacher: "Pardayev Jahongir",
        teacherId: 1,
        price: 600000,
        branch: "YA IELTS Campus",
        students: [
          { id: 1, name: "Yusupov Sherzod", phone: "(91) 456-78-90", active: true },
          { id: 2, name: "Nazarova Zulfiya", phone: "(95) 567-89-01", active: true },
          { id: 3, name: "Holiqova Munira", phone: "(93) 678-90-12", active: true },
        ],
      },
    ],
  },
  {
    id: 2,
    fullName: "Rahimova Dilnoza",
    phone: "90 123 45 67",
    telegram: "@rahimova_d",
    uid: "1591261",
    role: "Teacher",
    branch: "Main Campus",
    percent: "15",
    gender: "Female",
    groups: [
      {
        id: 201,
        name: "General English",
        badge: "Beginner",
        badgeColor: "blue",
        startDate: "2026-04-01",
        endDate: "2026-10-01",
        schedule: "Even days • 09:00",
        days: "Even days",
        lessonStartTime: "09:00",
        room: "1-xona",
        roomCapacity: 20,
        studentCount: 2,
        course: "English",
        teacher: "Rahimova Dilnoza",
        teacherId: 2,
        price: 450000,
        branch: "Main Campus",
        students: [
          { id: 1, name: "Sobirov Amir", phone: "(90) 111-22-33", active: true },
          { id: 2, name: "Holiqova Munira", phone: "(93) 222-33-44", active: true },
        ],
      },
    ],
  },
  {
    id: 3,
    fullName: "Toshmatov Jasur",
    phone: "94 234 56 78",
    telegram: "@jasur_t",
    uid: "1591262",
    role: "Teacher",
    branch: "YA IELTS Campus",
    percent: "18",
    gender: "Male",
    groups: [
      {
        id: 301,
        name: "SAT Math",
        badge: "Intensive",
        badgeColor: "amber",
        startDate: "2026-04-10",
        endDate: "2026-11-10",
        schedule: "Odd days • 14:00",
        days: "Odd days",
        lessonStartTime: "14:00",
        room: "7-xona",
        roomCapacity: 20,
        studentCount: 3,
        course: "SAT",
        teacher: "Toshmatov Jasur",
        teacherId: 3,
        price: 900000,
        branch: "YA IELTS Campus",
        students: [
          { id: 1, name: "Ergashev Temur", phone: "(94) 333-44-55", active: true },
          { id: 2, name: "Nazarova Kamola", phone: "(95) 444-55-66", active: true },
          { id: 3, name: "Abdullayev Sanjar", phone: "(97) 555-66-77", active: false },
        ],
      },
    ],
  },
  {
    id: 4,
    fullName: "Karimov Ulugbek",
    phone: "91 345 67 89",
    telegram: "@ulugbek_k",
    uid: "1591263",
    role: "Teacher",
    branch: "West Branch",
    percent: "12",
    gender: "Male",
    groups: [],
  },
  {
    id: 5,
    fullName: "Yusupova Malika",
    phone: "95 456 78 90",
    telegram: "@malika_y",
    uid: "1591264",
    role: "Teacher",
    branch: "Main Campus",
    percent: "22",
    gender: "Female",
    groups: [
      {
        id: 501,
        name: "Speaking Club",
        badge: "Advanced",
        badgeColor: "green",
        startDate: "2026-04-05",
        endDate: "2026-09-05",
        schedule: "Every day • 18:00",
        days: "Every day",
        lessonStartTime: "18:00",
        room: "4-xona",
        roomCapacity: 15,
        studentCount: 2,
        course: "English Speaking",
        teacher: "Yusupova Malika",
        teacherId: 5,
        price: 400000,
        branch: "Main Campus",
        students: [
          { id: 1, name: "Rakhimov Sanjar", phone: "(91) 666-77-88", active: true },
          { id: 2, name: "Ismoilova Nargiza", phone: "(93) 777-88-99", active: true },
        ],
      },
    ],
  },
];

// Helper: barcha guruhlarni tekis ro'yxat sifatida olish
export const ALL_GROUPS: Group[] = TEACHERS_DATA.flatMap((t) => t.groups);

// Helper: barcha guruhlarni tekis ro'yxat sifatida olish
export const ALL_STUDENTS: Student[] = TEACHERS_DATA.flatMap((t) => t.groups).flatMap((g) => g.students);

// Helper: id bo'yicha guruh topish
export const findGroupById = (id: number): Group | undefined =>
  ALL_GROUPS.find((g) => g.id === id);

// Helper: id bo'yicha o'qituvchi topish
export const findTeacherById = (id: number): Teacher | undefined =>
  TEACHERS_DATA.find((t) => t.id === id);

// Helper: sana formatlash
export const formatDate = (d: string) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
};