import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Upload, MessageCircle, FileCheck2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { buildWhatsAppLink } from "../utils/whatsapp";
import { sendNotification } from "../api/checkoutBridge";

export default function PrescriptionModal({ open, onClose }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [fileName, setFileName] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !/^\d{10}$/.test(phone)) {
      toast.error("Please enter your name and a valid 10-digit phone number");
      return;
    }

    setSending(true);
    try {
      await sendNotification({
        subject: "Prescription Upload Request",
        lines: [
          ["Name", name],
          ["Phone", phone],
          ["Note", note || "N/A"],
          ["File", fileName ? `${fileName} (attach separately — email doesn't carry the file yet)` : "Not attached, will share on WhatsApp"],
        ],
      });
      toast.success("Sent! Our team will reach out on your phone number shortly.");
      onClose();
    } catch {
      // Email not set up yet, or the send failed — fall back to WhatsApp so
      // the customer's request still goes through either way.
      const msg = `Hi SB Ayurveda, I'd like a free doctor consultation.\n\nName: ${name}\nPhone: ${phone}\nNote: ${
        note || "N/A"
      }\nPrescription file: ${fileName || "Will share on WhatsApp"}`;
      window.open(buildWhatsAppLink(msg), "_blank");
      toast("Redirecting to WhatsApp instead...", { icon: "📱" });
      onClose();
    } finally {
      setSending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <FileCheck2 className="text-ayur-green" size={22} />
                <h3 className="font-bold text-lg">Upload Prescription / Ask a Doctor</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Get free Ayurvedic doctor advice or order directly via WhatsApp — no charges.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit Phone Number"
                  inputMode="numeric"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30"
                />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Describe your health concern (optional)"
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30"
                />
                <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-500 cursor-pointer hover:border-ayur-green">
                  <Upload size={16} />
                  {fileName || "Upload prescription image / PDF (optional)"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                  />
                </label>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-60"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                  {sending ? "Sending..." : "Send Request"}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
