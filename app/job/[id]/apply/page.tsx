"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ApplyPageProps {
  params: { id: string };
}

const ApplyPage: React.FC<ApplyPageProps> = ({ params }) => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <button
        type="button"
        onClick={handleBack}
        className="mb-4 text-sm text-blue-600 hover:underline"
      >
        ← Back to job
      </button>

      <h1 className="text-2xl font-semibold mb-4">
        Apply for job #{params.id}
      </h1>

      <p className="text-gray-600 mb-6">
        The application flow for this job is coming soon. For now, please apply
        directly on the original job posting or use your saved CV.
      </p>

      <Link
        href="/"
        className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50"
      >
        Go to home
      </Link>
    </main>
  );
};

export default ApplyPage;

