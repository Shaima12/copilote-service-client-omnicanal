import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Role = "client" | "agent" | "supervisor";

export async function requireRole(
  userId: string,
  requiredRole: Role,
  nextPath?: string
) {
  const supabase = await createClient();

  const loginPath = nextPath
    ? `/login?next=${encodeURIComponent(nextPath)}`
    : "/login";

  // 1. Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(loginPath);
  }

  // 2. Verify the URL userId belongs to the authenticated user
  if (user.id !== userId) {
    redirect("/unauthorized");
  }

  // 3. Get the user's profile/role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/unauthorized");
  }

  // 4. Verify the role
  if (profile.role !== requiredRole) {
    redirect("/unauthorized");
  }

  return {
    user,
    profile,
  };
}