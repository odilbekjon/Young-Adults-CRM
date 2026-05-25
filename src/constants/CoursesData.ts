export interface Group {
  id: number;
  tag: string;
  teacher: string;
  startDate: string;
  endDate: string;
  schedule: string;
  time: string;
}

export interface Course {
  id: number;
  name: string;
  price: number;
  color: string;
  codeCourse: string;
  lessonDuration: string;
  courseDuration: number;
  description: string;
  students: number;
  groups: Group[];
}

export const defaultCourses: Course[] = [
  {
    id: 1,
    name: "Koreys tili",
    price: 300000,
    color: "#f46b8a",
    codeCourse: "KOR-001",
    lessonDuration: "90 minutes",
    courseDuration: 6,
    description: "Korean language course for beginners",
    students: 34,
    groups: [
      {
        id: 1,
        tag: "Beginner Group",
        teacher: "Odilbek Safarov",
        startDate: "01.01.2026",
        endDate: "30.06.2026",
        schedule: "Odd days",
        time: "10:00",
      },
    ],
  },
  {
    id: 2,
    name: "Math for kids",
    price: 300000,
    color: "#8bc34a",
    codeCourse: "MTK-002",
    lessonDuration: "60 minutes",
    courseDuration: 4,
    description: "Fun mathematics for children",
    students: 28,
    groups: [
      {
        id: 1,
        tag: "Kids A",
        teacher: "Malika Yusupova",
        startDate: "15.01.2026",
        endDate: "15.05.2026",
        schedule: "Even days",
        time: "11:00",
      },
    ],
  },
  {
    id: 3,
    name: "Matematika",
    price: 300000,
    color: "#80cbc4",
    codeCourse: "MAT-003",
    lessonDuration: "90 minutes",
    courseDuration: 6,
    description: "Mathematics course",
    students: 41,
    groups: [
      {
        id: 1,
        tag: "Math Group 1",
        teacher: "Jasur Toshmatov",
        startDate: "01.02.2026",
        endDate: "01.08.2026",
        schedule: "Even days",
        time: "14:00",
      },
      {
        id: 2,
        tag: "Math Group 2",
        teacher: "Jasur Toshmatov",
        startDate: "10.02.2026",
        endDate: "10.08.2026",
        schedule: "Odd days",
        time: "16:00",
      },
    ],
  },
  {
    id: 4,
    name: "Back-end",
    price: 500000,
    color: "#4db6c8",
    codeCourse: "BAC-004",
    lessonDuration: "120 minutes",
    courseDuration: 8,
    description: "Back-end development course",
    students: 22,
    groups: [
      {
        id: 1,
        tag: "Backend Pro",
        teacher: "Sherzod Karimov",
        startDate: "01.03.2026",
        endDate: "01.11.2026",
        schedule: "Even days",
        time: "18:00",
      },
    ],
  },
  {
    id: 5,
    name: "AutoCad Termiz Individual",
    price: 400000,
    color: "#f48fb1",
    codeCourse: "AUT-005",
    lessonDuration: "90 minutes",
    courseDuration: 3,
    description: "AutoCad individual training",
    students: 12,
    groups: [],
  },
  {
    id: 6,
    name: "Kids ENGLISH Termiz",
    price: 250000,
    color: "#ff8a65",
    codeCourse: "ENG-006",
    lessonDuration: "60 minutes",
    courseDuration: 6,
    description: "English for kids",
    students: 47,
    groups: [
      {
        id: 1,
        tag: "Kids English A",
        teacher: "Nilufar Ergasheva",
        startDate: "01.01.2026",
        endDate: "30.06.2026",
        schedule: "Even days",
        time: "09:00",
      },
      {
        id: 2,
        tag: "Kids English B",
        teacher: "Nilufar Ergasheva",
        startDate: "01.02.2026",
        endDate: "31.07.2026",
        schedule: "Odd days",
        time: "11:00",
      },
    ],
  },
  {
    id: 7,
    name: "CEFR Termiz",
    price: 350000,
    color: "#f48fb1",
    codeCourse: "CEF-007",
    lessonDuration: "90 minutes",
    courseDuration: 8,
    description: "CEFR exam preparation",
    students: 19,
    groups: [
      {
        id: 1,
        tag: "CEFR B2",
        teacher: "Doniyor Rashidov",
        startDate: "15.02.2026",
        endDate: "15.10.2026",
        schedule: "Even days",
        time: "15:00",
      },
    ],
  },
  {
    id: 8,
    name: "Grammar Termiz",
    price: 300000,
    color: "#ce93d8",
    codeCourse: "GRM-008",
    lessonDuration: "60 minutes",
    courseDuration: 4,
    description: "English grammar course",
    students: 31,
    groups: [
      {
        id: 1,
        tag: "Grammar A1",
        teacher: "Zulfiya Sobirov",
        startDate: "01.03.2026",
        endDate: "30.06.2026",
        schedule: "Odd days",
        time: "13:00",
      },
    ],
  },
  {
    id: 9,
    name: "Front-end",
    price: 500000,
    color: "#90caf9",
    codeCourse: "FRO-009",
    lessonDuration: "120 minutes",
    courseDuration: 8,
    description: "Front-end development course",
    students: 59,
    groups: [
      {
        id: 1,
        tag: "Young Developers",
        teacher: "Odilbek Safarov",
        startDate: "23.04.2026",
        endDate: "31.12.2026",
        schedule: "Even days",
        time: "14:00",
      },
      {
        id: 2,
        tag: "The Best Developers",
        teacher: "Odilbek Safarov",
        startDate: "01.02.2026",
        endDate: "01.10.2026",
        schedule: "Even days",
        time: "12:00",
      },
      {
        id: 3,
        tag: "Computer Engineers",
        teacher: "Odilbek Safarov",
        startDate: "01.01.2026",
        endDate: "30.09.2026",
        schedule: "Even days",
        time: "18:00",
      },
    ],
  },
  {
    id: 10,
    name: "IELTS Intensive",
    price: 600000,
    color: "#a5d6a7",
    codeCourse: "IEL-010",
    lessonDuration: "120 minutes",
    courseDuration: 6,
    description: "Intensive IELTS preparation",
    students: 38,
    groups: [
      {
        id: 1,
        tag: "IELTS 7.0",
        teacher: "Kamola Xasanova",
        startDate: "01.04.2026",
        endDate: "01.10.2026",
        schedule: "Even days",
        time: "17:00",
      },
      {
        id: 2,
        tag: "IELTS 6.5",
        teacher: "Kamola Xasanova",
        startDate: "15.04.2026",
        endDate: "15.10.2026",
        schedule: "Odd days",
        time: "15:00",
      },
    ],
  },
  {
    id: 11,
    name: "Rus tili",
    price: 280000,
    color: "#ef9a9a",
    codeCourse: "RUS-011",
    lessonDuration: "90 minutes",
    courseDuration: 5,
    description: "Russian language course",
    students: 23,
    groups: [
      {
        id: 1,
        tag: "Rus A1",
        teacher: "Natalya Ivanova",
        startDate: "01.02.2026",
        endDate: "30.06.2026",
        schedule: "Odd days",
        time: "10:00",
      },
    ],
  },
  {
    id: 12,
    name: "Grafik dizayn",
    price: 450000,
    color: "#ffcc80",
    codeCourse: "GRF-012",
    lessonDuration: "90 minutes",
    courseDuration: 6,
    description: "Graphic design fundamentals",
    students: 17,
    groups: [
      {
        id: 1,
        tag: "Design Pro",
        teacher: "Bobur Mirzayev",
        startDate: "01.03.2026",
        endDate: "01.09.2026",
        schedule: "Even days",
        time: "16:00",
      },
    ],
  },
];
