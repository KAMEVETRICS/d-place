"use client";

import { useParams } from "next/navigation";
import { Person } from "@/client/account";

export default function Page() {
  const { username } = useParams<{ username: string }>();
  return <Person username={String(username)} />;
}
