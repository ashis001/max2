"use client";

import { usePathname } from "next/navigation";
import { AgenQAgent } from "./AgenQAgent";

export default function AgentProvider() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return <AgenQAgent />;
}
