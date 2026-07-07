import { supabase } from "./supabase";

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function updateClientAvatar(
  clientId: string,
  avatarUrl: string
): Promise<void> {
  const { error } = await supabase
    .from("clients")
    .update({ avatar_url: avatarUrl })
    .eq("id", clientId);
  if (error) throw error;
}
