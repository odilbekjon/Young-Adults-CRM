interface Student { 
    id: number;
    name:string;
    phone: string;
    groups: string[];
    courses: string[];
    teacher: string;
}

export const students: Student[] = [
  {
    id: 1,
    name: "Umida Umiullayevna",
    phone: "99 436 89 42",
    groups: ["New elementary"],
    courses: ["IT Bootcamp"],
    teacher: "Shamsiddin",
  },
  {
    id: 2,
    name: "Shoraximov Shamsiddin",
    phone: "99 436 89 42",
    groups: ["Prezidnet maktabiga", "IT Bootcamp"],
    courses: ["Prezidnet maktabi", "IT Bootcamp"],
    teacher: "Muhammad",
  },
  {
    id: 3,
    name: "Botir Umarov",
    phone: "99 436 89 42",
    groups: ["New elementary"],
    courses: ["IT English"],
    teacher: "Mirmuxsinbek",
  },
  {
    id: 4,
    name: "Sherali Sheraliyev",
    phone: "99 436 89 42",
    groups: ["New elementary"],
    courses: ["IT English"],
    teacher: "Xojimatdoston",
  },
  {
    id: 5,
    name: "Vaxob Vaxobov",
    phone: "99 436 89 42",
    groups: ["New elementary"],
    courses: ["IT English"],
    teacher: "Umar",
  },
  {
    id: 6,
    name: "Nozima Safaullayeva",
    phone: "99 436 89 42",
    groups: ["New elementary"],
    courses: ["IT English"],
    teacher: "Nigina",
  },
];