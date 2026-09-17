"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  ShoppingBag,
  MessageCircle,
  ClipboardList,
  UserRound,
  LogOut,
  UserCircle,
  Plus,
  Send,
  ArrowLeft,
  MoreHorizontal,
  CheckCircle2,
  Clock3,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConversationRealtime } from "@/lib/supabase/use-conversation-realtime";
import WorkspaceTopBar from "@/components/workspace-top-bar";

type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  customer_id: string | null;
};

type Conversation = {
  id: string;
  customer_id: string;
  channel: "web" | "email" | "whatsapp";
  status: "new" | "open" | "escalated" | "resolved" | "rejected";
  queue: string;
  language: string | null;
  intent: string | null;
  sentiment: string | null;
  urgency_score: number | null;
  priority: "low" | "medium" | "high" | "urgent";
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_type: "customer" | "agent" | "ai" | "supervisor";
  sender_id: string | null;
  content: string;
  external_message_id: string | null;
  created_at: string;
};

export default function ClientSupportPage() {
  const router = useRouter();
  const pathname = usePathname();
  const routeUserId = pathname.split("/")[2];
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [messageInput, setMessageInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);

  useConversationRealtime({
    conversationId: selectedConversation?.id ?? null,
    onMessage: (message) => {
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) {
          return current;
        }

        return [...current, message as Message];
      });
    },
    onConversation: (updatedConversation) => {
      const nextConversation = updatedConversation as Conversation;

      setConversations((current) =>
        current.map((item) =>
          item.id === nextConversation.id
            ? { ...item, ...nextConversation }
            : item
        )
      );

      setSelectedConversation((current) =>
        current?.id === nextConversation.id
          ? { ...current, ...nextConversation }
          : current
      );
    },
  });

  /*
   * ============================================================
   * INITIAL LOAD
   * ============================================================
   */

  useEffect(() => {
    loadClientData();
  }, []);

  async function loadClientData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profileData) {
      console.error("Profile error:", profileError);
      setLoading(false);
      return;
    }

    setProfile(profileData);

    if (!profileData.customer_id) {
      setLoading(false);
      return;
    }

    await loadConversations(profileData.customer_id);

    setLoading(false);
  }

  /*
   * ============================================================
   * LOAD CONVERSATIONS
   * ============================================================
   */

  async function loadConversations(customerId: string) {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
        id,
        customer_id,
        channel,
        status,
        queue,
        language,
        intent,
        sentiment,
        urgency_score,
        priority,
        created_at,
        updated_at
      `
      )
      .eq("customer_id", customerId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Conversations error:", error);
      return;
    }

    setConversations(data || []);

    /*
     * Automatically open the most recent conversation.
     */
    if (data && data.length > 0 && !selectedConversation) {
      await openConversation(data[0]);
    }
  }

  /*
   * ============================================================
   * OPEN CONVERSATION
   * ============================================================
   */

  async function openConversation(conversation: Conversation) {
    setSelectedConversation(conversation);
    setMobileConversationOpen(true);
    setMessagesLoading(true);

    const { data, error } = await supabase
      .from("messages")
      .select(
        `
        id,
        conversation_id,
        sender_type,
        sender_id,
        content,
        external_message_id,
        created_at
      `
      )
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Messages error:", error);
      setMessages([]);
    } else {
      setMessages(data || []);
    }

    setMessagesLoading(false);
  }

  /*
 * ============================================================
 * CREATE NEW CONVERSATION
 * ============================================================
 */

async function createConversation() {
  setCreatingConversation(true);

  /*
   * 1. Get the currently authenticated user from
   *    Supabase Auth.
   *
   *    This does NOT create a new session.
   *    It simply tells us who is currently logged in.
   */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("AUTH USER:", user);

  if (userError || !user) {
    console.error("No authenticated user:", userError);
    setCreatingConversation(false);
    router.push("/login");
    return;
  }

  /*
   * 2. Get the profile belonging to this authenticated user.
   *
   *    We deliberately fetch it again instead of trusting
   *    the React state variable `profile`.
   */
  const { data: currentProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, customer_id")
    .eq("id", user.id)
    .single();

  console.log("CURRENT PROFILE:", currentProfile);

  if (profileError || !currentProfile) {
    console.error("Could not load current profile:", profileError);
    setCreatingConversation(false);
    return;
  }

  /*
   * 3. Security checks on the application side.
   *
   *    These are NOT our main security mechanism.
   *    PostgreSQL RLS remains the real security boundary.
   */
  if (currentProfile.role !== "client") {
    console.error("Only clients can create conversations.");
    setCreatingConversation(false);
    return;
  }

  if (!currentProfile.customer_id) {
    console.error("This client has no customer_id.");
    setCreatingConversation(false);
    return;
  }

  /*
   * 4. Create the conversation using the customer_id
   *    belonging to the authenticated user's profile.
   */
  console.log("CREATING CONVERSATION WITH:", {
    userId: user.id,
    customerId: currentProfile.customer_id,
  });

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      customer_id: currentProfile.customer_id,
      channel: "web",
      status: "new",
      queue: "general",
      priority: "medium",
    })
    .select(
      `
      id,
      customer_id,
      channel,
      status,
      queue,
      language,
      intent,
      sentiment,
      urgency_score,
      priority,
      created_at,
      updated_at
    `
    )
    .single();

  if (error) {
    console.error("CREATE CONVERSATION ERROR:", error);
    setCreatingConversation(false);
    return;
  }

  console.log("CONVERSATION CREATED:", data);

  /*
   * 5. Update the UI.
   */
  if (data) {
    setConversations((previous) => [data, ...previous]);
    setSelectedConversation(data);
    setMessages([]);
    setMobileConversationOpen(true);
  }

  setCreatingConversation(false);
}
  /*
   * ============================================================
   * SEND MESSAGE
   * ============================================================
   */

  async function sendMessage() {
    const content = messageInput.trim();

    if (!content || !selectedConversation || !profile) {
      return;
    }

    if (sendingMessage) {
      return;
    }

    setSendingMessage(true);

    /*
     * Generate a client-side external ID.
     *
     * Later n8n can use this ID for idempotency
     * and prevent duplicate webhook processing.
     */
    const externalMessageId = `web-${crypto.randomUUID()}`;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConversation.id,
        sender_type: "customer",
        sender_id: profile.id,
        content,
        external_message_id: externalMessageId,
      })
      .select(
        `
        id,
        conversation_id,
        sender_type,
        sender_id,
        content,
        external_message_id,
        created_at
      `
      )
      .single();

    if (error) {
      console.error("Send message error:", error);
      setSendingMessage(false);
      return;
    }

    if (data) {
      setMessages((previous) => [...previous, data]);
    }

    setMessageInput("");
    setSendingMessage(false);

    /*
     * IMPORTANT:
     *
     * We are saving the message in Supabase first.
     *
     * Later, this action will also trigger/call n8n.
     *
     * We do NOT put the LLM logic in this page.
     */
  }

  /*
   * ============================================================
   * SIGN OUT
   * ============================================================
   */

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="flex min-h-screen">
          <aside className="hidden w-64 border-r border-gray-200 bg-white md:block" />

          <main className="flex-1 p-6 md:p-10">
            <div className="mx-auto max-w-6xl">
              <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200" />

              <div className="mt-8 h-[600px] animate-pulse rounded-2xl bg-white" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || "there";

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900">
      {/* ====================================================== */}
      {/* MOBILE HEADER                                           */}
      {/* ====================================================== */}

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              ZEN
            </h1>

            <p className="mt-0.5 text-[11px] text-gray-500">
              Customer Portal
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Sign out"
          >
            <LogOut size={19} strokeWidth={1.8} />
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2">
          <MobileNavItem
            icon={<Home size={17} strokeWidth={1.8} />}
            label="Home"
            onClick={() => router.push(`/client/${routeUserId}`)}
          />

          <MobileNavItem
            icon={<ShoppingBag size={17} strokeWidth={1.8} />}
            label="Orders"
            onClick={() => router.push(`/client/${routeUserId}/orders`)}
          />

          <MobileNavItem
            icon={<MessageCircle size={17} strokeWidth={1.8} />}
            label="Support"
            active
            onClick={() => router.push(`/client/${routeUserId}/support`)}
          />

          <MobileNavItem
            icon={<ClipboardList size={17} strokeWidth={1.8} />}
            label="Requests"
            onClick={() => router.push(`/client/${routeUserId}/requests`)}
          />

          <MobileNavItem
            icon={<UserCircle size={17} strokeWidth={1.8} />}
            label="Profile"
            onClick={() => router.push(`/client/${routeUserId}/profile`)}
          />
        </nav>
      </header>

      <div className="flex min-h-screen">
        {/* ====================================================== */}
        {/* SIDEBAR                                                 */}
        {/* ====================================================== */}

        <aside className="fixed inset-y-0 left-0 hidden w-64 shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">
          {/* Logo */}

          <div className="border-b border-gray-100 px-6 py-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              ZEN
            </h1>

            <p className="mt-1 text-xs text-gray-500">Customer Portal</p>
          </div>

          {/* Navigation */}

          <nav className="flex-1 px-4 py-6">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              My space
            </p>

            <div className="space-y-1">
              <SidebarItem
                icon={<Home size={18} strokeWidth={1.8} />}
                label="Home"
                onClick={() => router.push(`/client/${routeUserId}`)}
              />

              <SidebarItem
                icon={<ShoppingBag size={18} strokeWidth={1.8} />}
                label="Orders"
                onClick={() => router.push(`/client/${routeUserId}/orders`)}
              />

              <SidebarItem
                icon={<MessageCircle size={18} strokeWidth={1.8} />}
                label="Customer Support"
                active
                onClick={() => router.push(`/client/${routeUserId}/support`)}
              />

              <SidebarItem
                icon={<ClipboardList size={18} strokeWidth={1.8} />}
                label="Requests"
                onClick={() => router.push(`/client/${routeUserId}/requests`)}
              />

              <SidebarItem
                icon={<UserCircle size={18} strokeWidth={1.8} />}
                label="Profile"
                onClick={() => router.push(`/client/${routeUserId}/profile`)}
              />
            </div>
          </nav>

          {/* User */}

          <div className="border-t border-gray-100 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                <UserRound size={17} strokeWidth={1.8} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {displayName}
                </p>

                <p className="truncate text-xs text-gray-500">
                  {profile?.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut size={18} strokeWidth={1.8} />

              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* ====================================================== */}
        {/* MAIN                                                     */}
        {/* ====================================================== */}

        <main className="flex-1 md:ml-64">
          <div className="px-4 pt-6 sm:px-6 lg:px-8">
            <WorkspaceTopBar userId={routeUserId} role="client" />
          </div>

          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {/* Page header */}

            <section className="mb-6">
              <p className="text-sm font-medium text-green-700">
                Customer support
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
                How can we help?
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Start a conversation with the ZEN support team.
              </p>
            </section>

            {/* ================================================== */}
            {/* CONVERSATION AREA                                  */}
            {/* ================================================== */}

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="flex h-[calc(100vh-230px)] min-h-[560px]">
                {/* ================================================= */}
                {/* CONVERSATION LIST                                  */}
                {/* ================================================= */}

                <aside
                  className={`w-full border-r border-gray-200 md:block md:w-80 ${
                    mobileConversationOpen ? "hidden" : "block"
                  }`}
                >
                  {/* List header */}

                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        Conversations
                      </h2>

                      <p className="mt-0.5 text-xs text-gray-500">
                        {conversations.length} conversation
                        {conversations.length !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <button
                      onClick={createConversation}
                      disabled={creatingConversation}
                      className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Plus size={15} strokeWidth={2} />

                      <span>
                        {creatingConversation ? "Creating..." : "New"}
                      </span>
                    </button>
                  </div>

                  {/* Conversation list */}

                  <div className="h-[calc(100%-73px)] overflow-y-auto">
                    {conversations.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-700">
                          <MessageCircle
                            size={22}
                            strokeWidth={1.7}
                          />
                        </div>

                        <h3 className="mt-4 text-sm font-semibold text-gray-900">
                          No conversations yet
                        </h3>

                        <p className="mt-1 max-w-xs text-xs leading-5 text-gray-500">
                          Start a conversation and our support team will help
                          you.
                        </p>

                        <button
                          onClick={createConversation}
                          disabled={creatingConversation}
                          className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                          Start a conversation
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {conversations.map((conversation) => (
                          <ConversationItem
                            key={conversation.id}
                            conversation={conversation}
                            active={
                              selectedConversation?.id === conversation.id
                            }
                            onClick={() => openConversation(conversation)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </aside>

                {/* ================================================= */}
                {/* CHAT                                                 */}
                {/* ================================================= */}

                <section
                  className={`flex min-w-0 flex-1 flex-col ${
                    mobileConversationOpen ? "flex" : "hidden md:flex"
                  }`}
                >
                  {selectedConversation ? (
                    <>
                      {/* Chat header */}

                      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <button
                            onClick={() => setMobileConversationOpen(false)}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
                            aria-label="Back to conversations"
                          >
                            <ArrowLeft size={18} />
                          </button>

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                            <MessageCircle
                              size={18}
                              strokeWidth={1.7}
                            />
                          </div>

                          <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-gray-900">
                              {getConversationTitle(selectedConversation)}
                            </h2>

                            <div className="mt-0.5 flex items-center gap-2">
                              <StatusBadge
                                status={selectedConversation.status}
                              />

                              <span className="text-[11px] text-gray-400">
                                Web
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                          aria-label="Conversation options"
                        >
                          <MoreHorizontal size={19} />
                        </button>
                      </div>

                      {/* Messages */}

                      <div className="flex-1 overflow-y-auto bg-[#fcfcfc] px-5 py-6">
                        {messagesLoading ? (
                          <div className="flex h-full items-center justify-center">
                            <div className="text-sm text-gray-400">
                              Loading conversation...
                            </div>
                          </div>
                        ) : messages.length === 0 ? (
                          <EmptyConversation />
                        ) : (
                          <div className="mx-auto max-w-3xl space-y-5">
                            {messages.map((message) => (
                              <MessageBubble
                                key={message.id}
                                message={message}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Composer */}

                      <div className="border-t border-gray-100 bg-white p-4">
                        <div className="mx-auto max-w-3xl">
                          <div className="rounded-xl border border-gray-200 bg-gray-50 p-2 transition focus-within:border-green-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-green-50">
                            <textarea
                              value={messageInput}
                              onChange={(event) =>
                                setMessageInput(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" &&
                                  !event.shiftKey
                                ) {
                                  event.preventDefault();
                                  sendMessage();
                                }
                              }}
                              placeholder="Write your message..."
                              rows={2}
                              className="w-full resize-none border-0 bg-transparent px-2 py-1.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                              disabled={sendingMessage}
                            />

                            <div className="flex items-center justify-between px-1 pt-1">
                              <p className="text-[11px] text-gray-400">
                                Press Enter to send · Shift + Enter for a new
                                line
                              </p>

                              <button
                                onClick={sendMessage}
                                disabled={
                                  sendingMessage ||
                                  messageInput.trim().length === 0
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Send message"
                              >
                                <Send size={16} strokeWidth={2} />
                              </button>
                            </div>
                          </div>

                          <p className="mt-2 text-center text-[10px] text-gray-400">
                            ZEN Customer Support
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <NoConversationSelected
                      onCreateConversation={createConversation}
                      creating={creatingConversation}
                    />
                  )}
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ============================================================= */
/* SIDEBAR ITEM                                                   */
/* ============================================================= */

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
          ? "bg-green-50 font-medium text-green-700"
          : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span className={active ? "text-green-700" : "text-gray-500"}>
        {icon}
      </span>

      <span>{label}</span>
    </button>
  );
}

/* ============================================================= */
/* MOBILE NAV ITEM                                                */
/* ============================================================= */

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
          ? "bg-green-50 text-green-700"
          : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {icon}

      <span>{label}</span>
    </button>
  );
}

/* ============================================================= */
/* CONVERSATION ITEM                                              */
/* ============================================================= */

function ConversationItem({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-5 py-4 text-left transition ${
        active ? "bg-green-50/70" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            active
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          <MessageCircle size={17} strokeWidth={1.7} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-gray-900">
              {getConversationTitle(conversation)}
            </p>

            <span className="shrink-0 text-[10px] text-gray-400">
              {formatConversationDate(conversation.updated_at)}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <StatusBadge status={conversation.status} />

            {conversation.priority === "urgent" && (
              <span className="text-[10px] font-medium text-red-600">
                Urgent
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ============================================================= */
/* STATUS BADGE                                                    */
/* ============================================================= */

function StatusBadge({
  status,
}: {
  status: Conversation["status"];
}) {
  const config = {
    new: {
      label: "New",
      className: "bg-blue-50 text-blue-700",
      icon: <AlertCircle size={10} />,
    },
    open: {
      label: "Open",
      className: "bg-green-50 text-green-700",
      icon: <Clock3 size={10} />,
    },
    escalated: {
      label: "Escalated",
      className: "bg-orange-50 text-orange-700",
      icon: <AlertCircle size={10} />,
    },
    resolved: {
      label: "Resolved",
      className: "bg-gray-100 text-gray-600",
      icon: <CheckCircle2 size={10} />,
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-50 text-red-700",
      icon: <AlertCircle size={10} />,
    },
  };

  const current = config[status] ?? config.new;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${current.className}`}
    >
      {current.icon}
      {current.label}
    </span>
  );
}

