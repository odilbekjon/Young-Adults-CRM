import { useState } from "react";

// Turns true the first time `open` does and stays true after. Drawers keep
// their content mounted once shown (so closing still slides out and form state
// survives) but use this to not render it — and fire its queries — before then.
export const useHasOpened = (open: boolean): boolean => {
  const [hasOpened, setHasOpened] = useState(open);
  if (open && !hasOpened) setHasOpened(true);
  return hasOpened;
};
