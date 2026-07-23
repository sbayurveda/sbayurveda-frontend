import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PrescriptionModal from "../components/PrescriptionModal";

export default function UploadPrescription() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) navigate("/");
  }, [open, navigate]);

  return <PrescriptionModal open={open} onClose={() => setOpen(false)} />;
}
