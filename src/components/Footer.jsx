import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import { siteInfo } from "../data/siteInfo";
import { getDeliveryEstimate } from "../utils/pincode";

export default function Footer() {
  const [pincode, setPincode] = useState("");
  const [pincodeResult, setPincodeResult] = useState(null);
  const [checking, setChecking] = useState(false);

  async function checkPincode(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeResult({ ok: false, msg: "Please enter a valid 6-digit pincode" });
      return;
    }
    setChecking(true);
    setPincodeResult(null);
    try {
      const est = await getDeliveryEstimate(pincode);
      setPincodeResult({
        ok: true,
        msg: est.guessed || !est.state
          ? `Delivery available at ${pincode}! Estimated ${est.days.min}-${est.days.max} business days.`
          : `Delivery available to ${est.state}! Estimated ${est.days.min}-${est.days.max} business days.`,
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <footer className="bg-ayur-green-dark text-white/90 mt-16">
      <div className="container-px max-w-7xl mx-auto py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Brand */}
        <div className="lg:col-span-2">
          <Link to="/" className="flex items-center gap-2 mb-3 w-fit">
            <img src={siteInfo.logoUrl} alt="SB Ayurveda" className="h-10 w-auto bg-white/95 rounded-lg p-1" />
          </Link>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            India's #1 most affordable online Ayurvedic store. 100% genuine products from
            Dabur, Baidyanath, Zandu, Himalaya, Kottakkal, Patanjali & our own SB Ayurveda
            range — backed by a 2X Refund Guarantee on lowest price.
          </p>
          <div className="flex items-center gap-3">
            <a href="#" aria-label="Facebook" className="bg-white/10 w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-xs font-bold">
              f
            </a>
            <a href="#" aria-label="Instagram" className="bg-white/10 w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-xs font-bold">
              IG
            </a>
            <a href="#" aria-label="Twitter / X" className="bg-white/10 w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-xs font-bold">
              X
            </a>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">
            Quick Links
          </h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li><Link to="/category/popular" className="hover:text-white">Shop All Products</Link></li>
            <li><Link to="/offers" className="hover:text-white">Today's Offers</Link></li>
            <li><Link to="/upload-prescription" className="hover:text-white">Upload Prescription</Link></li>
            <li><Link to="/track-order" className="hover:text-white">My Account</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">
            Legal
          </h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link to="/policy/terms" className="hover:text-white">Terms & Conditions</Link></li>
            <li><Link to="/policy/refund" className="hover:text-white">Return and Refund Policy</Link></li>
            <li><Link to="/policy/2x-guarantee" className="hover:text-white">2X Refund Guarantee Policy</Link></li>
            <li><Link to="/policy/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link to="/policy/shipping" className="hover:text-white">Shipping Policy</Link></li>
            <li><Link to="/policy/payment" className="hover:text-white">Payment Policy</Link></li>
          </ul>
        </div>

        {/* Contact + pincode */}
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">
            Check Delivery
          </h4>
          <form onSubmit={checkPincode} className="flex gap-2 mb-3">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter Pincode"
              className="min-w-0 flex-1 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none"
            />
            <button disabled={checking} className="btn-gold px-3 py-2 text-sm shrink-0 disabled:opacity-60 flex items-center gap-1.5">
              {checking && <Loader2 size={13} className="animate-spin" />} Check
            </button>
          </form>
          {pincodeResult && (
            <p className={`text-xs mb-3 ${pincodeResult.ok ? "text-ayur-yellow" : "text-red-300"}`}>
              {pincodeResult.msg}
            </p>
          )}
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <Phone size={14} className="shrink-0" />
              <a href={siteInfo.phoneHref} className="hover:text-white">{siteInfo.phone}</a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={14} className="shrink-0" />
              <a href={`mailto:${siteInfo.email}`} className="hover:text-white">{siteInfo.email}</a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin size={14} className="shrink-0 mt-0.5" />
              <span>{siteInfo.address}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-px max-w-7xl mx-auto py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <span>© {new Date().getFullYear()} SB Ayurveda. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-ayur-yellow" /> 100% Genuine · 2X Refund
            Guarantee · Razorpay Secured
          </span>
        </div>
      </div>
    </footer>
  );
}
