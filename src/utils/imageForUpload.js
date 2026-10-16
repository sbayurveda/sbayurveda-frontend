// Getting a photograph from a phone into WordPress.
//
// Two things stop an otherwise good product photo:
//
//   1. iPhones shoot HEIC by default. WordPress cannot publish HEIC at all, so
//      the upload failed with "Images must be JPG, PNG, WebP, GIF or AVIF" and
//      the product could not be saved — there is no image, and the storefront
//      hides a product without one.
//   2. A 12-megapixel photo is routinely over the 8MB upload cap, which was a
//      wall rather than something the dashboard did anything about.
//
// Both are fixed in the same place and for the same reason: the browser already
// has an image decoder and a JPEG encoder, so it can hand the server something
// publishable instead of making someone round-trip through Preview. A 2000px
// JPEG is also the right thing to put on a shop page — the original is four
// times the size for no visible gain over a product tile.

// The cap the server enforces. Anything larger is re-encoded rather than refused.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Long edge of what we send. Comfortably above the largest size the storefront
// renders (a zoomed product image), so nothing visible is lost.
const MAX_EDGE = 2000;

const HEIC_RE = /\.(heic|heif)$/i;

function baseType(file) {
  // Finder and some share sheets send "image/png;charset=binary" or nothing at
  // all; the parameter and the blank are both meaningless here.
  return String(file?.type || "").split(";")[0].trim().toLowerCase();
}

// HEIC is the one format worth naming, because the fix for it is conversion
// rather than refusal. Phones sometimes report the type and sometimes don't, so
// the extension is checked too.
export function isHeic(file) {
  const type = baseType(file);
  return type === "image/heic" || type === "image/heif" || HEIC_RE.test(file?.name || "");
}

// Deliberately generous: anything that looks remotely like an image is sent,
// and the server decides from the actual bytes. The old check refused a file
// whose type the browser had simply not filled in — and refused it silently.
export function looksLikeImage(file) {
  if (!file) return false;
  if (baseType(file).startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name || "");
}

// An animated GIF survives nothing we could do to it here, so it is sent
// untouched and stands or falls on its own size.
function convertible(file) {
  return baseType(file) !== "image/gif" && !/\.gif$/i.test(file.name || "");
}

function shouldConvert(file) {
  if (!convertible(file)) return false;
  return isHeic(file) || file.size > MAX_UPLOAD_BYTES;
}

// Two decoders, because they fail on different things. createImageBitmap is
// faster and handles orientation, but Chrome refuses HEIC outright; an <img>
// element goes through the platform's own decoder, which on macOS and iOS does
// read HEIC. Trying both is the difference between converting an iPhone photo
// and telling someone to go and do it themselves.
async function decode(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return { source: await createImageBitmap(file), release: () => {} };
    } catch {
      // Fall through to the <img> path.
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
  // Released after drawing, not here: revoking the URL first can leave the
  // canvas with nothing to draw.
  return { source: img, release: () => URL.revokeObjectURL(url) };
}

function jpegName(name) {
  return `${String(name || "photo").replace(/\.[^.]+$/, "") || "photo"}.jpg`;
}

function toBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Returns a file the server will accept, converting only when it has to.
 *
 * A JPEG or PNG inside the size cap is passed straight through — re-encoding it
 * would cost quality for nothing. Anything else is drawn to a canvas and
 * re-encoded as JPEG, stepping the quality down if the first attempt is still
 * over the cap.
 *
 * Throws a message meant to be shown to whoever is uploading, naming the actual
 * remedy, because "could not upload that image" tells them nothing they can act
 * on.
 */
export async function prepareImage(file) {
  if (!shouldConvert(file)) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("that image is over 8MB and can't be shrunk automatically. Save it as a JPG first.");
    }
    return { file, converted: false };
  }

  let decoded;
  try {
    decoded = await decode(file);
  } catch {
    throw new Error(
      isHeic(file)
        ? "this browser can't open HEIC photos. Open it in Preview and export as JPEG, or set the iPhone to " +
          "Settings → Camera → Formats → Most Compatible."
        : "that image couldn't be read.",
    );
  }

  try {
    const { source } = decoded;
    const w = source.width;
    const h = source.height;
    if (!w || !h) throw new Error("empty image");

    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    // A JPEG has no transparency, so anything transparent would otherwise come
    // out black on a white product page.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    let blob = null;
    for (const quality of [0.9, 0.8, 0.7, 0.6]) {
      blob = await toBlob(canvas, quality);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) break;
    }
    if (!blob) throw new Error("encode failed");
    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new Error("that image is too large to publish even after shrinking it.");
    }

    return {
      file: new File([blob], jpegName(file.name), { type: "image/jpeg" }),
      converted: true,
    };
  } finally {
    decoded.release();
    decoded.source.close?.();
  }
}

export const _internals = { MAX_UPLOAD_BYTES, MAX_EDGE };
