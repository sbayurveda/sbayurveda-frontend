import { FileCheck2, MessageCircle } from "lucide-react";

export default function PrescriptionCTA({ onOpen }) {
  return (
    <section className="container-px max-w-7xl mx-auto py-6">
      <div className="bg-gradient-to-r from-ayur-cream to-amber-50 border border-ayur-gold/30 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="bg-white rounded-full p-4 shadow-card shrink-0">
          <FileCheck2 size={32} className="text-ayur-green" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h3 className="font-bold text-lg text-gray-800 mb-1">
            Have a Prescription? Or Need Expert Advice?
          </h3>
          <p className="text-sm text-gray-600">
            Upload your prescription or chat with our Ayurvedic doctors for free —
            we'll help you find the right, most affordable medicines.
          </p>
        </div>
        <button
          onClick={onOpen}
          className="btn-primary px-6 py-3 text-sm flex items-center gap-2 shrink-0"
        >
          <MessageCircle size={16} /> Upload / Ask Now
        </button>
      </div>
    </section>
  );
}
