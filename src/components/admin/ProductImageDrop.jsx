import { useRef, useState } from "react";
import { Loader2, Upload, X, Star } from "lucide-react";
import toast from "react-hot-toast";
import { uploadProductImage, AdminAuthError } from "../../api/adminApi";
import { prepareImage, looksLikeImage } from "../../utils/imageForUpload";

// Images upload the moment they are dropped, not when the product is saved.
// A five-field form that stalls for ten seconds on Save feels broken; this way
// the slow part happens while you are still typing the description.
export default function ProductImageDrop({ images, onChange, productName, canUpload, onAuthError }) {
  const [busy, setBusy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  async function accept(fileList) {
    const dropped = [...fileList];
    const files = dropped.filter(looksLikeImage);

    // Dropping a file and having nothing whatsoever happen reads as a broken
    // page. Say which ones were ignored and why.
    const skipped = dropped.filter((f) => !looksLikeImage(f));
    if (skipped.length) {
      toast.error(
        skipped.length === 1
          ? `${skipped[0].name} isn't an image.`
          : `${skipped.length} files were skipped — only images can be uploaded.`,
      );
    }
    if (!files.length) return;
    if (!canUpload) {
      toast.error("File upload isn't set up yet — paste an image URL instead.");
      return;
    }

    setBusy((n) => n + files.length);
    for (const file of files) {
      try {
        // iPhone HEIC photos and anything over the 8MB cap are re-encoded here,
        // in the browser, where the decoder already is. The server only ever
        // sees something WordPress can publish.
        const { file: ready } = await prepareImage(file);
        const { image } = await uploadProductImage({
          file: ready,
          productName,
          // Alt text is what a screen reader announces and what Google reads.
          altText: productName,
        });
        onChange((prev) => [...prev, image]);
      } catch (err) {
        if (err instanceof AdminAuthError) onAuthError(err);
        else toast.error(`${file.name}: ${err.message}`);
      } finally {
        setBusy((n) => n - 1);
      }
    }
  }

  const remove = (idx) => onChange((prev) => prev.filter((_, i) => i !== idx));
  // WooCommerce treats the first image as the one shown in listings.
  const makeFirst = (idx) =>
    onChange((prev) => [prev[idx], ...prev.filter((_, i) => i !== idx)]);

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors ${
          dragging ? "border-ayur-green bg-ayur-green/5" : "border-slate-300 hover:bg-slate-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(e) => { accept(e.target.files); e.target.value = ""; }}
        />
        {busy > 0 ? (
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={15} className="animate-spin" /> Uploading {busy} image{busy > 1 ? "s" : ""}…
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Upload size={15} /> Drop images here, or click to choose
          </span>
        )}
        <p className="text-[10px] text-slate-400 mt-1">
          JPG, PNG, WebP or iPhone HEIC · large photos are shrunk automatically · the first image is the one customers see in listings
        </p>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2.5">
          {images.map((img, idx) => (
            <div key={img.id || img.src} className="relative group">
              <img
                src={img.src}
                alt=""
                className={`w-20 h-20 object-cover rounded-lg border-2 ${
                  idx === 0 ? "border-ayur-green" : "border-slate-200"
                }`}
              />
              {idx === 0 && (
                <span className="absolute bottom-0 inset-x-0 bg-ayur-green text-white text-[9px] text-center rounded-b-md py-0.5">
                  Main
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(idx)}
                title="Remove"
                className="absolute -top-1.5 -right-1.5 bg-white border border-slate-300 rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
              {idx !== 0 && (
                <button
                  type="button"
                  onClick={() => makeFirst(idx)}
                  title="Use as the main image"
                  className="absolute -top-1.5 -left-1.5 bg-white border border-slate-300 rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Star size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
