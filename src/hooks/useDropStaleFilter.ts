import { useEffect, useRef } from "react";

// A saved filter that names a branch-specific thing (a course) must not outlive
// what it refers to. It is dropped when
//  - the header's branch changes (the thing belonged to the old branch), and
//  - the current options have loaded and no longer contain it (e.g. it was saved
//    under another branch before a reload).
// Otherwise the table would stay narrowed to a filter the user cannot even see
// among the options. `options` is undefined while they are loading - nothing is
// judged then.
export const useDropStaleFilter = ({
  value,
  options,
  branchKey,
  onStale,
}: {
  value: string;
  options: readonly string[] | undefined;
  branchKey: string | null;
  onStale: () => void;
}) => {
  const previousBranch = useRef(branchKey);
  useEffect(() => {
    if (previousBranch.current === branchKey) return;
    previousBranch.current = branchKey;
    if (value) onStale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchKey]);

  useEffect(() => {
    if (value && options && !options.includes(value)) onStale();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options]);
};
