// /groups and /groups/:id render a completely different component for a
// TEACHER-role session (read-only, own-groups-only, attendance-only) versus
// everyone else (the full admin Groups/SingleGroup pages) — picked here so
// neither of those two large existing files needs any teacher-specific
// branching inside them.
import { useAuth } from "../hooks/useAuth";
import { Groups } from "../pages/Groups/Groups";
import { SingleGroup } from "../pages/SingleGroup";
import { TeacherGroups } from "../pages/TeacherGroups/TeacherGroups";
import { TeacherGroupDetail } from "../pages/TeacherGroups/TeacherGroupDetail";

export const GroupsRoute = () => {
  const { isTeacher } = useAuth();
  return isTeacher ? <TeacherGroups /> : <Groups />;
};

export const GroupDetailRoute = () => {
  const { isTeacher } = useAuth();
  return isTeacher ? <TeacherGroupDetail /> : <SingleGroup />;
};
