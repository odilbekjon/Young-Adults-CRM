// Swagger exposes salaries as a top-level resource (/api/v1/salaries/...),
// not under finance/, so it gets its own module rather than being folded into
// financeApi (which only holds the totalSalaries *stat* numbers).
export enum PATHS {
  SALARIES = "salaries",
}
