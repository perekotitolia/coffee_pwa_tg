'use client'
import React from "react";
import { useParams } from "next/navigation";

export default function Page() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">��������: {String(slug)}</h1>
      <p>�������� �������������. ������ ����� UI.</p>
    </main>
  );
}