/* ============================================================= */
/* MESSAGE BUBBLE                                                  */
/* ============================================================= */

function MessageBubble({ message }: { message: Message }) {
  const isCustomer = message.sender_type === "customer";

  const senderLabel =
    message.sender_type === "customer"
      ? "You"
      : message.sender_type === "ai"
        ? "ZEN Assistant"
        : message.sender_type === "agent"
          ? "ZEN Support"
          : "ZEN Supervisor";

  return (
    <div
      className={`flex ${
        isCustomer ? "justify-end" : "justify-start"
      }`}
    >
      <div className="max-w-[82%] sm:max-w-[70%]">
        <div
          className={`mb-1 text-[10px] font-medium ${
            isCustomer
              ? "text-right text-gray-400"
              : "text-left text-gray-400"
          }`}
        >
          {senderLabel}
        </div>

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
            isCustomer
              ? "rounded-br-md bg-green-600 text-white"
              : "rounded-bl-md border border-gray-200 bg-white text-gray-800"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>

        <p
          className={`mt-1 text-[10px] text-gray-400 ${
            isCustomer ? "text-right" : "text-left"
          }`}
        >
          {formatMessageTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

/* ============================================================= */
/* EMPTY CONVERSATION                                             */
/* ============================================================= */

function EmptyConversation() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-700">
        <MessageCircle size={25} strokeWidth={1.6} />
      </div>

      <h3 className="mt-4 text-sm font-semibold text-gray-900">
        Start the conversation
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-gray-500">
        Tell us what you need help with. You can write in French, Arabic, or
        English.
      </p>
    </div>
  );
}

/* ============================================================= */
/* NO CONVERSATION SELECTED                                       */
/* ============================================================= */

function NoConversationSelected({
  onCreateConversation,
  creating,
}: {
  onCreateConversation: () => void;
  creating: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-700">
        <MessageCircle size={28} strokeWidth={1.6} />
      </div>

      <h2 className="mt-5 text-base font-semibold text-gray-900">
        Welcome to ZEN Support
      </h2>

      <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
        Select a conversation or start a new one to get help from our support
        team.
      </p>

      <button
        onClick={onCreateConversation}
        disabled={creating}
        className="mt-5 flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
      >
        <Plus size={17} />

        {creating ? "Creating..." : "New conversation"}
      </button>
    </div>
  );
}

/* ============================================================= */
/* HELPERS                                                        */
/* ============================================================= */

function getConversationTitle(conversation: Conversation) {
  if (conversation.intent) {
    return conversation.intent
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return "Customer Support";
}

function formatConversationDate(date: string) {
  const value = new Date(date);
  const now = new Date();

  const isToday = value.toDateString() === now.toDateString();

  if (isToday) {
    return value.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return value.toLocaleDateString([], {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatMessageTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
