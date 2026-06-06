import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

export function createClient(request: NextRequest) {
  let cookieStore = request.cookies;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            cookieStore.set(name, value),
          );
        },
      },
    },
  );
}
