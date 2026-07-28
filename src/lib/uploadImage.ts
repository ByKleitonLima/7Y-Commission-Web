import { supabase } from "@/lib/supabase";

const BUCKET = "photos";

export async function uploadImageFile(file: File, pathPrefix: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}