import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set",
    );
  _client = createClient(url, key);
  return _client;
}

const BUCKET = "audio";

export async function uploadAudio(
  filename: string,
  buffer: Buffer,
): Promise<string> {
  const supabase = getClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}
