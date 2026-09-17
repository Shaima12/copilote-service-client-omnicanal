"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BookOpen,
  LayoutDashboard,
  AlertTriangle,
  LogOut,
  Plus,
  Folder,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import WorkspaceTopBar from "@/components/workspace-top-bar";

type Category = {
  id: string;
  name: string;
  description: string | null;
};

type Article = {
  id: string;
  title: string;
  content: string;
  status: "draft" | "published";
  category_id: string | null;
  created_at: string;
  updated_at: string;
};

type DeleteTarget = {
  type: "article" | "category";
  id: string;
  name: string;
} | null;

export default function KnowledgeBasePage() {
  const router = useRouter();
  const pathname = usePathname();
  const routeUserId = pathname.split("/")[2];
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showArticleForm, setShowArticleForm] = useState(false);

  // Edit mode
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] =
    useState<DeleteTarget>(null);
  const [deleting, setDeleting] = useState(false);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const [articleTitle, setArticleTitle] = useState("");
  const [articleContent, setArticleContent] = useState("");
  const [articleCategory, setArticleCategory] = useState("");

  // New: Draft or Published when creating/editing
  const [articleStatus, setArticleStatus] =
    useState<"draft" | "published">("draft");

  const [savingCategory, setSavingCategory] = useState(false);
  const [savingArticle, setSavingArticle] = useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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

    if (!profile || profile.role !== "supervisor") {
      router.push("/login");
      return;
    }

    const {
      data: categoryData,
      error: categoryError,
    } = await supabase
      .from("faq_categories")
      .select("id, name, description")
      .order("name");

    if (categoryError) {
      console.error("Categories error:", categoryError);
    }

    const {
      data: articleData,
      error: articleError,
    } = await supabase
      .from("faq_articles")
      .select(
        "id, title, content, status, category_id, created_at, updated_at"
      )
      .order("updated_at", { ascending: false });

    if (articleError) {
      console.error("Articles error:", articleError);
    }

    setCategories(categoryData || []);
    setArticles(articleData || []);
    setLoading(false);
  }

  async function createCategory() {
    if (!categoryName.trim()) return;

    setSavingCategory(true);

    const { error } = await supabase
      .from("faq_categories")
      .insert({
        name: categoryName.trim(),
        description: categoryDescription.trim() || null,
      });

    if (error) {
      console.error("Create category error:", error);
      alert(error.message);
      setSavingCategory(false);
      return;
    }

    setCategoryName("");
    setCategoryDescription("");
    setShowCategoryForm(false);
    setSavingCategory(false);

    await loadData();
  }

  /*
   * Open the article form in CREATE mode
   */
  function openCreateArticle() {
    setEditingArticle(null);

    setArticleTitle("");
    setArticleContent("");
    setArticleCategory("");
    setArticleStatus("draft");

    setShowArticleForm(true);
  }

  /*
   * Open the article form in EDIT mode
   */
  function openEditArticle(article: Article) {
    setEditingArticle(article);

    setArticleTitle(article.title);
    setArticleContent(article.content);
    setArticleCategory(article.category_id || "");
    setArticleStatus(article.status);

    setShowArticleForm(true);
  }

  /*
   * Create OR update an article
   */
  async function saveArticle() {
    if (!articleTitle.trim() || !articleContent.trim()) {
      return;
    }

    setSavingArticle(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    /*
     * EDIT EXISTING ARTICLE
     */
    if (editingArticle) {
      const { error } = await supabase
        .from("faq_articles")
        .update({
          title: articleTitle.trim(),
          content: articleContent.trim(),
          category_id: articleCategory || null,
          status: articleStatus,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingArticle.id);

      if (error) {
        console.error("Update article error:", error);
        alert(error.message);
        setSavingArticle(false);
        return;
      }
    }

    /*
     * CREATE NEW ARTICLE
     */
    else {
      const { error } = await supabase
        .from("faq_articles")
        .insert({
          title: articleTitle.trim(),
          content: articleContent.trim(),
          category_id: articleCategory || null,
          status: articleStatus,
          created_by: user.id,
          updated_by: user.id,
        });

      if (error) {
        console.error("Create article error:", error);
        alert(error.message);
        setSavingArticle(false);
        return;
      }
    }

    // Reset form
    setArticleTitle("");
    setArticleContent("");
    setArticleCategory("");
    setArticleStatus("draft");
    setEditingArticle(null);
    setShowArticleForm(false);
    setSavingArticle(false);

    await loadData();
  }

  async function changeArticleStatus(
    articleId: string,
    status: "draft" | "published"
  ) {
    const { data, error } =
      await supabase.auth.getUser();

    if (error || !data.user) {
      return;
    }

    const { error: updateError } = await supabase
      .from("faq_articles")
      .update({
        status,
        updated_by: data.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", articleId);

    if (updateError) {
      console.error("Status update error:", updateError);
      alert(updateError.message);
      return;
    }

    await loadData();
  }

  /*
   * Open delete confirmation instead of window.confirm()
   */
  function requestDeleteArticle(article: Article) {
    setDeleteTarget({
      type: "article",
      id: article.id,
      name: article.title,
    });
  }

  function requestDeleteCategory(category: Category) {
    setDeleteTarget({
      type: "category",
      id: category.id,
      name: category.name,
    });
  }

  /*
   * Actually delete after confirmation
   */
  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);

    if (deleteTarget.type === "article") {
      const { error } = await supabase
        .from("faq_articles")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) {
        console.error("Delete article error:", error);
        alert(error.message);
        setDeleting(false);
        return;
      }
    }

    if (deleteTarget.type === "category") {
      const { error } = await supabase
        .from("faq_categories")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) {
        console.error("Delete category error:", error);
        alert(error.message);
        setDeleting(false);
        return;
      }

      if (selectedCategory === deleteTarget.id) {
        setSelectedCategory(null);
      }
    }

    setDeleteTarget(null);
    setDeleting(false);

    await loadData();
  }

  function getCategoryName(categoryId: string | null) {
    if (!categoryId) return "Uncategorized";

    return (
      categories.find(
        (category) => category.id === categoryId
      )?.name || "Uncategorized"
    );
  }

  const visibleArticles = selectedCategory
    ? articles.filter(
        (article) =>
          article.category_id === selectedCategory
      )
    : articles;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="flex min-h-screen">
          <aside className="hidden w-64 border-r border-gray-200 bg-white md:block" />

          <main className="flex-1 p-6 md:p-10">
            <div className="mx-auto max-w-6xl">
              <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200" />
              <div className="mt-8 h-80 animate-pulse rounded-2xl bg-white" />
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
              Supervisor
            </p>
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <LogOut size={19} strokeWidth={1.8} />
          </button>

        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2">

          <MobileNavItem
            icon={<Home size={17} />}
            label="Home"
            onClick={() => router.push(`/supervisor/${routeUserId}`)}
          />

          <MobileNavItem
            icon={<BookOpen size={17} />}
            label="Knowledge Base"
            active
            onClick={() =>
              router.push(`/supervisor/${routeUserId}/knowledge-base`)
            }
          />

          <MobileNavItem
            icon={<LayoutDashboard size={17} />}
            label="Dashboard"
            onClick={() =>
              router.push(`/supervisor/${routeUserId}/dashboard`)
            }
          />

          <MobileNavItem
            icon={<AlertTriangle size={17} />}
            label="Escalations"
            onClick={() =>
              router.push(`/supervisor/${routeUserId}/escalations`)
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
              Supervisor
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
                onClick={() => router.push(`/supervisor/${routeUserId}`)}
              />

              <SidebarItem
                icon={<BookOpen size={18} />}
                label="Knowledge Base"
                active
                onClick={() =>
                  router.push(`/supervisor/${routeUserId}/knowledge-base`)
                }
              />

              <SidebarItem
                icon={<LayoutDashboard size={18} />}
                label="Dashboard"
                onClick={() =>
                  router.push(`/supervisor/${routeUserId}/dashboard`)
                }
              />

              <SidebarItem
                icon={<AlertTriangle size={18} />}
                label="Escalations"
                onClick={() =>
                  router.push(`/supervisor/${routeUserId}/escalations`)
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

            <WorkspaceTopBar userId={routeUserId} role="supervisor" />

            {/* Header */}

            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

              <div>

                <p className="text-sm font-medium text-gray-500">
                  Supervisor workspace
                </p>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Knowledge Base
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                  Manage the information used by your customer
                  service team and AI assistant.
                </p>

              </div>

              <button
                onClick={openCreateArticle}
                className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                <Plus size={17} />
                New article
              </button>

            </div>


            {/* ================= CONTENT ================= */}

            <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">

              {/* ================= CATEGORIES ================= */}

              <section className="rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">

                  <div>

                    <h2 className="text-sm font-semibold">
                      Categories
                    </h2>

                    <p className="mt-0.5 text-xs text-gray-400">
                      Organize your articles
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      setShowCategoryForm(true)
                    }
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    title="Add category"
                  >
                    <Plus size={17} />
                  </button>

                </div>


                <div className="p-3">

                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${
                      selectedCategory === null
                        ? "bg-gray-100 font-medium text-gray-900"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">

                      <FileText size={16} />

                      All articles

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

                    return (
                      <div
                        key={category.id}
                        className="group flex items-center gap-1"
                      >

                        <button
                          onClick={() =>
                            setSelectedCategory(category.id)
                          }
                          className={`flex min-w-0 flex-1 items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${
                            selectedCategory === category.id
                              ? "bg-gray-100 font-medium text-gray-900"
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

                          <span className="ml-2 text-xs text-gray-400">
                            {count}
                          </span>

                        </button>

                        <button
                          onClick={() =>
                            requestDeleteCategory(category)
                          }
                          className="hidden rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 group-hover:block"
                          title="Delete category"
                        >
                          <Trash2 size={14} />
                        </button>

                      </div>
                    );
                  })}

                </div>

              </section>


              {/* ================= ARTICLES ================= */}

              <section className="rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

                <div className="border-b border-gray-100 px-5 py-4">

                  <h2 className="text-sm font-semibold">
                    Articles
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-400">
                    {selectedCategory
                      ? getCategoryName(selectedCategory)
                      : "All knowledge base articles"}
                  </p>

                </div>


                {visibleArticles.length === 0 ? (

                  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-gray-400">
                      <FileText size={22} />
                    </div>

                    <h3 className="mt-4 text-sm font-medium">
                      No articles yet
                    </h3>

                    <p className="mt-1 max-w-sm text-xs leading-5 text-gray-400">
                      Create your first article to start building
                      the customer service knowledge base.
                    </p>

                    <button
                      onClick={openCreateArticle}
                      className="mt-4 flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                    >
                      <Plus size={16} />
                      New article
                    </button>

                  </div>

                ) : (

                  <div className="divide-y divide-gray-100">

                    {visibleArticles.map((article) => (

                      <article
                        key={article.id}
                        className="group px-5 py-5 transition hover:bg-gray-50/60"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="font-medium text-gray-900">
                                {article.title}
                              </h3>

                              {article.status === "published" ? (

                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700">
                                  <Check size={12} />
                                  Published
                                </span>

                              ) : (

                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                                  Draft
                                </span>

                              )}

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

                            <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-500">
                              {article.content}
                            </p>

                          </div>


                          <div className="flex shrink-0 items-center gap-1">

                            {/* EDIT */}

                            <button
                              onClick={() =>
                                openEditArticle(article)
                              }
                              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
                              title="Edit article"
                            >
                              <Pencil size={16} />
                            </button>

                            {/* DELETE */}

                            <button
                              onClick={() =>
                                requestDeleteArticle(article)
                              }
                              className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                              title="Delete article"
                            >
                              <Trash2 size={16} />
                            </button>

                            {/* QUICK STATUS */}

                            <button
                              onClick={() =>
                                changeArticleStatus(
                                  article.id,
                                  article.status === "published"
                                    ? "draft"
                                    : "published"
                                )
                              }
                              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
                              title={
                                article.status === "published"
                                  ? "Move to draft"
                                  : "Publish article"
                              }
                            >
                              <MoreHorizontal size={16} />
                            </button>

                          </div>

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


      {/* ================= CATEGORY MODAL ================= */}

      {showCategoryForm && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">

          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">

              <div>

                <h2 className="font-semibold">
                  New category
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Create a category for your articles.
                </p>

              </div>

              <button
                onClick={() =>
                  setShowCategoryForm(false)
                }
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50"
              >
                <X size={18} />
              </button>

            </div>


            <div className="space-y-4 p-6">

              <div>

                <label className="text-xs font-medium text-gray-600">
                  Name
                </label>

                <input
                  value={categoryName}
                  onChange={(e) =>
                    setCategoryName(e.target.value)
                  }
                  placeholder="e.g. Delivery"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                />

              </div>


              <div>

                <label className="text-xs font-medium text-gray-600">
                  Description
                </label>

                <textarea
                  value={categoryDescription}
                  onChange={(e) =>
                    setCategoryDescription(e.target.value)
                  }
                  placeholder="Optional description"
                  rows={3}
                  className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                />

              </div>


              <button
                onClick={createCategory}
                disabled={
                  savingCategory ||
                  !categoryName.trim()
                }
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingCategory
                  ? "Creating..."
                  : "Create category"}
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ================= ARTICLE CREATE / EDIT MODAL ================= */}

      {showArticleForm && (

        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30 p-4">

          <div className="mx-auto mt-10 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl">

            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">

              <div>

                <h2 className="font-semibold">
                  {editingArticle
                    ? "Edit article"
                    : "New article"}
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {editingArticle
                    ? "Update the article and its publication status."
                    : "Create an article for your customer service knowledge base."}
                </p>

              </div>

              <button
                onClick={() => {
                  setShowArticleForm(false);
                  setEditingArticle(null);
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-50"
              >
                <X size={18} />
              </button>

            </div>


            <div className="space-y-5 p-6">

              {/* TITLE */}

              <div>

                <label className="text-xs font-medium text-gray-600">
                  Title
                </label>

                <input
                  value={articleTitle}
                  onChange={(e) =>
                    setArticleTitle(e.target.value)
                  }
                  placeholder="e.g. How long does delivery take?"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                />

              </div>


              {/* CATEGORY */}

              <div>

                <label className="text-xs font-medium text-gray-600">
                  Category
                </label>

                <select
                  value={articleCategory}
                  onChange={(e) =>
                    setArticleCategory(e.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                >

                  <option value="">
                    No category
                  </option>

                  {categories.map((category) => (

                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>

                  ))}

                </select>

              </div>


              {/* CONTENT */}

              <div>

                <label className="text-xs font-medium text-gray-600">
                  Content
                </label>

                <textarea
                  value={articleContent}
                  onChange={(e) =>
                    setArticleContent(e.target.value)
                  }
                  placeholder="Write the information that the customer service team and AI can use..."
                  rows={9}
                  className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm leading-6 outline-none focus:border-gray-400"
                />

              </div>


              {/* PUBLICATION STATUS */}

              <div>

                <label className="text-xs font-medium text-gray-600">
                  Publication status
                </label>

                <div className="mt-2 grid gap-3 sm:grid-cols-2">

                  {/* DRAFT */}

                  <button
                    type="button"
                    onClick={() =>
                      setArticleStatus("draft")
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      articleStatus === "draft"
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >

                    <div className="flex items-start justify-between">

                      <div>

                        <p className="text-sm font-medium text-gray-900">
                          Save as draft
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Keep the article unpublished until
                          you are ready.
                        </p>

                      </div>

                      {articleStatus === "draft" && (
                        <Check
                          size={17}
                          className="text-gray-900"
                        />
                      )}

                    </div>

                  </button>


                  {/* PUBLISHED */}

                  <button
                    type="button"
                    onClick={() =>
                      setArticleStatus("published")
                    }
                    className={`rounded-xl border p-4 text-left transition ${
                      articleStatus === "published"
                        ? "border-green-600 bg-green-50/60"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >

                    <div className="flex items-start justify-between">

                      <div>

                        <p className="text-sm font-medium text-gray-900">
                          Publish immediately
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Make this article available to the
                          knowledge base immediately.
                        </p>

                      </div>

                      {articleStatus === "published" && (
                        <Check
                          size={17}
                          className="text-green-600"
                        />
                      )}

                    </div>

                  </button>

                </div>

              </div>


              {/* INFO */}

              <div
                className={`rounded-lg px-4 py-3 text-xs leading-5 ${
                  articleStatus === "published"
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-50 text-gray-500"
                }`}
              >

                {articleStatus === "published" ? (
                  <>
                    This article will be{" "}
                    <strong className="font-medium">
                      published
                    </strong>{" "}
                    immediately and can be used by the
                    knowledge base and AI assistant.
                  </>
                ) : (
                  <>
                    This article will be saved as a{" "}
                    <strong className="font-medium text-gray-700">
                      draft
                    </strong>{" "}
                    and will not be used by the AI until
                    it is published.
                  </>
                )}

              </div>


              {/* SAVE */}

              <button
                onClick={saveArticle}
                disabled={
                  savingArticle ||
                  !articleTitle.trim() ||
                  !articleContent.trim()
                }
                className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >

                {savingArticle
                  ? editingArticle
                    ? "Saving changes..."
                    : "Creating..."
                  : editingArticle
                    ? "Save changes"
                    : articleStatus === "published"
                      ? "Create and publish"
                      : "Create draft"}

              </button>

            </div>

          </div>

        </div>

      )}


      {/* ================= DELETE CONFIRMATION MODAL ================= */}

      {deleteTarget && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">

          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl">

            <div className="p-6">

              {/* ICON */}

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">

                <AlertCircle size={21} />

              </div>


              {/* TITLE */}

              <h2 className="mt-5 text-lg font-semibold text-gray-900">

                {deleteTarget.type === "article"
                  ? "Delete article?"
                  : "Delete category?"}

              </h2>


              {/* DESCRIPTION */}

              <p className="mt-2 text-sm leading-6 text-gray-500">

                Are you sure you want to delete{" "}

                <span className="font-medium text-gray-800">
                  "{deleteTarget.name}"
                </span>
                ?

                <br />

                This action cannot be undone.

              </p>


              {/* ACTIONS */}

              <div className="mt-6 flex justify-end gap-3">

                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete"}
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

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
          ? "bg-gray-100 font-medium text-gray-900"
          : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span
        className={
          active ? "text-gray-900" : "text-gray-500"
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
          ? "bg-gray-100 text-gray-900"
          : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {icon}

      <span>{label}</span>
    </button>
  );
}

