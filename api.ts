import { supabase } from "./supabase";
import type { BlockStatus, Chat, Country, Message, ScheduleSlot } from "@/types/db";

export const PAGE_SIZE = 30;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export async function listChats(): Promise<Chat[]> {
  const { data, error } = await supabase.from("chats").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as Chat[];
}

export async function createChat(): Promise<Chat> {
  const { data, error } = await supabase.from("chats").insert({}).select("*").single();
  if (error) throw error;
  return data as Chat;
}

export async function renameChat(id: string, title: string): Promise<void> {
  const clean = title.trim().slice(0, 120);
  if (!clean) return;
  const { error } = await supabase.from("chats").update({ title: clean }).eq("id", id);
  if (error) throw error;
}

export async function deleteChat(id: string): Promise<void> {
  const { error } = await supabase.from("chats").delete().eq("id", id);
  if (error) throw error;
}

/** Pagination : les PAGE_SIZE messages les plus récents, ou ceux d'avant `before`. */
export async function loadMessages(chatId: string, before?: string): Promise<{ messages: Message[]; hasMore: boolean }> {
  let q = supabase
    .from("messages")
    .select("id,chat_id,role,content,image_path,created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Message[];
  return { messages: rows.slice(0, PAGE_SIZE).reverse(), hasMore: rows.length > PAGE_SIZE };
}

export function validateImage(file: File): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return "Formats acceptés : JPG, PNG ou WebP.";
  if (file.size > MAX_IMAGE_BYTES) return "L'image dépasse 5 Mo. Prends-la en plus petit.";
  return null;
}

export async function uploadExercise(file: File, userId: string): Promise<string> {
  const err = validateImage(file);
  if (err) throw new Error(err);
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("exercises").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function signedImageUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("exercises").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function getBlockStatus(): Promise<BlockStatus> {
  const { data, error } = await supabase.rpc("get_block_status");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { blocked: Boolean(row?.blocked), until_hour: row?.until_hour ?? null };
}

export async function getCountries(): Promise<Country[]> {
  const { data, error } = await supabase.from("countries").select("code,name_fr,timezone").order("name_fr");
  if (error) throw error;
  const list = (data ?? []) as Country[];
  // Burkina Faso en premier
  return [...list.filter((c) => c.code === "BF"), ...list.filter((c) => c.code !== "BF")];
}

export async function getSchedule(): Promise<ScheduleSlot[]> {
  const { data, error } = await supabase.from("schedules").select("day,start_hour,end_hour,subject").order("day").order("start_hour");
  if (error) throw error;
  return (data ?? []) as ScheduleSlot[];
}

export async function validateSchedule(slots: { day: number; start_hour: number; subject: string }[]): Promise<void> {
  const { error } = await supabase.rpc("validate_schedule", { p_slots: slots });
  if (error) throw error;
}
