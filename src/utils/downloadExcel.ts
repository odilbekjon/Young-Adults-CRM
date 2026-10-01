// Shared "save the Excel Blob the backend generated" helper. Every *Excel
// endpoint in this app (GET .../excel) returns a ready-made file; the pages
// only need to trigger the browser download. The file name is built as
// `<base>[-<branch>]-<YYYY-MM-DD>.xlsx` so exports from different branches /
// days never collide and it is obvious which branch a file belongs to.

const slug = (value: string): string =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");

export const buildExcelFileName = (base: string, branchLabel?: string | null): string => {
  const date = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parts = [slug(base) || "export"];
  const branch = branchLabel ? slug(branchLabel) : "";
  if (branch) parts.push(branch);
  parts.push(stamp);
  return `${parts.join("-")}.xlsx`;
};

export const downloadExcelBlob = (blob: Blob, base: string, branchLabel?: string | null): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildExcelFileName(base, branchLabel);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
