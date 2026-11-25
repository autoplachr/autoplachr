import { localApi, localDemo } from "./local-demo";
import type { WorkingHours } from "../src/data/working-hours";
import type { Vehicle } from "./catalog";
import { isSupabaseConfigured } from "../src/lib/supabase/client";
import { supabaseApi } from "../src/lib/supabase/account-bridge";

export type Profile = {
  type: "private" | "dealer";
  name: string;
  fullName?: string;
  companyName?: string;
  avatarUrl?: string;
  city: string;
  county: string;
  phone: string;
  postalCode?: string;
  workingHours?: WorkingHours;
  oib?: string;
  address?: string;
  hours?: string;
  subdomain?: string;
  importUrl?: string;
  whatsappPhone?: string;
  trialStartedAt?: string;
  subscriptionTier?: "starter" | "pro" | "ai_partner";
  aiImpressions?: number;
  alerts: boolean;
  analytics: boolean;
  emailNotifications?: boolean;
  priceAlertEmails?: boolean;
};

export type ListingStatus = "active" | "paused" | "draft" | "sold";
export type LeadEvent = "view" | "phone_reveal" | "whatsapp" | "message";
export type LeadReply = { text: string; created_at: string };
export type ListingLead = {
  id: string; listing_id: string; event_type: LeadEvent; created_at: string; is_read: boolean;
  buyer_name?: string; buyer_phone?: string; buyer_email?: string; message_text?: string;
  replies: LeadReply[];
};
export type SellerAnalytics = {
  metrics: { listingId: string; views: number; phone: number; whatsapp: number; messages: number }[];
  activity: ListingLead[]; inquiries: ListingLead[]; unread: number;
};

export type OwnedListing = Vehicle & {
  status: ListingStatus;
  views: number;
  reveals: number;
  inquiriesCount?: number;
};

export type FavoriteEntry = {
  id: string;
  price: number;
  priceAlert?: boolean;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export type Conversation = {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehiclePriceEur: number;
  vehicleImage?: string;
  buyerId: string;
  sellerId: string;
  partnerName: string;
  partnerCity?: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: ChatMessage[];
};

export type Account = {
  id: string;
  email: string;
  profile: Profile;
  verified: boolean;
  listings: OwnedListing[];
  favorites: FavoriteEntry[];
  conversations?: Conversation[];
  unreadCount?: number;
  moderator: boolean;
};

export type Report = {
  id: string;
  listing_id: string;
  url: string;
  reason: string;
  details: string;
  name?: string;
  email?: string;
  status: string;
  decision?: string;
};

export const leadTrackingAvailable = () => isSupabaseConfigured || localDemo();

export async function api<T = unknown>(endpoint: string, data?: object): Promise<T> {
  if (isSupabaseConfigured) {
    const handled = await supabaseApi(endpoint, data);
    if (handled !== undefined) return handled as T;
  }
  if (localDemo()) return (await localApi(endpoint, data)) as T;
  const response = await fetch("/api/" + endpoint, data ? {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  } : undefined);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(body?.error || "Usluga trenutačno nije dostupna."), { fields: body?.fields });
  return body as T;
}
