import { StallShell } from "@/client/App";

export default function StallLayout({ children }: { children: React.ReactNode }) {
  return <StallShell>{children}</StallShell>;
}
