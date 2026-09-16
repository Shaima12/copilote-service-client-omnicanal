"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  ExternalLink,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Package,
  Pencil,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Ticket,
  User,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

/* ========================================================= */
/* TYPES                                                       */
/* ========================================================= */

type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
};

type Conversation = {
  id: string;
  customer_id: string;
  order_number: string | null;
  channel: string;
  status: string;
  queue: string;
  language: string | null;
  intent: string | null;
  sentiment: string | null;
  urgency_score: number | null;
  priority: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type Customer = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string | null;
  content: string;
  created_at: string;
};

type Order = {
  id: string;
  customer_id: string;
  order_number: string;
  status: string;
  total_amount: number | null;
  currency: string;
  ordered_at: string;
  expected_delivery_at: string | null;
  delivered_at: string | null;
  tracking_number: string | null;
};

type Ticket = {
  id: string;
  conversation_id: string;
  created_by: string | null;
  assigned_to: string | null;
  reason: string | null;
  priority: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

type MessageVersion = {
  id: string;
  conversation_id: string | null;
  message_id: string | null;
  version_number: number;
  content: string;
  author_type: string;
  author_id: string | null;
  created_at: string;
};

type Source = {
  id: string;
  message_id: string;
  chunk_id: string;
  similarity_score: number;
  rank: number;
  title: string;
  content: string;
};

type AuditLog = {
  id: string;
  conversation_id: string;
  actor_id: string | null;
  actor_type: string;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

/* ========================================================= */
/* HELPERS                                                     */
/* ========================================================= */

function getSentimentScore(sentiment: string | null) {
  switch (sentiment) {
    case "angry":
      return 100;

    case "negative":
      return 50;

    default:
      return 0;
  }
}

function getWaitingMinutes(
  createdAt: string,
  currentTime = Date.now()
) {
  const created = new Date(createdAt).getTime();

  return Math.max(
    0,
    Math.floor((currentTime - created) / 1000 / 60)
  );
}

function getWaitingScore(createdAt: string) {
  const minutes = getWaitingMinutes(createdAt);

  if (minutes < 15) return 0;
  if (minutes < 30) return 25;
  if (minutes < 60) return 50;

  return 75;
}

function formatWaitingTime(
  createdAt: string,
  currentTime = Date.now()
) {
  const minutes = getWaitingMinutes(
    createdAt,
    currentTime
  );

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

function getPriorityScore(
  urgencyScore: number | null,
  sentiment: string | null,
  createdAt: string
) {
  const urgency = Math.min(
    100,
    Math.max(0, urgencyScore ?? 0)
  );

  const sentimentScore =
    getSentimentScore(sentiment);

  const waitingScore =
    getWaitingScore(createdAt);

  return Math.round(
    0.6 * urgency +
      0.2 * sentimentScore +
      0.2 * waitingScore
  );
}

function getPriorityLevel(score: number) {
  if (score < 25) return "low";
  if (score < 50) return "medium";
  if (score < 75) return "high";

  return "urgent";
}

function getPriorityClasses(priority: string) {
  switch (priority) {
    case "urgent":
      return "border-red-200 bg-red-50 text-red-700";

    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "medium":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";

    default:
      return "border-green-200 bg-green-50 text-green-700";
  }
}

function getUrgencyLevel(score: number | null) {
  const value = Math.min(
    100,
    Math.max(0, score ?? 0)
  );

  if (value <= 25) return "low";
  if (value <= 50) return "medium";
  if (value <= 75) return "high";

  return "critical";
}

function getUrgencyClasses(level: string) {
  switch (level) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";

    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "medium":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";

    default:
      return "border-green-200 bg-green-50 text-green-700";
  }
}

function formatSimilarity(score: number) {
  const normalized =
    score <= 1 ? score * 100 : score;

  return `${Math.round(normalized * 10) / 10}%`;
}

function formatAuditAction(action: string) {
  switch (action) {
    case "READ":
      return "Escalation viewed";

    case "MODIFIED":
      return "AI draft modified";

    case "REJECTED":
      return "AI draft rejected";

    case "SENT":
      return "Supervisor response sent";

    default:
      return action;
  }
}

/* ========================================================= */
/* PAGE                                                         */
/* ========================================================= */

export default function SupervisorEscalationConversationPage() {
  const router = useRouter();
  const params = useParams();

  const userId = String(params.userId);
  const conversationId = String(
    params.conversationId
  );

  const supabase = createClient();

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [conversation, setConversation] =
    useState<Conversation | null>(null);

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [order, setOrder] =
    useState<Order | null>(null);

  const [ticket, setTicket] =
    useState<Ticket | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [draft, setDraft] =
    useState<MessageVersion | null>(null);

  const [sources, setSources] =
    useState<Source[]>([]);

  const [auditLogs, setAuditLogs] =
    useState<AuditLog[]>([]);

  const [selectedSource, setSelectedSource] =
    useState<Source | null>(null);

  const [editingDraft, setEditingDraft] =
    useState(false);

  const [editingDraftContent, setEditingDraftContent] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [savingDraft, setSavingDraft] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [rejecting, setRejecting] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(() => Date.now());

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  /* ======================================================= */
  /* LOAD                                                      */
  /* ======================================================= */

  useEffect(() => {
    loadConversation();
  }, [conversationId, userId]);

  async function loadConversation() {
    setLoading(true);
    setError(null);

    try {
      /* --------------------------------------------------- */
      /* AUTH                                                  */
      /* --------------------------------------------------- */

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      if (user.id !== userId) {
        router.push("/unauthorized");
        return;
      }

      /* --------------------------------------------------- */
      /* PROFILE                                               */
      /* --------------------------------------------------- */

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", user.id)
        .single();

      if (
        profileError ||
        !profileData ||
        profileData.role !== "supervisor"
      ) {
        router.push("/unauthorized");
        return;
      }

      setProfile(profileData);

      /* --------------------------------------------------- */
      /* CONVERSATION                                         */
      /* --------------------------------------------------- */

      const {
        data: conversationData,
        error: conversationError,
      } = await supabase
        .from("conversations")
        .select(`
          id,
          customer_id,
          order_number,
          channel,
          status,
          queue,
          language,
          intent,
          sentiment,
          urgency_score,
          priority,
          first_response_at,
          resolved_at,
          created_at,
          updated_at
        `)
        .eq("id", conversationId)
        .single();

      if (
        conversationError ||
        !conversationData
      ) {
        setError(
          "This escalation could not be found."
        );
        return;
      }

      setConversation(conversationData);

      /* --------------------------------------------------- */
      /* CUSTOMER                                              */
      /* --------------------------------------------------- */

      const {
        data: customerData,
      } = await supabase
        .from("customers")
        .select(`
          id,
          full_name,
          email,
          phone
        `)
        .eq(
          "id",
          conversationData.customer_id
        )
        .maybeSingle();

      setCustomer(customerData);

      /* --------------------------------------------------- */
      /* ORDER                                                 */
      /* --------------------------------------------------- */

      if (conversationData.order_number) {
        const {
          data: orderData,
        } = await supabase
          .from("orders")
          .select(`
            id,
            customer_id,
            order_number,
            status,
            total_amount,
            currency,
            ordered_at,
            expected_delivery_at,
            delivered_at,
            tracking_number
          `)
          .eq(
            "order_number",
            conversationData.order_number
          )
          .maybeSingle();

        setOrder(orderData);
      }

      /* --------------------------------------------------- */
      /* TICKET                                                */
      /* --------------------------------------------------- */

      const {
        data: ticketData,
      } = await supabase
        .from("tickets")
        .select(`
          id,
          conversation_id,
          created_by,
          assigned_to,
          reason,
          priority,
          status,
          created_at,
          resolved_at
        `)
        .eq(
          "conversation_id",
          conversationId
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      let openedTicket = ticketData;

      if (
        ticketData &&
        ticketData.status !== "open" &&
        ticketData.status !== "resolved"
      ) {
        const {
          data: updatedTicket,
          error: ticketUpdateError,
        } = await supabase
          .from("tickets")
          .update({ status: "open" })
          .eq("id", ticketData.id)
          .select(`
            id,
            conversation_id,
            created_by,
            assigned_to,
            reason,
            priority,
            status,
            created_at,
            resolved_at
          `)
          .single();

        if (ticketUpdateError) {
          console.error(
            "Ticket status update error:",
            ticketUpdateError
          );
        } else {
          openedTicket = updatedTicket;
        }
      }

      setTicket(openedTicket);

      /* --------------------------------------------------- */
      /* MESSAGES                                              */
      /* --------------------------------------------------- */

      const {
        data: messageData,
      } = await supabase
        .from("messages")
        .select(`
          id,
          conversation_id,
          sender_type,
          sender_id,
          content,
          created_at
        `)
        .eq(
          "conversation_id",
          conversationId
        )
        .order("created_at", {
          ascending: true,
        });

      setMessages(messageData || []);

      /* --------------------------------------------------- */
      /* AI DRAFT                                              */
      /* --------------------------------------------------- */

      const {
        data: versionData,
      } = await supabase
        .from("message_versions")
        .select(`
          id,
          conversation_id,
          message_id,
          version_number,
          content,
          author_type,
          author_id,
          created_at
        `)
        .eq(
          "conversation_id",
          conversationId
        )
        .is("message_id", null)
        .order("version_number", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      setDraft(versionData);

      /* --------------------------------------------------- */
      /* SOURCES                                               */
      /* --------------------------------------------------- */

      const messageIds =
        (messageData || []).map(
          (message) => message.id
        );

      if (messageIds.length > 0) {
        const {
          data: sourceRows,
        } = await supabase
          .from("ai_response_sources")
          .select(`
            id,
            message_id,
            chunk_id,
            similarity_score,
            rank
          `)
          .in(
            "message_id",
            messageIds
          )
          .order("rank", {
            ascending: true,
          });

        const rows = sourceRows || [];

        const chunkIds = [
          ...new Set(
            rows.map(
              (source) => source.chunk_id
            )
          ),
        ];

        const chunkMap: Record<
          string,
          {
            article_id: string;
            content: string;
          }
        > = {};

        if (chunkIds.length > 0) {
          const {
            data: chunkData,
          } = await supabase
            .from("faq_chunks")
            .select(`
              id,
              article_id,
              content
            `)
            .in(
              "id",
              chunkIds
            );

          (chunkData || []).forEach(
            (chunk) => {
              chunkMap[chunk.id] = {
                article_id:
                  chunk.article_id,
                content:
                  chunk.content || "",
              };
            }
          );
        }

        const articleIds = [
          ...new Set(
            Object.values(chunkMap).map(
              (chunk) => chunk.article_id
            )
          ),
        ];

        const articleMap: Record<
          string,
          string
        > = {};

        if (articleIds.length > 0) {
          const {
            data: articleData,
          } = await supabase
            .from("faq_articles")
            .select(`
              id,
              title
            `)
            .in(
              "id",
              articleIds
            );

          (articleData || []).forEach(
            (article) => {
              articleMap[article.id] =
                article.title ||
                "Untitled FAQ article";
            }
          );
        }

        const sourceList: Source[] = [];

        rows.forEach((source) => {
          const chunk =
            chunkMap[source.chunk_id];

          sourceList.push({
            ...source,
            title: chunk?.article_id
              ? articleMap[
                  chunk.article_id
                ] ||
                "Untitled FAQ article"
              : "Untitled FAQ article",
            content:
              chunk?.content ||
              "Source content unavailable.",
          });
        });

        setSources(sourceList);
      }

      /* --------------------------------------------------- */
      /* AUDIT                                                 */
      /* --------------------------------------------------- */

      const {
        data: auditData,
      } = await supabase
        .from("conversation_audit_logs")
        .select(`
          id,
          conversation_id,
          actor_id,
          actor_type,
          action,
          metadata,
          created_at
        `)
        .eq(
          "conversation_id",
          conversationId
        )
        .order("created_at", {
          ascending: false,
        });

      setAuditLogs(auditData || []);

      /* --------------------------------------------------- */
      /* OPEN ESCALATION                                       */
      /* --------------------------------------------------- */

      /*
       * Important:
       *
       * The conversation arrives here as "escalated".
       *
       * Once the supervisor opens it, it becomes "open".
      * The ticket becomes "open".
       *
       * This means the supervisor is actively handling it.
       */

      if (
        conversationData.status ===
        "escalated"
      ) {
        const now =
          new Date().toISOString();

        const {
          error: conversationOpenError,
        } = await supabase
          .from("conversations")
          .update({
            status: "open",
            updated_at: now,
          })
          .eq(
            "id",
            conversationId
          )
          .eq(
            "status",
            "escalated"
          );

        if (conversationOpenError) {
          console.error(
            "Opening escalation failed:",
            conversationOpenError
          );
        } else {
          setConversation(
            (current) =>
              current
                ? {
                    ...current,
                    status: "open",
                    updated_at: now,
                  }
                : current
          );
        }
      }

      /* --------------------------------------------------- */
      /* READ AUDIT                                            */
      /* --------------------------------------------------- */

      await createAuditLog(
        conversationId,
        "READ"
      );
    } catch (loadError) {
      console.error(
        "Escalation loading error:",
        loadError
      );

      setError(
        "Something went wrong while loading this conversation."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ======================================================= */
  /* AUDIT                                                     */
  /* ======================================================= */

  async function createAuditLog(
    targetConversationId: string,
    action: string,
    metadata: Record<
      string,
      unknown
    > = {}
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const normalizedAction =
      action.trim().toUpperCase();

    const allowedActions = [
      "READ",
      "MODIFIED",
      "REJECTED",
      "SENT",
    ];

    if (
      !allowedActions.includes(
        normalizedAction
      )
    ) {
      console.error(
        "Invalid audit action:",
        normalizedAction
      );

      return null;
    }

    const {
      data,
      error: auditError,
    } = await supabase
      .from("conversation_audit_logs")
      .insert({
        conversation_id:
          targetConversationId,
        actor_id: user.id,
        actor_type: "supervisor",
        action: normalizedAction,
        metadata,
      })
      .select(`
        id,
        conversation_id,
        actor_id,
        actor_type,
        action,
        metadata,
        created_at
      `)
      .single();

    if (auditError) {
      console.error(
        "Audit log error:",
        auditError
      );

      return null;
    }

    setAuditLogs(
      (current) => [
        data,
        ...current,
      ]
    );

    return data;
  }

  /* EDIT DRAFT                                                */
  /* ======================================================= */

  function startEditingDraft() {
    if (!draft) {
      return;
    }

    setEditingDraftContent(
      draft.content
    );

    setEditingDraft(true);
  }

  async function saveDraftEdit() {
    if (!conversation || !draft) {
      return;
    }

    const newContent =
      editingDraftContent.trim();

    const oldContent =
      draft.content.trim();

    if (!newContent) {
      return;
    }

    if (
      newContent === oldContent
    ) {
      setEditingDraft(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    setSavingDraft(true);

    try {
      const nextVersion =
        draft.version_number + 1;

      /* --------------------------------------------------- */
      /* NEW VERSION                                           */
      /* --------------------------------------------------- */

      const {
        data: newVersion,
        error: versionError,
      } = await supabase
        .from("message_versions")
        .insert({
          conversation_id:
            conversation.id,
          message_id: null,
          version_number:
            nextVersion,
          content: newContent,
          author_type: "supervisor",
          author_id: user.id,
        })
        .select()
        .single();

      if (
        versionError ||
        !newVersion
      ) {
        console.error(
          "Draft version error:",
          versionError
        );

        return;
      }

      /* --------------------------------------------------- */
      /* AUDIT                                                 */
      /* --------------------------------------------------- */

      await createAuditLog(
        conversation.id,
        "MODIFIED",
        {
          old_content:
            draft.content,
          new_content:
            newContent,
          version_number:
            nextVersion,
          message_id: null,
        }
      );

      setDraft(newVersion);

      setEditingDraft(false);

      setEditingDraftContent(
        newContent
      );
    } finally {
      setSavingDraft(false);
    }
  }

  /* ======================================================= */
  /* REJECT DRAFT                                              */
  /* ======================================================= */

  async function rejectDraft() {
    if (!conversation || !draft) {
      return;
    }

    setRejecting(true);

    try {
      await createAuditLog(
        conversation.id,
        "REJECTED",
        {
          old_content:
            draft.content,
          version_number:
            draft.version_number,
        }
      );

      setDraft(null);
      setEditingDraft(false);
      setEditingDraftContent("");
    } finally {
      setRejecting(false);
    }
  }

  /* ======================================================= */
  /* SEND + RESOLVE                                            */
  /* ======================================================= */

  async function sendAndResolve() {
    if (
      !conversation ||
      !draft ||
      !ticket
    ) {
      return;
    }

    const content =
      draft.content.trim();

    if (!content) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setSending(true);

    try {
      const now =
        new Date().toISOString();

      /* --------------------------------------------------- */
      /* FIRST RESPONSE                                       */
      /* --------------------------------------------------- */

      /*
       * IMPORTANT:
       *
       * first_response_at must represent
       * the first human response.
       *
       * Therefore we only set it when
       * it is currently NULL.
       */

      const firstResponseAt =
        conversation.first_response_at ??
        now;

      /* --------------------------------------------------- */
      /* SEND MESSAGE                                         */
      /* --------------------------------------------------- */

      /*
       * Your current messages.sender_type
       * already uses "agent".
       *
       * We keep that value to remain
       * compatible with the existing enum.
       *
       * actor_type in the audit log is
       * explicitly "supervisor".
       */

      const {
        data: message,
        error: messageError,
      } = await supabase
        .from("messages")
        .insert({
          conversation_id:
            conversation.id,
          sender_type: "agent",
          sender_id: user.id,
          content,
        })
        .select()
        .single();

      if (
        messageError ||
        !message
      ) {
        console.error(
          "Supervisor message error:",
          messageError
        );

        setError(
          "The response could not be sent."
        );

        return;
      }

      /* --------------------------------------------------- */
      /* AUDIT SENT                                            */
      /* --------------------------------------------------- */

      await createAuditLog(
        conversation.id,
        "SENT",
        {
          old_content: content,
          new_content: content,
          version_number:
            draft.version_number,
          message_id:
            message.id,
        }
      );

      /* --------------------------------------------------- */
      /* RESOLVE CONVERSATION                                  */
      /* --------------------------------------------------- */

      const {
        error: conversationError,
      } = await supabase
        .from("conversations")
        .update({
          status: "resolved",
          first_response_at:
            firstResponseAt,
          resolved_at: now,
          updated_at: now,
        })
        .eq(
          "id",
          conversation.id
        )
        .eq(
          "status",
          "open"
        );

      if (conversationError) {
        console.error(
          "Conversation resolution error:",
          conversationError
        );

        setError(
          "The response was sent, but the conversation could not be resolved."
        );

        return;
      }

      /* --------------------------------------------------- */
      /* RESOLVE TICKET                                       */
      /* --------------------------------------------------- */

      const {
        error: ticketError,
      } = await supabase
        .from("tickets")
        .update({
          status: "resolved",
          resolved_at: now,
        })
        .eq(
          "id",
          ticket.id
        )
        .neq(
          "status",
          "resolved"
        );

      if (ticketError) {
        console.error(
          "Ticket resolution error:",
          ticketError
        );

        setError(
          "The conversation was resolved, but the escalation ticket could not be resolved."
        );

        return;
      }

      /* --------------------------------------------------- */
      /* LOCAL STATE                                           */
      /* --------------------------------------------------- */

      setConversation(
        (current) =>
          current
            ? {
                ...current,
                status: "resolved",
                first_response_at:
                  firstResponseAt,
                resolved_at: now,
                updated_at: now,
              }
            : current
      );

      setTicket(
        (current) =>
          current
            ? {
                ...current,
                status: "resolved",
                resolved_at: now,
              }
            : current
      );

      setMessages(
        (current) => [
          ...current,
          message,
        ]
      );

      /*
       * Give the supervisor a short moment
       * to see the resolved state before
       * returning to the escalation center.
       */

      setTimeout(() => {
        router.push(
          `/supervisor/${userId}/escalations`
        );
      }, 700);
    } finally {
      setSending(false);
    }
  }

  /* ======================================================= */
  /* BACK                                                       */
  /* ======================================================= */

  function goBack() {
    router.push(
      `/supervisor/${userId}/escalations`
    );
  }

  /* ======================================================= */
  /* LOADING                                                    */
  /* ======================================================= */

  if (loading) {
    return (
      <SupervisorShell userId={userId} profile={profile}>
        <div className="h-7 w-64 animate-pulse rounded-lg bg-gray-200" />

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_265px]">
          <div className="h-[720px] animate-pulse rounded-2xl bg-white" />
          <div className="h-[720px] animate-pulse rounded-2xl bg-white" />
        </div>
      </SupervisorShell>
    );
  }

  /* ======================================================= */
  /* ERROR                                                      */
  /* ======================================================= */

  if (!conversation) {
    return (
      <SupervisorShell userId={userId} profile={profile}>
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-100 bg-white p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <ShieldAlert size={20} />
            </div>

            <h1 className="mt-4 text-lg font-semibold">
              Escalation unavailable
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {error ||
                "This conversation could not be loaded."}
            </p>

            <button
              onClick={goBack}
              className="mt-5 flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              <ArrowLeft size={15} />
              Back to escalations
            </button>
          </div>
        </div>
      </SupervisorShell>
    );
  }

  const priorityScore =
    getPriorityScore(
      conversation.urgency_score,
      conversation.sentiment,
      conversation.created_at
    );

  const priority =
    getPriorityLevel(priorityScore);

  const urgencyScore =
    conversation.urgency_score ?? 0;

  const urgencyLevel =
    getUrgencyLevel(
      conversation.urgency_score
    );

  const firstName =
    profile?.full_name?.split(" ")[0] ||
    "there";

  return (
    <SupervisorShell userId={userId} profile={profile}>

      {/* =================================================== */}
      {/* MAIN                                                   */}
      {/* =================================================== */}

      <main className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-10">

        {/* ================================================= */}
        {/* TOP HEADER                                          */}
        {/* ================================================= */}

        <div className="mb-5">

          <button
            onClick={goBack}
            className="mb-4 flex items-center gap-2 text-xs font-medium text-gray-500 transition hover:text-gray-900"
          >
            <ArrowLeft size={15} />
            Back to escalations
          </button>

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

            <div>

              <div className="flex items-center gap-2">

                <span className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-red-700">
                  <AlertTriangle size={11} />
                  Escalated
                </span>

                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[9px] font-medium capitalize text-gray-600">
                  {conversation.channel}
                </span>

              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Escalated conversation
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Welcome back, {firstName}. Resolve the customer issue and close the escalation.
              </p>

            </div>

            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">

              <span className="font-semibold">
                Ticket
              </span>{" "}

              <span className="text-gray-500">
                {ticket?.status || "unknown"}
              </span>

            </div>

          </div>
        </div>

        {/* ================================================= */}
        {/* ERROR MESSAGE                                       */}
        {/* ================================================= */}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* ================================================= */}
        {/* WORKSPACE                                           */}
        {/* ================================================= */}

        <div className="grid min-h-[720px] gap-4 lg:grid-cols-[minmax(0,1fr)_265px]">

          {/* ================================================= */}
          {/* MAIN PANEL                                          */}
          {/* ================================================= */}

          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

            {/* =============================================== */}
            {/* CONVERSATION HEADER                              */}
            {/* =============================================== */}

            <div className="border-b border-gray-100 px-5 py-3.5">

              <div className="flex items-center justify-between gap-4">

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <ShieldAlert size={18} />
                  </div>

                  <div className="min-w-0">

                    <h2 className="truncate text-sm font-semibold">
                      {customer?.full_name ||
                        "Unknown customer"}
                    </h2>

                    <p className="truncate text-[11px] text-gray-500">
                      {customer?.email ||
                        "No email"}
                    </p>

                  </div>

                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase ${getPriorityClasses(
                      priority
                    )}`}
                  >
                    {priority} priority ·{" "}
                    {priorityScore}/100
                  </span>

                  <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[9px] font-semibold uppercase text-red-700">
                    {conversation.status}
                  </span>

                </div>

              </div>

            </div>

            {/* =============================================== */}
            {/* BODY                                               */}
            {/* =============================================== */}

            <div className="flex-1 overflow-y-auto">

              <div className="p-5">

                {/* ========================================= */}
                {/* CUSTOMER / ORDER                           */}
                {/* ========================================= */}

                <div className="mb-5 grid gap-3 sm:grid-cols-2">

                  <InfoCard
                    icon={<User size={15} />}
                    label="Customer"
                    value={
                      customer?.full_name ||
                      "Unknown"
                    }
                    secondary={
                      customer?.phone ||
                      customer?.email ||
                      undefined
                    }
                  />

                  <InfoCard
                    icon={<Package size={15} />}
                    label="Order"
                    value={
                      order?.order_number ||
                      conversation.order_number ||
                      "No order linked"
                    }
                    secondary={
                      order
                        ? `${order.status} · ${
                            order.total_amount ??
                            "-"
                          } ${
                            order.currency
                          }`
                        : undefined
                    }
                  />

                </div>

                {/* ========================================= */}
                {/* ESCALATION REASON                           */}
                {/* ========================================= */}

                <div className="mb-5 rounded-2xl border border-red-100 bg-red-50/40 p-4">

                  <div className="flex items-start gap-3">

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                      <ShieldAlert size={15} />
                    </div>

                    <div className="min-w-0">

                      <p className="text-[9px] font-semibold uppercase tracking-wider text-red-500">
                        Escalation reason
                      </p>

                      <p className="mt-1 text-sm font-medium leading-6 text-red-900">
                        {ticket?.reason ||
                          "Manual escalation requiring supervisor review."}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">

                        <span className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-[9px] font-medium text-red-700">
                          Ticket:{" "}
                          {ticket?.status ||
                            "unknown"}
                        </span>

                        <span className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-[9px] font-medium text-red-700">
                          Queue:{" "}
                          {conversation.queue}
                        </span>

                      </div>

                    </div>

                  </div>

                </div>

                {/* ========================================= */}
                {/* ANALYSIS                                    */}
                {/* ========================================= */}

                <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4">

                  <div className="mb-3 flex items-center justify-between">

                    <div>

                      <h3 className="text-sm font-semibold">
                        Conversation analysis
                      </h3>

                      <p className="mt-0.5 text-[11px] text-gray-500">
                        Qualification and escalation context
                      </p>

                    </div>

                    <Sparkles
                      size={17}
                      className="text-gray-400"
                    />

                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">

                    {/* URGENCY */}

                    <div
                      className={`min-h-[128px] rounded-xl border p-4 ${getUrgencyClasses(
                        urgencyLevel
                      )}`}
                    >

                      <div className="flex items-center justify-between">

                        <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
                          Urgency
                        </span>

                        <Zap size={14} />

                      </div>

                      <div className="mt-1.5 flex items-baseline gap-1">

                        <span className="text-xl font-bold">
                          {urgencyScore}
                        </span>

                        <span className="text-[10px] opacity-60">
                          /100
                        </span>

                      </div>

                      <p className="mt-0.5 text-[11px] font-semibold capitalize">
                        {urgencyLevel}
                      </p>

                    </div>

                    {/* PRIORITY */}

                    <div
                      className={`min-h-[128px] rounded-xl border p-4 ${getPriorityClasses(
                        priority
                      )}`}
                    >

                      <div className="flex items-center justify-between">

                        <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
                          Priority
                        </span>

                        <AlertTriangle size={14} />

                      </div>

                      <div className="mt-1.5 flex items-baseline gap-1">

                        <span className="text-xl font-bold">
                          {priorityScore}
                        </span>

                        <span className="text-[10px] opacity-60">
                          /100
                        </span>

                      </div>

                      <p className="mt-0.5 text-[11px] font-semibold capitalize">
                        {priority} priority
                      </p>

                    </div>

                    {/* WAITING */}

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                      <div className="flex items-center justify-between">

                        <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                          Waiting
                        </span>

                        <Clock3
                          size={14}
                          className="text-gray-400"
                        />

                      </div>

                      <p className="mt-1.5 text-xl font-bold">
                        {formatWaitingTime(
                          conversation.created_at
                        )}
                      </p>

                      <p className="mt-0.5 text-[10px] text-gray-500">
                        Since conversation started
                      </p>

                    </div>

                    {/* INTENT */}

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                      <div className="flex items-center justify-between">

                        <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                          Intent
                        </span>

                        <MessageCircle
                          size={14}
                          className="text-gray-400"
                        />

                      </div>

                      <p className="mt-1.5 line-clamp-2 text-sm font-semibold capitalize leading-5">
                        {conversation.intent ||
                          "Unknown"}
                      </p>

                      <p className="mt-1 text-[10px] text-gray-500">
                        Language:{" "}
                        {conversation.language ||
                          "Unknown"}
                      </p>

                    </div>

                  </div>
                </div>

                {/* ========================================= */}
                {/* CONVERSATION HISTORY                        */}
                {/* ========================================= */}

                <div>

                  <div className="mb-2.5 flex items-center justify-between">

                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                      Conversation
                    </h3>

                    <span className="text-[9px] text-gray-400">
                      {messages.length} messages
                    </span>

                  </div>

                  <div className="space-y-2.5">

                    {messages.map(
                      (message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          currentUserId={
                            profile?.id || null
                          }
                        />
                      )
                    )}

                  </div>

                </div>

                {/* ========================================= */}
                {/* AI RESPONSE                                 */}
                {/* ========================================= */}

                <div className="mt-7">

                  <div className="mb-3 flex items-center justify-between">

                    <div>

                      <div className="flex items-center gap-2">

                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-white">
                          <Sparkles size={14} />
                        </div>

                        <h3 className="text-sm font-semibold">
                          AI-assisted response
                        </h3>

                      </div>

                      <p className="mt-1.5 text-[11px] text-gray-500">
                        Review and correct the suggested response before resolving the escalation.
                      </p>

                    </div>

                    {draft && (
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[9px] font-semibold text-gray-600">
                        Draft v
                        {draft.version_number}
                      </span>
                    )}

                  </div>

                  {draft ? (

                    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

                      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">

                        <div className="flex items-center gap-2">

                          <Sparkles
                            size={14}
                            className="text-gray-500"
                          />

                          <span className="text-[11px] font-medium text-gray-600">
                            Suggested reply
                          </span>

                        </div>

                        {editingDraft && (
                          <span className="text-[9px] font-medium text-gray-400">
                            Editing mode
                          </span>
                        )}

                      </div>

                      <div className="p-4">

                        <textarea
                          value={
                            editingDraft
                              ? editingDraftContent
                              : draft.content
                          }
                          disabled={
                            !editingDraft
                          }
                          onChange={(event) =>
                            setEditingDraftContent(
                              event.target.value
                            )
                          }
                          rows={8}
                          className={`min-h-[210px] w-full resize-y rounded-xl border p-4 text-[14px] leading-6 text-gray-800 outline-none transition ${
                            editingDraft
                              ? "border-gray-300 bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                              : "border-transparent bg-gray-50/60"
                          }`}
                        />

                      </div>

                      <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

                        <p className="text-[10px] text-gray-400">
                          Supervisor review required before resolution.
                        </p>

                        <div className="flex flex-wrap items-center gap-2">

                          {editingDraft ? (

                            <button
                              onClick={
                                saveDraftEdit
                              }
                              disabled={
                                savingDraft ||
                                sending
                              }
                              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                            >
                              <Check size={14} />

                              {savingDraft
                                ? "Saving..."
                                : "Done"}
                            </button>

                          ) : (

                            <button
                              onClick={
                                startEditingDraft
                              }
                              disabled={
                                sending
                              }
                              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>

                          )}

                          <button
                            onClick={
                              rejectDraft
                            }
                            disabled={
                              rejecting ||
                              sending ||
                              savingDraft
                            }
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                          >
                            <RotateCcw size={14} />

                            {rejecting
                              ? "Rejecting..."
                              : "Reject"}
                          </button>

                        </div>

                      </div>

                    </div>

                  ) : (

                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-7 text-center">

                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm">
                        <FileText size={19} />
                      </div>

                      <p className="mt-3 text-sm font-medium text-gray-600">
                        No AI draft available
                      </p>

                      <p className="mt-1 text-[11px] text-gray-400">
                        The supervisor can respond manually if the AI draft was rejected or unavailable.
                      </p>

                    </div>

                  )}

                </div>

              </div>

            </div>

            {/* =============================================== */}
            {/* BOTTOM ACTION BAR                                */}
            {/* =============================================== */}

            <div className="border-t border-gray-200 bg-white px-5 py-3">

              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-2 text-[10px] text-gray-400">

                  <Ticket size={12} />

                  <span>
                    Ticket status:
                  </span>

                  <span className="font-semibold text-gray-600">
                    {ticket?.status ||
                      "unknown"}
                  </span>

                </div>

                <div className="flex items-center gap-2">

                  <button
                    onClick={goBack}
                    disabled={sending}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    <X size={14} />
                    Close
                  </button>

                  <button
                    onClick={
                      sendAndResolve
                    }
                    disabled={
                      sending ||
                      savingDraft ||
                      editingDraft ||
                      !draft ||
                      !ticket ||
                      ticket.status ===
                        "resolved"
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send size={14} />

                    {sending
                      ? "Resolving..."
                      : "Send & Resolve"}
                  </button>

                </div>

              </div>

            </div>

          </section>

          {/* ================================================= */}
          {/* RIGHT INFO PANEL                                    */}
          {/* ================================================= */}

          <aside className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">

            {/* WAITING */}

            <div>

              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                Waiting time
              </p>

              <p className="mt-1.5 text-xl font-semibold">
                {formatWaitingTime(
                  conversation.created_at
                )}
              </p>

              <p className="mt-0.5 text-[10px] text-gray-400">
                Since conversation started
              </p>

            </div>

            {/* TICKET */}

            <div className="mt-6">

              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                Escalation ticket
              </p>

              <div className="mt-2 rounded-xl border border-gray-200 bg-white p-3">

                <DetailRow
                  label="Status"
                  value={
                    ticket?.status ||
                    "Unknown"
                  }
                />

                <DetailRow
                  label="Waiting"
                  value={
                    ticket
                      ? formatWaitingTime(
                          ticket.created_at,
                          currentTime
                        )
                      : "Unknown"
                  }
                />

              </div>

            </div>

            {/* SOURCES */}

            <div className="mt-6">

              <div className="flex items-center justify-between">

                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                  AI sources
                </p>

                <span className="text-[9px] text-gray-400">
                  {sources.length} retrieved
                </span>

              </div>

              {sources.length === 0 ? (

                <p className="mt-2 text-[10px] text-gray-500">
                  No sources available.
                </p>

              ) : (

                <div className="mt-2 space-y-1.5">

                  {sources.map(
                    (source) => (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() =>
                          setSelectedSource(
                            source
                          )
                        }
                        className="group w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-gray-300 hover:bg-gray-50"
                      >

                        <div className="flex items-start gap-2">

                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-[9px] font-bold text-gray-500">
                            #{source.rank}
                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex items-start justify-between gap-2">

                              <p className="line-clamp-2 text-[11px] font-semibold text-gray-800">
                                {source.title}
                              </p>

                              <span className="shrink-0 text-[9px] font-semibold text-gray-500">
                                {formatSimilarity(
                                  source.similarity_score
                                )}
                              </span>

                            </div>

                            <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-gray-500">
                              {source.content}
                            </p>

                            <div className="mt-1.5 flex items-center gap-1 text-[8px] font-medium text-gray-400 group-hover:text-gray-600">
                              <ExternalLink size={9} />
                              View source
                            </div>

                          </div>

                        </div>

                      </button>
                    )
                  )}

                </div>

              )}

            </div>

            {/* ORDER */}

            <div className="mt-6">

              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                Order information
              </p>

              {order ? (

                <div className="mt-2 space-y-2 text-[10px]">

                  <DetailRow
                    label="Status"
                    value={order.status}
                  />

                  <DetailRow
                    label="Order"
                    value={order.order_number}
                  />

                  <DetailRow
                    label="Tracking"
                    value={
                      order.tracking_number ||
                      "Not available"
                    }
                  />

                </div>

              ) : (

                <p className="mt-2 text-[10px] leading-4 text-gray-500">
                  No order information linked to this conversation.
                </p>

              )}

            </div>

            {/* SENTIMENT */}

            <div className="mt-6">

              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                Sentiment
              </p>

              <p className="mt-1.5 text-sm font-semibold capitalize">
                {conversation.sentiment ||
                  "Unknown"}
              </p>

            </div>

            {/* ACTIVITY */}

            <div className="mt-6 border-t border-gray-200 pt-5">

              <div className="flex items-center justify-between">

                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                  Activity
                </p>

                <span className="text-[9px] text-gray-400">
                  {auditLogs.length}
                </span>

              </div>

              {auditLogs.length > 0 ? (

                <div className="mt-2 space-y-2">

                  {auditLogs
                    .slice(0, 6)
                    .map((log) => (
                      <div
                        key={log.id}
                        className="rounded-lg border border-gray-200 bg-white p-2"
                      >

                        <div className="flex items-center justify-between gap-2">

                          <p className="text-[9px] font-medium text-gray-700">
                            {formatAuditAction(
                              log.action
                            )}
                          </p>

                          <span className="text-[8px] capitalize text-gray-400">
                            {log.actor_type}
                          </span>

                        </div>

                        <p className="mt-0.5 text-[8px] text-gray-400">
                          {new Date(
                            log.created_at
                          ).toLocaleString()}
                        </p>

                      </div>
                    ))}

                </div>

              ) : (

                <p className="mt-2 text-[10px] text-gray-500">
                  No activity recorded yet.
                </p>

              )}

            </div>

          </aside>

        </div>

      </main>

      {/* =================================================== */}
      {/* SOURCE MODAL                                          */}
      {/* =================================================== */}

      {selectedSource && (
        <SourceModal
          source={selectedSource}
          onClose={() =>
            setSelectedSource(null)
          }
        />
      )}

    </SupervisorShell>
  );
}

function SupervisorShell({
  userId,
  profile,
  children,
}: {
  userId: string;
  profile: Profile | null;
  children: ReactNode;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white lg:hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">ZEN</h1>
            <p className="text-xs text-gray-500">Supervisor</p>
          </div>

          <button
            onClick={handleSignOut}
            className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100"
            aria-label="Sign out"
          >
            <LogOut size={19} strokeWidth={1.8} />
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2">
          <SupervisorMobileLink
            href={`/supervisor/${userId}`}
            icon={<Home size={17} strokeWidth={1.8} />}
            label="Home"
          />
          <SupervisorMobileLink
            href={`/supervisor/${userId}/knowledge-base`}
            icon={<BookOpen size={17} strokeWidth={1.8} />}
            label="Knowledge Base"
          />
          <SupervisorMobileLink
            href={`/supervisor/${userId}/dashboard`}
            icon={<LayoutDashboard size={17} strokeWidth={1.8} />}
            label="Dashboard"
          />
          <SupervisorMobileLink
            href={`/supervisor/${userId}/escalations`}
            icon={<AlertTriangle size={17} strokeWidth={1.8} />}
            label="Escalations"
            active
          />
        </nav>
      </header>

      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-gray-100 px-6 py-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              ZEN
            </h1>
            <p className="mt-1 text-xs text-gray-500">Supervisor</p>
          </div>

          <nav className="flex-1 px-4 py-6">
            <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Workspace
            </p>

            <div className="space-y-1">
              <SupervisorSidebarLink
                href={`/supervisor/${userId}`}
                icon={<Home size={18} strokeWidth={1.8} />}
                label="Home"
              />
              <SupervisorSidebarLink
                href={`/supervisor/${userId}/knowledge-base`}
                icon={<BookOpen size={18} strokeWidth={1.8} />}
                label="Knowledge Base"
              />
              <SupervisorSidebarLink
                href={`/supervisor/${userId}/dashboard`}
                icon={<LayoutDashboard size={18} strokeWidth={1.8} />}
                label="Dashboard"
              />
              <SupervisorSidebarLink
                href={`/supervisor/${userId}/escalations`}
                icon={<AlertTriangle size={18} strokeWidth={1.8} />}
                label="Escalations"
                active
              />
            </div>
          </nav>

          <div className="border-t border-gray-100 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                <UserRound size={17} strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {profile?.full_name ?? "Supervisor"}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {profile?.email ?? ""}
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

        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function SupervisorSidebarLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
        active
          ? "bg-gray-100 font-medium text-gray-900"
          : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span className={active ? "text-gray-900" : "text-gray-500"}>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

function SupervisorMobileLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
        active
          ? "bg-gray-100 text-gray-900"
          : "text-gray-500 hover:bg-gray-50"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

/* ========================================================= */
/* MESSAGE BUBBLE                                              */
/* ========================================================= */

function MessageBubble({
  message,
  currentUserId,
}: {
  message: Message;
  currentUserId: string | null;
}) {
  const isCustomer =
    message.sender_type ===
    "customer";

  const isAI =
    message.sender_type === "ai";

  const isSupervisor =
    message.sender_id ===
      currentUserId &&
    message.sender_type ===
      "agent";

  return (
    <div
      className={`flex ${
        isCustomer
          ? "justify-start"
          : "justify-end"
      }`}
    >

      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
          isCustomer
            ? "bg-gray-100 text-gray-800"
            : isAI
            ? "border border-gray-200 bg-gray-50 text-gray-800"
            : "bg-gray-900 text-white"
        }`}
      >

        <div className="mb-1 flex items-center gap-2">

          <span className="text-[9px] font-semibold uppercase tracking-wider opacity-60">

            {isCustomer
              ? "Customer"
              : isAI
              ? "AI"
              : isSupervisor
              ? "Supervisor"
              : "Agent"}

          </span>

          <span className="text-[9px] opacity-50">
            {new Date(
              message.created_at
            ).toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </span>

        </div>

        <p className="whitespace-pre-wrap text-[13px] leading-5.5">
          {message.content}
        </p>

      </div>

    </div>
  );
}

/* ========================================================= */
/* SOURCE MODAL                                                */
/* ========================================================= */

function SourceModal({
  source,
  onClose,
}: {
  source: Source;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >

      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">

          <div className="flex min-w-0 items-start gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <FileText size={17} />
            </div>

            <div className="min-w-0">

              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                Retrieved FAQ source #
                {source.rank}
              </p>

              <h2 className="mt-1 text-base font-semibold leading-5 text-gray-900">
                {source.title}
              </h2>

            </div>

          </div>

          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>

        </div>

        <div className="max-h-[calc(85vh-80px)] overflow-y-auto p-5">

          <div className="grid gap-3 sm:grid-cols-2">

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">

              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                Rank
              </p>

              <p className="mt-1 text-xl font-bold">
                #{source.rank}
              </p>

            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">

              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                Similarity
              </p>

              <p className="mt-1 text-xl font-bold">
                {formatSimilarity(
                  source.similarity_score
                )}
              </p>

            </div>

          </div>

          <div className="mt-5">

            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
              FAQ article
            </p>

            <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4">

              <p className="text-sm font-semibold leading-6">
                {source.title}
              </p>

            </div>

          </div>

          <div className="mt-5">

            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
              Retrieved chunk
            </p>

            <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-4">

              <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                {source.content}
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

/* ========================================================= */
/* INFO CARD                                                   */
/* ========================================================= */

function InfoCard({
  icon,
  label,
  value,
  secondary,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5">

      <div className="flex items-center gap-2 text-gray-400">

        {icon}

        <span className="text-[9px] font-semibold uppercase tracking-wider">
          {label}
        </span>

      </div>

      <p className="mt-1.5 truncate text-sm font-semibold">
        {value}
      </p>

      {secondary && (
        <p className="mt-0.5 truncate text-[10px] capitalize text-gray-500">
          {secondary}
        </p>
      )}

    </div>
  );
}

/* ========================================================= */
/* DETAIL ROW                                                  */
/* ========================================================= */

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-2">

      <span className="text-gray-400">
        {label}
      </span>

      <span className="max-w-[65%] truncate text-right font-medium text-gray-700">
        {value}
      </span>

    </div>
  );
}