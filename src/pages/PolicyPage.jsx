import { useParams, Navigate } from "react-router-dom";
import { policies } from "../data/policies";
import { useSeo } from "../utils/useSeo";

export default function PolicyPage() {
  const { policyId } = useParams();
  const policy = policies[policyId];

  useSeo({
    title: policy?.title,
    description: policy
      ? `${policy.title} — ${policy.content.replace(/\s+/g, " ").trim().slice(0, 150)}`
      : undefined,
    path: `/policy/${policyId}`,
  });

  if (!policy) return <Navigate to="/" replace />;

  return (
    <div className="container-px max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{policy.title}</h1>
      <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-line leading-relaxed">
        {policy.content}
      </div>
    </div>
  );
}
