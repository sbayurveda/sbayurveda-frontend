import { ShieldCheck, Tag, Truck, Stethoscope } from "lucide-react";

const items = [
  { icon: ShieldCheck, title: "100% Genuine Products", subtitle: "Sourced from authorized brand distributors" },
  { icon: Tag, title: "Lowest Price Guaranteed", subtitle: "Find it cheaper? Get 2X refund" },
  { icon: Truck, title: "Express Doorstep Delivery", subtitle: "Same day dispatch, COD available" },
  { icon: Stethoscope, title: "Free Doctor Consultation", subtitle: "Chat with our Ayurvedic experts" },
];

export default function TrustStrip() {
  return (
    <section className="bg-white border-y border-gray-100">
      <div className="container-px max-w-7xl mx-auto py-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item) => (
          <div key={item.title} className="flex flex-col sm:flex-row items-center sm:items-start gap-2 text-center sm:text-left">
            <div className="bg-ayur-cream rounded-full p-2.5 shrink-0">
              <item.icon size={20} className="text-ayur-green" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-gray-800">{item.title}</p>
              <p className="text-[11px] text-gray-500 hidden sm:block">{item.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
