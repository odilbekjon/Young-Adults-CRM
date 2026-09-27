// Swagger exposes this as a top-level resource (/api/v1/student-freezes) —
// the full freeze-*records* CRUD (list/detail/create/edit/delete), used by
// the Settings > Student Freezes admin list. This is a SEPARATE resource
// from groupsApi's freezeStudentGroup/unfreezeStudentGroup (POST
// /student-groups/{id}/freeze|unfreeze): an earlier pass here assumed that
// route had been removed from Swagger, but a later live-verified pass
// (see groupsApi.tsx) confirmed it's still live and is what SingleGroup/
// StudentProfile's own Freeze/Unfreeze quick actions actually use — so
// don't fold the two together without re-confirming against Swagger first.
export enum PATHS {
  STUDENT_FREEZES = "student-freezes",
}
