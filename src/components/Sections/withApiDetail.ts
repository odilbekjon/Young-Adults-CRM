import { extractApiError } from "../../utils";

// Appends the backend's own explanation (e.g. why a column can't be deleted)
// to a generic toast text.
export const withApiDetail = (generic: string, err: unknown): string => {
  const detail = extractApiError(err);
  return detail ? `${generic}: ${detail}` : generic;
};
