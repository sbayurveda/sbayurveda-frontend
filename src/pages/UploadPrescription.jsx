import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PrescriptionModal from "../components/PrescriptionModal";
import { useSeo } from "../utils/useSeo";

export default function UploadPrescription() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  useSeo({
    title: "Upload Prescription",
    description: "Upload your doctor's prescription and our Ayurvedic experts will help you order the right genuine products at SB Ayurveda's lowest prices.",
    path: "/upload-prescription",
  });

  useEffect(() => {
    if (!open) navigate("/");
  }, [open, navigate]);

  return <PrescriptionModal open={open} onClose={() => setOpen(false)} />;
}
