import { siteInfo } from "../data/siteInfo";

export function buildWhatsAppLink(message) {
  return `https://wa.me/${siteInfo.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function whatsappForQuery() {
  return buildWhatsAppLink(
    "Hi SB Ayurveda! I'd like a free Ayurvedic doctor consultation / have a query about a product."
  );
}
