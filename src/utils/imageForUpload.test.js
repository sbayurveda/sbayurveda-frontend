import { describe, it, expect } from "vitest";
import { isHeic, looksLikeImage, prepareImage, _internals } from "./imageForUpload";

// File exists in jsdom and in node 20+, so these are real File objects.
const file = (name, type, size = 1024) => {
  const f = new File([new Uint8Array(1)], name, { type });
  // A real multi-megabyte buffer per case would make the suite slow for no gain.
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("spotting an iPhone photo", () => {
  it("recognises HEIC by content type", () => {
    expect(isHeic(file("IMG_4821.jpg", "image/heic"))).toBe(true);
    expect(isHeic(file("IMG_4821.jpg", "image/heif"))).toBe(true);
  });

  it("recognises HEIC by extension when the browser reports no type", () => {
    // AirDrop and Finder both do this.
    expect(isHeic(file("IMG_4821.HEIC", ""))).toBe(true);
    expect(isHeic(file("IMG_4821.heif", ""))).toBe(true);
  });

  it("does not mistake an ordinary photo for one", () => {
    expect(isHeic(file("photo.jpg", "image/jpeg"))).toBe(false);
    expect(isHeic(file("photo.png", "image/png"))).toBe(false);
  });
});

describe("deciding what to even try uploading", () => {
  it("accepts a file whose type the browser left blank", () => {
    // This is the case that used to vanish without a word.
    expect(looksLikeImage(file("product.png", ""))).toBe(true);
  });

  it("accepts a content type carrying a parameter", () => {
    expect(looksLikeImage(file("product.png", "image/png;charset=binary"))).toBe(true);
  });

  it("accepts HEIC, which is converted rather than refused", () => {
    expect(looksLikeImage(file("IMG_1.HEIC", ""))).toBe(true);
  });

  it("rejects things that are not images", () => {
    expect(looksLikeImage(file("catalogue.pdf", "application/pdf"))).toBe(false);
    expect(looksLikeImage(file("prices.csv", "text/csv"))).toBe(false);
    expect(looksLikeImage(null)).toBe(false);
  });
});

describe("preparing a file for upload", () => {
  it("passes an ordinary JPEG through untouched", async () => {
    // Re-encoding a file that is already fine would cost quality for nothing.
    const input = file("photo.jpg", "image/jpeg", 900 * 1024);
    const out = await prepareImage(input);
    expect(out.converted).toBe(false);
    expect(out.file).toBe(input);
  });

  it("leaves an animated GIF alone and says why it can't be shrunk", async () => {
    // A canvas re-encode would silently drop the animation, so an oversized GIF
    // is reported rather than quietly ruined.
    const big = file("loop.gif", "image/gif", _internals.MAX_UPLOAD_BYTES + 1);
    await expect(prepareImage(big)).rejects.toThrow(/over 8MB/);
  });

  it("names the remedy when a HEIC photo cannot be decoded", async () => {
    // jsdom has no image decoder, which is exactly the Chrome-on-HEIC case.
    const heic = file("IMG_4821.HEIC", "image/heic", 2 * 1024 * 1024);
    await expect(prepareImage(heic)).rejects.toThrow(/HEIC|Most Compatible/);
  });
});
