"use client";

import { useParams } from "next/navigation";
import { Bounty } from "@/client/bounties";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <Bounty id={String(id)} />;
}
