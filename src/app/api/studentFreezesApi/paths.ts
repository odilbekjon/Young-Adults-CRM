// Swagger exposes this as a top-level resource (/api/v1/student-freezes) —
// the full freeze-*records* CRUD (list/detail/create/edit/delete). This is
// also what SingleGroup's Freeze/Unfreeze actions use (a prior
// /student-groups/{studentId}/freeze route was never documented in Swagger
// and has been removed), so it gets its own module rather than being folded
// into groupsApi.
export enum PATHS {
  STUDENT_FREEZES = "student-freezes",
}
