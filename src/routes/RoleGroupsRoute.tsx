// /groups and /groups/:id render a completely different component for a
// TEACHER-role session (read-only, own-groups-only, attendance-only) versus
// everyone else (the full admin Groups/SingleGroup pages) — picked here so
// neither of those two large existing files needs any teacher-specific
// branching inside them.
import { useAuth } from "../hooks/useAuth";
import { lazyNamed } from "../utils/lazyPage";

// Each variant is its own chunk, so a teacher never downloads the admin pages
// (and the other way round). The route wraps these in a Suspense boundary.
const Groups = lazyNamed(() => import("../pages/Groups/Groups"), "Groups");
const SingleGroup = lazyNamed(() => import("../pages/SingleGroup/SingleGroup"), "SingleGroup");
const TeacherGroups = lazyNamed(() => import("../pages/TeacherGroups/TeacherGroups"), "TeacherGroups");
const TeacherGroupDetail = lazyNamed(() => import("../pages/TeacherGroups/TeacherGroupDetail"), "TeacherGroupDetail");

export const GroupsRoute = () => {
  const { isTeacher } = useAuth();
  return isTeacher ? <TeacherGroups /> : <Groups />;
};

export const GroupDetailRoute = () => {
  const { isTeacher } = useAuth();
  return isTeacher ? <TeacherGroupDetail /> : <SingleGroup />;
};
