import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, MessageCircle, Stethoscope, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { buildWhatsAppLink } from "../utils/whatsapp";
import { sendNotification } from "../api/checkoutBridge";

const PREFERRED_TIMES = ["As soon as possible", "Morning (9AM-12PM)", "Afternoon (12-4PM)", "Evening (4-8PM)"];

export default function DoctorAppointmentModal({ open, onClose }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [concern, setConcern] = useState("");
  const [preferredTime, setPreferredTime] = useState(PREFERRED_TIMES[0]);
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
        subject: "Doctor Appointment Request",
        lines: [
          ["Name", name],
          ["Phone", phone],
          ["Preferred time", preferredTime],
          ["Health concern", concern || "N/A"],
        ],
      });
      toast.success("Appointment request sent — our doctor's team will confirm shortly.");
    } catch {
      // Email not set up yet, or the send failed — fall back to WhatsApp so
      // the request still goes through.
      const msg = `Hi SB Ayurveda, I'd like to request a doctor appointment.\n\nName: ${name}\nPhone: ${phone}\nPreferred time: ${preferredTime}\nHealth concern: ${
        concern || "N/A"
      }`;
      window.open(buildWhatsAppLink(msg), "_blank");
      toast("Redirecting to WhatsApp instead...", { icon: "📱" });
    } finally {
      setSending(false);
      setName("");
      setPhone("");
      setConcern("");
      setPreferredTime(PREFERRED_TIMES[0]);
      onClose();
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
                <Stethoscope className="text-ayur-green" size={22} />
                <h3 className="font-bold text-lg">Request a Doctor Appointment</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Share your details and preferred time — our Ayurvedic doctor's team will
                reach out to schedule your consultation. Free of charge.
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
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30 bg-white text-gray-700"
                >
                  {PREFERRED_TIMES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <textarea
                  value={concern}
                  onChange={(e) => setConcern(e.target.value)}
                  placeholder="Describe your health concern (optional)"
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ayur-green/30"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg py-2.5 text-sm disabled:opacity-60"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                  {sending ? "Sending..." : "Request Appointment"}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
