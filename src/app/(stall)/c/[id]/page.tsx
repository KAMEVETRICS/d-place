"use client";

import { useParams } from "next/navigation";
import { Listing } from "@/client/listings";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <Listing id={String(id)} />;
}
