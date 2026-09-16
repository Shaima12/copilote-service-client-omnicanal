import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Role = "client" | "agent" | "supervisor";

export async function requireRole(
  userId: string,
  requiredRole: Role,
  nextPath?: string
) {
  const supabase = await createClient();

  const loginRedirect = (): never => {
    const next = nextPath
      ? `?next=${encodeURIComponent(nextPath)}`
      : "";

    redirect(`/login${next}`);
  };

  // 1. Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    loginRedirect();
  }

  if (!user) {
    loginRedirect();
  }

  const authenticatedUser = user as NonNullable<typeof user>;

  // 2. Verify the URL userId belongs to the authenticated user
  if (authenticatedUser.id !== userId) {
    loginRedirect();
  }

  // 3. Get the user's profile/role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", authenticatedUser.id)
    .maybeSingle();

  if (profileError || !profile) {
    loginRedirect();
  }

  const authenticatedProfile = profile as NonNullable<typeof profile>;

  // 4. Verify the role
  if (authenticatedProfile.role !== requiredRole) {
    loginRedirect();
  }

  return {
    user: authenticatedUser,
    profile: authenticatedProfile,
  };
}