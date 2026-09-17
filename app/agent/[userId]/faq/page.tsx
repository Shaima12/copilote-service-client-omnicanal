"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BookOpen,
  MessageSquare,
  CircleHelp,
  UserCircle,
  LogOut,
  Search,
  FileText,
  Folder,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import WorkspaceTopBar from "@/components/workspace-top-bar";

type Category = {
  id: string;
  name: string;
};

type Article = {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  updated_at: string;
};

export default function AgentFAQPage() {
  const router = useRouter();
  const pathname = usePathname();
  const routeUserId = pathname.split("/")[2];
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

  useEffect(() => {
    loadFAQ();
  }, []);

  async function loadFAQ() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "agent") {
      router.push("/login");
      return;
    }

    const { data: categoryData } = await supabase
      .from("faq_categories")
      .select("id, name")
      .order("name");

    const { data: articleData, error } = await supabase
      .from("faq_articles")
      .select(
        "id, title, content, category_id, updated_at"
      )
      .eq("status", "published")
      .order("updated_at", {
        ascending: false,
      });

    if (error) {
      console.error("FAQ error:", error);
    }

    setCategories(categoryData || []);
    setArticles(articleData || []);
    setLoading(false);
  }

  function getCategoryName(categoryId: string | null) {
    if (!categoryId) return "General";

    return (
      categories.find(
        (category) => category.id === categoryId
      )?.name || "General"
    );
  }

  const filteredArticles = articles.filter((article) => {

    const matchesCategory =
      selectedCategory === null ||
      article.category_id === selectedCategory;

    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      article.title.toLowerCase().includes(query) ||
      article.content.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="flex min-h-screen">
          <aside className="hidden w-64 border-r border-gray-200 bg-white md:block" />

          <main className="flex-1 p-6 md:p-10">

            <div className="mx-auto max-w-7xl">

              <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-200" />

              <div className="mt-8 h-12 animate-pulse rounded-xl bg-white" />

              <div className="mt-6 h-64 animate-pulse rounded-2xl bg-white" />

            </div>

          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900">

      {/* ================= MOBILE HEADER ================= */}

      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white md:hidden">

        <div className="flex items-center justify-between px-5 py-4">

          <div>

            <h1 className="text-xl font-bold tracking-tight">
              ZEN
            </h1>

            <p className="text-[11px] text-gray-500">
              Agent workspace
            </p>

          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <LogOut size={19} />
          </button>

        </div>


        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2">

          <MobileNavItem
            icon={<Home size={17} />}
            label="Home"
            onClick={() => router.push(`/agent/${routeUserId}`)}
          />

          <MobileNavItem
            icon={<CircleHelp size={17} />}
            label="FAQ"
            active
            onClick={() =>
              router.push(`/agent/${routeUserId}/faq`)
            }
          />

          <MobileNavItem
            icon={<MessageSquare size={17} />}
            label="Conversations"
            onClick={() =>
              router.push(`/agent/${routeUserId}/conversations`)
            }
          />

          <MobileNavItem
            icon={<UserCircle size={17} />}
            label="Profile"
            onClick={() =>
              router.push(`/agent/${routeUserId}/profile`)
            }
          />

        </nav>

      </header>


      <div className="flex min-h-screen">

        {/* ================= SIDEBAR ================= */}

        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-gray-200 bg-white md:flex md:flex-col">

          <div className="border-b border-gray-100 px-6 py-6">

            <h1 className="text-2xl font-bold tracking-tight">
              ZEN
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              Agent workspace
            </p>

          </div>


          <nav className="flex-1 px-4 py-6">

            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Workspace
            </p>

            <div className="space-y-1">

              <SidebarItem
                icon={<Home size={18} />}
                label="Home"
                onClick={() => router.push(`/agent/${routeUserId}`)}
              />

              <SidebarItem
                icon={<CircleHelp size={18} />}
                label="FAQ"
                active
                onClick={() =>
                  router.push(`/agent/${routeUserId}/faq`)
                }
              />

              <SidebarItem
                icon={<MessageSquare size={18} />}
                label="Conversations"
                onClick={() =>
                  router.push(`/agent/${routeUserId}/conversations`)
                }
              />

              <SidebarItem
                icon={<UserCircle size={18} />}
                label="Profile"
                onClick={() =>
                  router.push(`/agent/${routeUserId}/profile`)
                }
              />

            </div>

          </nav>


          <div className="border-t border-gray-100 p-4">

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut size={18} />
              Sign out
            </button>

          </div>

        </aside>


        {/* ================= MAIN ================= */}

        <main className="flex-1 md:ml-64">

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">

            <WorkspaceTopBar userId={routeUserId} role="agent" />

            {/* HEADER */}

            <div>

              <p className="text-sm font-medium text-gray-500">
                Agent workspace
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                FAQ
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Find approved answers and information for
                customer conversations.
              </p>

            </div>


            {/* SEARCH */}

            <div className="relative mt-7 max-w-2xl">

              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search the FAQ..."
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
              />

            </div>


            {/* CONTENT */}

            <div className="mt-7 grid gap-6 lg:grid-cols-[240px_1fr]">

              {/* CATEGORIES */}

              <section className="h-fit rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

                <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Categories
                </p>


                <button
                  onClick={() =>
                    setSelectedCategory(null)
                  }
                  className={`mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${
                    selectedCategory === null
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >

                  <span className="flex items-center gap-2.5">

                    <FileText size={16} />

                    All FAQ

                  </span>

                  <span className="text-xs text-gray-400">
                    {articles.length}
                  </span>

                </button>


                {categories.map((category) => {

                  const count = articles.filter(
                    (article) =>
                      article.category_id === category.id
                  ).length;

                  // Don't show empty categories
                  if (count === 0) return null;

                  return (
                    <button
                      key={category.id}
                      onClick={() =>
                        setSelectedCategory(category.id)
                      }
                      className={`mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${
                        selectedCategory === category.id
                          ? "bg-blue-50 font-medium text-blue-700"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >

                      <span className="flex min-w-0 items-center gap-2.5">

                        <Folder
                          size={16}
                          className="shrink-0"
                        />

                        <span className="truncate">
                          {category.name}
                        </span>

                      </span>

                      <span className="text-xs text-gray-400">
                        {count}
                      </span>

                    </button>
                  );
                })}

              </section>


              {/* ARTICLES */}

              <section className="rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

                <div className="border-b border-gray-100 px-5 py-4">

                  <h2 className="text-sm font-semibold">
                    Approved answers
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400">
                    {filteredArticles.length} published{" "}
                    {filteredArticles.length === 1
                      ? "article"
                      : "articles"}
                  </p>

                </div>


                {filteredArticles.length === 0 ? (

                  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-gray-400">

                      <FileText size={22} />

                    </div>

                    <h3 className="mt-4 text-sm font-medium">
                      No FAQ found
                    </h3>

                    <p className="mt-1 max-w-sm text-xs leading-5 text-gray-400">
                      Try another search or choose another
                      category.
                    </p>

                  </div>

                ) : (

                  <div className="divide-y divide-gray-100">

                    {filteredArticles.map((article) => (

                      <article
                        key={article.id}
                        className="px-5 py-5 transition hover:bg-gray-50/60"
                      >

                        <div className="flex items-start justify-between gap-5">

                          <div className="min-w-0">

                            <div className="flex items-center gap-2">

                              <h3 className="font-medium text-gray-900">
                                {article.title}
                              </h3>

                            </div>


                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">

                              <span>
                                {getCategoryName(
                                  article.category_id
                                )}
                              </span>

                              <span>•</span>

                              <span>
                                Updated{" "}
                                {new Date(
                                  article.updated_at
                                ).toLocaleDateString()}
                              </span>

                            </div>


                            <p className="mt-3 text-sm leading-6 text-gray-600">
                              {article.content}
                            </p>

                          </div>


                          <ChevronRight
                            size={17}
                            className="mt-1 shrink-0 text-gray-300"
                          />

                        </div>

                      </article>

                    ))}

                  </div>

                )}

              </section>

            </div>

          </div>

        </main>

      </div>

    </div>
  );
}


/* ========================================================= */
/* SIDEBAR ITEM                                               */
/* ========================================================= */

function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
        active
          ? "bg-blue-50 font-medium text-blue-700"
          : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span
        className={
          active ? "text-blue-600" : "text-gray-500"
        }
      >
        {icon}
      </span>

      <span>{label}</span>
    </button>
  );
}


/* ========================================================= */
/* MOBILE ITEM                                                */
/* ========================================================= */

function MobileNavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

