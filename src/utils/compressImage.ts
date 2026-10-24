const MAX_SIDE = 1024;
const SKIP_BELOW_BYTES = 300 * 1024;
const QUALITY = 0.85;

// Profile photos are shown tiny, but phone/camera originals are several MB —
// big enough for the server's reverse proxy to reject the upload outright (a
// proxy-level rejection carries no CORS headers, so the browser reports it as
// a CORS error). The photo is scaled down to MAX_SIDE and re-encoded as JPEG
// before it is attached to a form. Anything that can't be processed (not a
// raster image, decode failure) is returned untouched.
export const compressImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    // JPEG has no alpha — transparent PNG areas would turn black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
};
