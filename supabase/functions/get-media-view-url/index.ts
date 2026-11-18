import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const allowedMime: Record<string, string[]> = {
  video: ["video/mp4", "video/webm"],
  pdf: ["application/pdf"],
};

// Best-effort per-isolate throttle. Configure gateway/WAF rate limiting for
// durable distributed limits; this map is deliberately bounded.
const hits = new Map<string, { count: number; resetAt: number }>();
function overLimit(key: string): boolean {
  const now = Date.now();
  for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  const current = hits.get(key);
  if (!current || current.resetAt <= now) {
    if (hits.size > 5000) hits.clear();
    hits.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 40;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse({ error: "Invalid request" }, 415);
  }

  const clientKey = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "shared";
  if (overLimit(clientKey)) return jsonResponse({ error: "Too many requests" }, 429);

  try {
    const raw = await req.text();
    if (raw.length > 2048) return jsonResponse({ error: "Invalid request" }, 413);
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ error: "Invalid request" }, 400);
    }

    const section = body.section;
    const id = typeof body.id === "string" || typeof body.id === "number" ? String(body.id) : "";
    if (!["offers", "portfolio_items"].includes(section) || !/^[1-9][0-9]{0,18}$/.test(id)) {
      return jsonResponse({ error: "Invalid request" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Service unavailable" }, 503);
    }

    // Service credentials exist only in this Edge Function runtime.
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const table = section as "offers" | "portfolio_items";
    const { data: item, error: dbError } = await supabase
      .from(table)
      .select("id, media_type, media_path, media_mime_type, is_published")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();

    if (dbError || !item) return jsonResponse({ error: "Media not available" }, 404);
    if (item.media_type !== "video" && item.media_type !== "pdf") {
      return jsonResponse({ error: "Media not available" }, 404);
    }
    if (!allowedMime[item.media_type]?.includes(item.media_mime_type || "")) {
      return jsonResponse({ error: "Media not available" }, 404);
    }

    const path = item.media_path;
    const prefix = section === "offers" ? `offers/${id}/` : `portfolio/${id}/`;
    const extAllowed = item.media_type === "pdf" ? /\.pdf$/i : /\.(mp4|webm)$/i;
    if (
      typeof path !== "string" ||
      path.length > 512 ||
      !path.startsWith(prefix) ||
      path.includes("..") ||
      path.includes("\\") ||
      path.includes("\0") ||
      path.split("/").some((part: string) => !part || part === "." || part === "..") ||
      !extAllowed.test(path)
    ) {
      return jsonResponse({ error: "Media not available" }, 404);
    }

    const { data: signed, error: storageError } = await supabase.storage
      .from("masar-private-media")
      .createSignedUrl(path, 300);

    if (storageError || !signed?.signedUrl) {
      return jsonResponse({ error: "Media not available" }, 404);
    }

    return jsonResponse({
      url: signed.signedUrl,
      media_type: item.media_type,
      expires_in: 300,
    });
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }
});
