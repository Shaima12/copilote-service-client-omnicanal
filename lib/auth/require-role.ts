import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Role = "client" | "agent" | "supervisor";

export async function requireRole(
  userId: string,
  requiredRole: Role
) {
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
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