/** Liste d'attente des pièces épuisées. */
import { kv } from "@/lib/store";

export interface WaitlistEntry {
  email: string;
  handle: string;
  size: string | null;
  date: string;
  notifiedAt?: string;
}

export const WAITLIST_KEY = "waitlist";

export async function getWaitlist(): Promise<WaitlistEntry[]> {
  return (await kv.get<WaitlistEntry[]>(WAITLIST_KEY)) ?? [];
}
