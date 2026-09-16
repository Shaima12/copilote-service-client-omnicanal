"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  MessageSquare,
  CircleHelp,
  AlertTriangle,
  UserCircle,
  LogOut,
  Search,
  Clock3,
  Send,
  X,
  Package,
  User,
  FileText,
  ChevronLeft,
  Pencil,
  Sparkles,
  Check,
  RotateCcw,
  Zap,
  Inbox,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConversationRealtime } from "@/lib/supabase/use-conversation-realtime";

/* ========================================================= */
/* TYPES                                                       */
/* ========================================================= */

type Profile = {
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
/* SENTIMENT SCORE                                             */
/* ========================================================= */

function getSentimentScore(sentiment: string | null) {
  switch (sentiment) {
    case "angry":
      return 100;

    case "negative":
      return 50;

    case "positive":
    case "neutral":
    default:
      return 0;
  }
}

/* ========================================================= */
/* WAITING TIME                                                */
/* ========================================================= */

function getWaitingMinutes(createdAt: string) {
  const created = new Date(createdAt).getTime();
  const now = Date.now();

  return Math.max(
    0,
    Math.floor((now - created) / 1000 / 60)
  );
}

function getWaitingScore(createdAt: string) {
  const waitingMinutes =
    getWaitingMinutes(createdAt);

  if (waitingMinutes < 15) {
    return 0;
  }

  if (waitingMinutes < 30) {
    return 25;
  }

  if (waitingMinutes < 60) {
    return 50;
  }

  return 75;
}

/* ========================================================= */
/* WAITING DISPLAY                                             */
/* ========================================================= */

function formatWaitingTime(createdAt: string) {
  const minutes =
    getWaitingMinutes(createdAt);

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

/* ========================================================= */
/* PRIORITY                                                     */
/* ========================================================= */

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
  if (score < 25) {
    return "low";
  }

  if (score < 50) {
    return "medium";
  }

  if (score < 75) {
    return "high";
  }

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

/* ========================================================= */
/* URGENCY                                                     */
/* ========================================================= */

function getUrgencyLevel(score: number | null) {
  const value = Math.min(
    100,
    Math.max(0, score ?? 0)
  );

  if (value <= 25) {
    return "low";
  }

  if (value <= 50) {
    return "medium";
  }

  if (value <= 75) {
    return "high";
  }

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

/* ========================================================= */
/* SIMILARITY DISPLAY                                          */
/* ========================================================= */

function formatSimilarity(score: number) {
  const normalized =
    score <= 1
      ? score * 100
      : score;

  return `${Math.round(normalized * 10) / 10}%`;
}

/* ========================================================= */
/* PAGE                                                         */
/* ========================================================= */

export default function AgentConversationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const routeUserId = pathname.split("/")[2];
  const supabase = createClient();

  /* ======================================================= */
  /* STATE                                                     */
  /* ======================================================= */

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [customers, setCustomers] =
    useState<Record<string, Customer>>({});

  const [messages, setMessages] =
    useState<Record<string, Message[]>>({});

  const [orders, setOrders] =
    useState<Record<string, Order | null>>({});

  const [drafts, setDrafts] =
    useState<
      Record<
        string,
        MessageVersion | null
      >
    >({});

  const [sources, setSources] =
    useState<Record<string, Source[]>>({});

  const [auditLogs, setAuditLogs] =
    useState<Record<string, AuditLog[]>>({});

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState<string | null>(null);

  const [selectedSource, setSelectedSource] =
    useState<Source | null>(null);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [savingDraft, setSavingDraft] =
    useState(false);

  const [escalating, setEscalating] =
    useState(false);

  const [editingDraft, setEditingDraft] =
    useState(false);

  /*
   * IMPORTANT:
   * We keep the edited text separately from
   * the saved message_versions row.
   *
   * This allows us to compare:
   *
   * current saved version
   *          vs
   * edited version
   *
   * before creating a new version.
   */
  const [editingDraftContent, setEditingDraftContent] =
    useState("");

  const [rejectedDrafts, setRejectedDrafts] =
    useState<Record<string, boolean>>({});

  useConversationRealtime({
    conversationId: selectedConversationId,
    onMessage: (message) => {
      setMessages((current) => {
        const conversationMessages = current[selectedConversationId || ""] || [];

        if (conversationMessages.some((item) => item.id === message.id)) {
          return current;
        }

        return {
          ...current,
          [selectedConversationId || ""]: [
            ...conversationMessages,
            message as Message,
          ],
        };
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
    },
    onDraft: (updatedDraft) => {
      const draftConversationId = updatedDraft.conversation_id;

      if (!draftConversationId) {
        return;
      }

      setDrafts((current) => ({
        ...current,
        [draftConversationId]: updatedDraft as MessageVersion,
      }));
    },
  });

  /* ======================================================= */
  /* LOAD DATA                                                 */
  /* ======================================================= */

  useEffect(() => {
    loadAgentData();
  }, []);

  async function loadAgentData() {
    setLoading(true);

    try {
      /* --------------------------------------------------- */
      /* AUTH                                                 */
      /* --------------------------------------------------- */

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      /* --------------------------------------------------- */
      /* PROFILE                                              */
      /* --------------------------------------------------- */

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "full_name, email, role"
        )
        .eq("id", user.id)
        .single();

      if (
        profileError ||
        !profileData ||
        profileData.role !== "agent"
      ) {
        router.push("/login");
        return;
      }

      setProfile(profileData);

      /* --------------------------------------------------- */
      /* CONVERSATIONS                                        */
      /* --------------------------------------------------- */

      const {
        data: conversationData,
        error: conversationError,
      } = await supabase
        .from("conversations")
        .select(
          `
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
          created_at,
          updated_at
          `
        )
        .in("status", [
          "new",
          "open",
        ])
        .order("created_at", {
          ascending: true,
        });

      if (conversationError) {
        console.error(
          "Conversation loading error:",
          conversationError
        );
      }

      const conversationList =
        conversationData || [];

      setConversations(
        conversationList
      );

      if (
        conversationList.length === 0
      ) {
        setLoading(false);
        return;
      }

      const conversationIds =
        conversationList.map(
          (conversation) =>
            conversation.id
        );

      /* --------------------------------------------------- */
      /* CUSTOMERS                                            */
      /* --------------------------------------------------- */

      const customerIds = [
        ...new Set(
          conversationList.map(
            (conversation) =>
              conversation.customer_id
          )
        ),
      ];

      if (customerIds.length > 0) {
        const {
          data: customerData,
          error: customerError,
        } = await supabase
          .from("customers")
          .select(
            "id, full_name, email, phone"
          )
          .in(
            "id",
            customerIds
          );

        if (customerError) {
          console.error(
            "Customer loading error:",
            customerError
          );
        }

        const customerMap: Record<
          string,
          Customer
        > = {};

        (customerData || []).forEach(
          (customer) => {
            customerMap[
              customer.id
            ] = customer;
          }
        );

        setCustomers(customerMap);
      }

      /* --------------------------------------------------- */
      /* MESSAGES                                             */
      /* --------------------------------------------------- */

      const {
        data: messageData,
        error: messageError,
      } = await supabase
        .from("messages")
        .select(
          `
          id,
          conversation_id,
          sender_type,
          sender_id,
          content,
          created_at
          `
        )
        .in(
          "conversation_id",
          conversationIds
        )
        .order("created_at", {
          ascending: true,
        });

      if (messageError) {
        console.error(
          "Message loading error:",
          messageError
        );
      }

      const messageMap: Record<
        string,
        Message[]
      > = {};

      (messageData || []).forEach(
        (message) => {
          if (
            !messageMap[
              message.conversation_id
            ]
          ) {
            messageMap[
              message.conversation_id
            ] = [];
          }

          messageMap[
            message.conversation_id
          ].push(message);
        }
      );

      setMessages(messageMap);

      /* --------------------------------------------------- */
      /* AI DRAFT VERSIONS                                    */
      /* --------------------------------------------------- */

      const {
        data: versionData,
        error: versionError,
      } = await supabase
        .from("message_versions")
        .select(
          `
          id,
          conversation_id,
          message_id,
          version_number,
          content,
          author_type,
          author_id,
          created_at
          `
        )
        .in(
          "conversation_id",
          conversationIds
        )
        .is(
          "message_id",
          null
        )
        .order(
          "version_number",
          {
            ascending: false,
          }
        );

      if (versionError) {
        console.error(
          "Draft loading error:",
          versionError
        );
      }

      const draftMap: Record<
        string,
        MessageVersion | null
      > = {};

      (versionData || []).forEach(
        (version) => {
          if (
            version.conversation_id &&
            !draftMap[
              version.conversation_id
            ]
          ) {
            draftMap[
              version.conversation_id
            ] = version;
          }
        }
      );

      setDrafts(draftMap);

      /* --------------------------------------------------- */
      /* AI RESPONSE SOURCES                                  */
      /*                                                       */
      /* ai_response_sources                                  */
      /*        ↓                                              */
      /* faq_chunks                                            */
      /*        ↓ article_id                                  */
      /* faq_articles                                          */
      /*                                                       */
      /* chunk.content = retrieved passage                     */
      /* article.title = FAQ article title                     */
      /* --------------------------------------------------- */

      const messageIds =
        (messageData || []).map(
          (message) =>
            message.id
        );

      if (messageIds.length > 0) {
        const {
          data: sourceData,
          error: sourceError,
        } = await supabase
          .from("ai_response_sources")
          .select(
            `
            id,
            message_id,
            chunk_id,
            similarity_score,
            rank
            `
          )
          .in(
            "message_id",
            messageIds
          )
          .order("rank", {
            ascending: true,
          });

        if (sourceError) {
          console.error(
            "AI source loading error:",
            sourceError
          );
        }

        const sourceRows =
          sourceData || [];

        const chunkIds = [
          ...new Set(
            sourceRows.map(
              (source) =>
                source.chunk_id
            )
          ),
        ];

        const chunkMap: Record<
          string,
          {
            id: string;
            article_id: string;
            content: string;
          }
        > = {};

        /* ----------------------------------------------- */
        /* GET FAQ CHUNKS                                   */
        /* ----------------------------------------------- */

        if (chunkIds.length > 0) {
          const {
            data: chunkData,
            error: chunkError,
          } = await supabase
            .from("faq_chunks")
            .select(
              `
              id,
              article_id,
              content
              `
            )
            .in(
              "id",
              chunkIds
            );

          if (chunkError) {
            console.error(
              "FAQ chunk loading error:",
              chunkError
            );
          }

          (chunkData || []).forEach(
            (chunk) => {
              chunkMap[
                chunk.id
              ] = {
                id: chunk.id,
                article_id:
                  chunk.article_id,
                content:
                  chunk.content ||
                  "",
              };
            }
          );
        }

        /* ----------------------------------------------- */
        /* GET FAQ ARTICLES                                 */
        /* ----------------------------------------------- */

        const articleIds = [
          ...new Set(
            Object.values(
              chunkMap
            )
              .map(
                (chunk) =>
                  chunk.article_id
              )
              .filter(Boolean)
          ),
        ];

        const articleMap: Record<
          string,
          string
        > = {};

        if (
          articleIds.length > 0
        ) {
          const {
            data: articleData,
            error: articleError,
          } = await supabase
            .from("faq_articles")
            .select(
              `
              id,
              title
              `
            )
            .in(
              "id",
              articleIds
            );

          if (articleError) {
            console.error(
              "FAQ article loading error:",
              articleError
            );
          }

          (articleData || []).forEach(
            (article) => {
              articleMap[
                article.id
              ] =
                article.title ||
                "Untitled FAQ article";
            }
          );
        }

        /* ----------------------------------------------- */
        /* BUILD SOURCE MAP                                 */
        /* ----------------------------------------------- */

        const sourceMap: Record<
          string,
          Source[]
        > = {};

        sourceRows.forEach(
          (source) => {
            const message =
              (messageData || []).find(
                (item) =>
                  item.id ===
                  source.message_id
              );

            if (!message) {
              return;
            }

            const chunk =
              chunkMap[
                source.chunk_id
              ];

            const conversationId =
              message.conversation_id;

            if (
              !sourceMap[
                conversationId
              ]
            ) {
              sourceMap[
                conversationId
              ] = [];
            }

            sourceMap[
              conversationId
            ].push({
              ...source,
              title:
                chunk?.article_id
                  ? articleMap[
                      chunk.article_id
                    ] ||
                    "Untitled FAQ article"
                  : "Untitled FAQ article",
              content:
                chunk?.content ||
                "Source content unavailable.",
            });
          }
        );

        setSources(sourceMap);
      }

      /* --------------------------------------------------- */
      /* AUDIT / CONVERSATION LOGS                            */
      /* --------------------------------------------------- */

      const {
        data: auditData,
        error: auditError,
      } = await supabase
        .from("conversation_audit_logs")
        .select(
          `
          id,
          conversation_id,
          actor_id,
          actor_type,
          action,
          metadata,
          created_at
          `
        )
        .in(
          "conversation_id",
          conversationIds
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (auditError) {
        console.error(
          "Audit log loading error:",
          auditError
        );
      }

      const auditMap: Record<
        string,
        AuditLog[]
      > = {};

      (auditData || []).forEach(
        (log) => {
          if (
            !auditMap[
              log.conversation_id
            ]
          ) {
            auditMap[
              log.conversation_id
            ] = [];
          }

          auditMap[
            log.conversation_id
          ].push(log);
        }
      );

      setAuditLogs(auditMap);

      /* --------------------------------------------------- */
      /* ORDERS                                               */
      /* --------------------------------------------------- */

      const orderNumbers = [
        ...new Set(
          conversationList
            .map(
              (conversation) =>
                conversation.order_number
            )
            .filter(
              (
                value
              ): value is string =>
                Boolean(value)
            )
        ),
      ];

      if (
        orderNumbers.length > 0
      ) {
        const {
          data: orderData,
          error: orderError,
        } = await supabase
          .from("orders")
          .select(
            `
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
            `
          )
          .in(
            "order_number",
            orderNumbers
          );

        if (orderError) {
          console.error(
            "Order loading error:",
            orderError
          );
        }

        const orderMap: Record<
          string,
          Order | null
        > = {};

        (orderData || []).forEach(
          (order) => {
            orderMap[
              order.order_number
            ] = order;
          }
        );

        setOrders(orderMap);
      }
    } finally {
      setLoading(false);
    }
  }

  /* ======================================================= */
  /* AUDIT HELPER                                              */
  /* ======================================================= */

  async function createAuditLog({
    conversationId,
    action,
    oldContent = null,
    newContent = null,
    versionNumber = null,
    messageId = null,
  }: {
    conversationId: string;
    action: string;
    oldContent?: string | null;
    newContent?: string | null;
    versionNumber?: number | null;
    messageId?: string | null;
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error(
        "Audit log: no authenticated user"
      );
      return null;
    }

    const normalizedAction =
      action.trim().toUpperCase();

    const allowedActions = [
      "READ",
      "MODIFIED",
      "REJECTED",
      "SENT",
      "ESCALATED",
    ];

    if (
      !allowedActions.includes(
        normalizedAction
      )
    ) {
      console.error(
        "Invalid audit action:",
        {
          received: action,
          normalized:
            normalizedAction,
          allowed: allowedActions,
        }
      );
      return null;
    }

    const metadata = {
      old_content: oldContent,
      new_content: newContent,
      version_number: versionNumber,
      message_id: messageId,
    };

    console.log(
      "Creating audit log:",
      {
        conversationId,
        action: normalizedAction,
        actorId: user.id,
      }
    );

    const {
      data,
      error,
    } = await supabase
      .from("conversation_audit_logs")
      .insert({
        conversation_id:
          conversationId,
        actor_id: user.id,
        actor_type: "agent",
        action: normalizedAction,
        metadata,
      })
      .select(
        `
        id,
        conversation_id,
        actor_id,
        actor_type,
        action,
        metadata,
        created_at
        `
      )
      .single();

    if (error) {
      console.error(
        "Audit log insert error:",
        {
          error,
          actionSentToDatabase:
            normalizedAction,
          conversationId,
          userId: user.id,
        }
      );

      return null;
    }

    setAuditLogs(
      (current) => ({
        ...current,
        [conversationId]: [
          data,
          ...(current[
            conversationId
          ] || []),
        ],
      })
    );

    return data;
  }

  /* ======================================================= */
  /* OPEN CONVERSATION                                        */
  /* ======================================================= */

  async function openConversation(
    conversation: Conversation
  ) {
    setSelectedConversationId(
      conversation.id
    );

    setEditingDraft(false);

    setEditingDraftContent("");

    setSelectedSource(null);

    if (
      conversation.status ===
      "new"
    ) {
      const { error } =
        await supabase
          .from("conversations")
          .update({
            status: "open",
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            conversation.id
          );

      if (!error) {
        setConversations(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                conversation.id
                  ? {
                      ...item,
                      status:
                        "open",
                    }
                  : item
            )
        );
      }
    }
  }

  /* ======================================================= */
  /* START EDITING                                             */
  /* ======================================================= */

  function startEditingDraft() {
    if (
      !selectedConversationId
    ) {
      return;
    }

    const draft =
      drafts[
        selectedConversationId
      ];

    if (!draft) {
      return;
    }

    /*
     * Do NOT modify drafts here.
     *
     * We edit a separate temporary value.
     */
    setEditingDraftContent(
      draft.content
    );

    setEditingDraft(true);
  }

  /* ======================================================= */
  /* SAVE DRAFT VERSION                                       */
  /* ======================================================= */

  async function saveDraftEdit() {
    if (
      !selectedConversationId
    ) {
      return;
    }

    const conversationId =
      selectedConversationId;

    const currentDraft =
      drafts[
        conversationId
      ];

    if (!currentDraft) {
      return;
    }

    const newContent =
      editingDraftContent.trim();

    const oldContent =
      currentDraft.content.trim();

    if (!newContent) {
      return;
    }

    /*
     * Nothing changed.
     */
    if (
      newContent ===
      oldContent
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
      const nextVersionNumber =
        currentDraft.version_number +
        1;

      /* ----------------------------------------------- */
      /* CREATE NEW MESSAGE VERSION                       */
      /* ----------------------------------------------- */

      const {
        data: newVersion,
        error: versionError,
      } = await supabase
        .from("message_versions")
        .insert({
          conversation_id:
            conversationId,
          message_id: null,
          version_number:
            nextVersionNumber,
          content: newContent,
          author_type: "agent",
          author_id: user.id,
        })
        .select()
        .single();

      if (
        versionError ||
        !newVersion
      ) {
        console.error(
          "Message version save error:",
          versionError
        );

        return;
      }

      /* ----------------------------------------------- */
      /* AUDIT THE MODIFICATION                           */
      /* ----------------------------------------------- */

      await createAuditLog({
        conversationId,
        action: "MODIFIED",
        oldContent:
          currentDraft.content,
        newContent,
        versionNumber:
          nextVersionNumber,
        messageId: null,
      });

      /* ----------------------------------------------- */
      /* UPDATE CURRENT DRAFT                             */
      /* ----------------------------------------------- */

      setDrafts(
        (current) => ({
          ...current,
          [conversationId]:
            newVersion,
        })
      );

      setEditingDraftContent(
        newContent
      );

      setEditingDraft(false);
    } finally {
      setSavingDraft(false);
    }
  }

  /* ======================================================= */
  /* REJECT AI DRAFT                                          */
  /* ======================================================= */

  async function rejectDraft() {
    if (
      !selectedConversationId
    ) {
      return;
    }

    const conversationId =
      selectedConversationId;

    const draft =
      drafts[
        conversationId
      ];

    await createAuditLog({
      conversationId,
      action: "REJECTED",
      oldContent:
        draft?.content || null,
    });

    setRejectedDrafts(
      (current) => ({
        ...current,
        [conversationId]:
          true,
      })
    );

    setEditingDraft(false);

    setEditingDraftContent("");
  }

  /* ======================================================= */
  /* SEND RESPONSE                                            */
  /* ======================================================= */

  async function sendResponse() {
    if (
      !selectedConversationId
    ) {
      return;
    }

    const conversationId =
      selectedConversationId;

    const draft =
      drafts[
        conversationId
      ];

    if (
      !draft?.content.trim()
    ) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    setSending(true);

    try {
      /* ----------------------------------------------- */
      /* CREATE AGENT MESSAGE                             */
      /* ----------------------------------------------- */

      const {
        data: message,
        error: messageError,
      } = await supabase
        .from("messages")
        .insert({
          conversation_id:
            conversationId,
          sender_type:
            "agent",
          sender_id:
            user.id,
          content:
            draft.content,
        })
        .select()
        .single();

      if (
        messageError ||
        !message
      ) {
        console.error(
          "Send message error:",
          messageError
        );

        return;
      }

      /* ----------------------------------------------- */
      /* AUDIT SEND                                        */
      /* ----------------------------------------------- */

      await createAuditLog({
        conversationId,
        action: "SENT",
        oldContent:
          draft.content,
        newContent:
          draft.content,
        versionNumber:
          draft.version_number,
        messageId:
          message.id,
      });

      /* ----------------------------------------------- */
      /* UPDATE CONVERSATION                               */
      /* ----------------------------------------------- */

      const now =
        new Date().toISOString();

      const {
        error: updateError,
      } = await supabase
        .from("conversations")
        .update({
          status:
            "resolved",
          resolved_at: now,
          first_response_at:
            now,
          updated_at: now,
        })
        .eq(
          "id",
          conversationId
        );

      if (updateError) {
        console.error(
          "Conversation update error:",
          updateError
        );
      }

      /* ----------------------------------------------- */
      /* REMOVE FROM OPEN INBOX                            */
      /* ----------------------------------------------- */

      setConversations(
        (current) =>
          current.filter(
            (conversation) =>
              conversation.id !==
              conversationId
          )
      );

      setSelectedConversationId(
        null
      );

      setEditingDraft(false);

      setEditingDraftContent("");
    } finally {
      setSending(false);
    }
  }

  /* ======================================================= */
  /* ESCALATE CONVERSATION                                    */
  /* ======================================================= */

  async function escalateConversation() {
    if (
      !selectedConversationId
    ) {
      return;
    }

    const conversationId =
      selectedConversationId;

    setEscalating(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      /* ----------------------------------------------- */
      /* UPDATE STATUS                                     */
      /* ----------------------------------------------- */

      const {
        error: updateError,
      } = await supabase
        .from("conversations")
        .update({
          status:
            "escalated",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          conversationId
        );

      if (updateError) {
        console.error(
          "Escalation update error:",
          updateError
        );

        return;
      }

      /* ----------------------------------------------- */
      /* AUDIT ESCALATION                                  */
      /* ----------------------------------------------- */

      await createAuditLog({
        conversationId,
        action: "ESCALATED",
      });

      /* ----------------------------------------------- */
      /* REMOVE FROM OPEN INBOX                            */
      /* ----------------------------------------------- */

      setConversations(
        (current) =>
          current.filter(
            (conversation) =>
              conversation.id !==
              conversationId
          )
      );

      setSelectedConversationId(
        null
      );

      setEditingDraft(false);

      setEditingDraftContent("");
    } finally {
      setEscalating(false);
    }
  }

  /* ======================================================= */
  /* SIGN OUT                                                  */
  /* ======================================================= */

  async function signOut() {
    await supabase.auth.signOut();

    router.push("/login");
  }

  /* ======================================================= */
  /* FILTER                                                   */
  /* ======================================================= */

  const filteredConversations =
    useMemo(() => {
      const query =
        search
          .toLowerCase()
          .trim();

      if (!query) {
        return conversations;
      }

      return conversations.filter(
        (conversation) => {
          const customer =
            customers[
              conversation.customer_id
            ];

          const customerName =
            customer?.full_name
              ?.toLowerCase() || "";

          const orderNumber =
            conversation.order_number
              ?.toLowerCase() || "";

          const queue =
            conversation.queue
              ?.toLowerCase() || "";

          const intent =
            conversation.intent
              ?.toLowerCase() || "";

          return (
            customerName.includes(
              query
            ) ||
            orderNumber.includes(
              query
            ) ||
            queue.includes(query) ||
            intent.includes(query)
          );
        }
      );
    }, [
      conversations,
      customers,
      search,
    ]);

  /* ======================================================= */
  /* SELECTED DATA                                            */
  /* ======================================================= */

  const selectedConversation =
    conversations.find(
      (conversation) =>
        conversation.id ===
        selectedConversationId
    ) || null;

  const selectedCustomer =
    selectedConversation
      ? customers[
          selectedConversation
            .customer_id
        ]
      : null;

  const selectedMessages =
    selectedConversation
      ? messages[
          selectedConversation.id
        ] || []
      : [];

  const selectedDraft =
    selectedConversation &&
    !rejectedDrafts[
      selectedConversation.id
    ]
      ? drafts[
          selectedConversation.id
        ] || null
      : null;

  const selectedOrder =
    selectedConversation?.order_number
      ? orders[
          selectedConversation
            .order_number
        ] || null
      : null;

  const selectedSources =
    selectedConversation
      ? sources[
          selectedConversation.id
        ] || []
      : [];

  const selectedAuditLogs =
    selectedConversation
      ? auditLogs[
          selectedConversation.id
        ] || []
      : [];

  const firstName =
    profile?.full_name?.split(
      " "
    )[0] || "there";

  /* ======================================================= */
  /* LOADING                                                   */
  /* ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="flex min-h-screen">
          <aside className="hidden w-64 border-r border-gray-200 bg-white md:block" />

          <main className="flex-1 p-6 md:p-10">
            <div className="mx-auto max-w-7xl">
              <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200" />

              <div className="mt-8 grid gap-4 lg:grid-cols-[240px_1fr]">
                <div className="h-[700px] animate-pulse rounded-2xl bg-white" />

                <div className="h-[700px] animate-pulse rounded-2xl bg-white" />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* ======================================================= */
  /* UI                                                        */
  /* ======================================================= */

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-900">

      {/* =================================================== */}
      {/* MOBILE HEADER                                        */}
      {/* =================================================== */}

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
            onClick={signOut}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
          >
            <LogOut size={19} />
          </button>

        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2">

          <MobileNavItem
            icon={<Home size={17} />}
            label="Home"
            onClick={() =>
              router.push(
                `/agent/${routeUserId}`
              )
            }
          />

          <MobileNavItem
            icon={
              <CircleHelp size={17} />
            }
            label="FAQ"
            onClick={() =>
              router.push(
                `/agent/${routeUserId}/faq`
              )
            }
          />

          <MobileNavItem
            icon={
              <MessageSquare size={17} />
            }
            label="Conversations"
            active
            onClick={() =>
              router.push(
                `/agent/${routeUserId}/conversations`
              )
            }
          />

          <MobileNavItem
            icon={
              <AlertTriangle size={17} />
            }
            label="Escalations"
            onClick={() =>
              router.push(
                `/agent/${routeUserId}/escalations`
              )
            }
          />

          <MobileNavItem
            icon={
              <UserCircle size={17} />
            }
            label="Profile"
            onClick={() =>
              router.push(
                `/agent/${routeUserId}/profile`
              )
            }
          />

        </nav>
      </header>

      {/* =================================================== */}
      {/* DESKTOP LAYOUT                                      */}
      {/* =================================================== */}

      <div className="flex min-h-screen">

        {/* SIDEBAR */}

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
                onClick={() =>
                  router.push(
                    `/agent/${routeUserId}`
                  )
                }
              />

              <SidebarItem
                icon={
                  <CircleHelp size={18} />
                }
                label="FAQ"
                onClick={() =>
                  router.push(
                    `/agent/${routeUserId}/faq`
                  )
                }
              />

              <SidebarItem
                icon={
                  <MessageSquare size={18} />
                }
                label="Conversations"
                active
                onClick={() =>
                  router.push(
                    `/agent/${routeUserId}/conversations`
                  )
                }
              />

              <SidebarItem
                icon={
                  <AlertTriangle size={18} />
                }
                label="Escalations"
                onClick={() =>
                  router.push(
                    `/agent/${routeUserId}/escalations`
                  )
                }
              />

              <SidebarItem
                icon={
                  <UserCircle size={18} />
                }
                label="Profile"
                onClick={() =>
                  router.push(
                    `/agent/${routeUserId}/profile`
                  )
                }
              />

            </div>
          </nav>

          <div className="border-t border-gray-100 p-4">

            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut size={18} />
              Sign out
            </button>

          </div>

        </aside>

        {/* ================================================= */}
        {/* MAIN                                                */}
        {/* ================================================= */}

        <main className="flex-1 md:ml-64">

          <div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-10">

            {/* HEADER */}

            <div className="mb-5">

              <p className="text-sm font-medium text-gray-500">
                Agent workspace
              </p>

              <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

                <div>

                  <h1 className="text-3xl font-semibold tracking-tight">
                    Customer inbox
                  </h1>

                  <p className="mt-1 text-sm text-gray-500">
                    Welcome back, {firstName}. Handle incoming customer conversations.
                  </p>

                </div>

                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">

                  <span className="font-semibold">
                    {
                      conversations.length
                    }
                  </span>{" "}
                  open conversations

                </div>

              </div>
            </div>

            {/* ================================================= */}
            {/* INBOX + CONVERSATION                               */}
            {/* ================================================= */}

            <div className="grid min-h-[720px] gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">

              {/* ================================================= */}
              {/* INBOX                                              */}
              {/* ================================================= */}

              <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

                <div className="border-b border-gray-100 px-4 py-3.5">

                  <div className="flex items-center justify-between">

                    <div>

                      <h2 className="text-sm font-semibold">
                        Inbox
                      </h2>

                      <p className="mt-0.5 text-[11px] text-gray-500">
                        Conversations requiring attention
                      </p>

                    </div>

                    <div className="flex h-7 min-w-7 items-center justify-center rounded-full bg-gray-100 px-2 text-[11px] font-semibold text-gray-700">
                      {
                        conversations.length
                      }
                    </div>

                  </div>

                  <div className="relative mt-3">

                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />

                    <input
                      value={search}
                      onChange={(
                        event
                      ) =>
                        setSearch(
                          event.target.value
                        )
                      }
                      placeholder="Search..."
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-xs outline-none transition focus:border-gray-300 focus:bg-white"
                    />

                  </div>

                </div>

                {/* CONVERSATION LIST */}

                <div className="flex-1 overflow-y-auto">

                  {filteredConversations.length ===
                  0 ? (
                    <div className="flex h-full items-center justify-center px-6 text-center">

                      <div>

                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 text-gray-400">
                          <Inbox size={19} />
                        </div>

                        <p className="mt-3 text-sm font-medium">
                          No conversations
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          New customer conversations will appear here.
                        </p>

                      </div>

                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">

                      {filteredConversations.map(
                        (
                          conversation
                        ) => {

                          const customer =
                            customers[
                              conversation.customer_id
                            ];

                          const priorityScore =
                            getPriorityScore(
                              conversation.urgency_score,
                              conversation.sentiment,
                              conversation.created_at
                            );

                          const priority =
                            getPriorityLevel(
                              priorityScore
                            );

                          const conversationMessages =
                            messages[
                              conversation.id
                            ] || [];

                          const lastMessage =
                            conversationMessages[
                              conversationMessages.length -
                                1
                            ];

                          const isSelected =
                            selectedConversationId ===
                            conversation.id;

                          return (
                            <button
                              key={
                                conversation.id
                              }
                              onClick={() =>
                                openConversation(
                                  conversation
                                )
                              }
                              className={`w-full border-l-2 px-3.5 py-3 text-left transition ${
                                isSelected
                                  ? "border-blue-600 bg-blue-50/40"
                                  : "border-transparent hover:bg-gray-50"
                              }`}
                            >

                              <div className="flex items-start justify-between gap-2">

                                <div className="min-w-0 flex-1">

                                  <div className="flex items-center gap-2">

                                    <p className="truncate text-[13px] font-semibold">
                                      {
                                        customer?.full_name ||
                                        "Unknown customer"
                                      }
                                    </p>

                                    {conversation.status ===
                                      "new" && (
                                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                                    )}

                                  </div>

                                  <p className="mt-0.5 truncate text-[10px] capitalize text-gray-500">
                                    {
                                      conversation.queue
                                    }
                                    {" · "}
                                    {
                                      conversation.channel
                                    }
                                  </p>

                                </div>

                                <span
                                  className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${getPriorityClasses(
                                    priority
                                  )}`}
                                >
                                  {
                                    priority
                                  } priority
                                </span>

                              </div>

                              <p className="mt-2 line-clamp-1 text-[11px] leading-4 text-gray-600">
                                {
                                  lastMessage?.content ||
                                  "No messages yet"
                                }
                              </p>

                              <div className="mt-2 flex items-center justify-between text-[9px] text-gray-400">

                                <span className="flex items-center gap-1">

                                  <Clock3
                                    size={10}
                                  />

                                  {formatWaitingTime(
                                    conversation.created_at
                                  )}

                                </span>

                                <span>
                                  {
                                    priorityScore
                                  }
                                  /100
                                </span>

                              </div>

                            </button>
                          );
                        }
                      )}

                    </div>
                  )}

                </div>

              </section>

              {/* ================================================= */}
              {/* CONVERSATION PANEL                                */}
              {/* ================================================= */}

              <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">

                {!selectedConversation ? (
                  <div className="flex h-full items-center justify-center px-6 text-center">

                    <div>

                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                        <MessageSquare
                          size={24}
                        />
                      </div>

                      <h2 className="mt-4 text-base font-semibold">
                        Select a conversation
                      </h2>

                      <p className="mt-1 max-w-sm text-sm leading-6 text-gray-500">
                        Choose a customer conversation from the inbox to view the history and AI-assisted response.
                      </p>

                    </div>

                  </div>
                ) : (
                  <>
                    {/* ========================================= */}
                    {/* CONVERSATION HEADER                         */}
                    {/* ========================================= */}

                    <div className="border-b border-gray-100 px-5 py-3.5">

                      <div className="flex items-center justify-between gap-4">

                        <div className="flex min-w-0 items-center gap-3">

                          <button
                            onClick={() =>
                              setSelectedConversationId(
                                null
                              )
                            }
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 lg:hidden"
                          >
                            <ChevronLeft
                              size={18}
                            />
                          </button>

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                            <User
                              size={18}
                            />
                          </div>

                          <div className="min-w-0">

                            <h2 className="truncate text-sm font-semibold">
                              {
                                selectedCustomer?.full_name
                              }
                            </h2>

                            <p className="truncate text-[11px] text-gray-500">
                              {
                                selectedCustomer?.email ||
                                "No email"
                              }
                            </p>

                          </div>

                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">

                          {(() => {

                            const score =
                              getPriorityScore(
                                selectedConversation.urgency_score,
                                selectedConversation.sentiment,
                                selectedConversation.created_at
                              );

                            const priority =
                              getPriorityLevel(
                                score
                              );

                            return (
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase ${getPriorityClasses(
                                  priority
                                )}`}
                              >
                                {
                                  priority
                                } priority{" "}
                                ·{" "}
                                {
                                  score
                                }
                                /100
                              </span>
                            );

                          })()}

                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[9px] font-medium capitalize text-gray-600">
                            {
                              selectedConversation.queue
                            }
                          </span>

                        </div>

                      </div>
                    </div>

                    {/* ========================================= */}
                    {/* BODY                                        */}
                    {/* ========================================= */}

                    <div className="flex-1 overflow-y-auto">

                      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_265px]">

                        {/* ===================================== */}
                        {/* MAIN                                    */}
                        {/* ===================================== */}

                        <div className="p-5">

                          {/* CUSTOMER / ORDER */}

                          <div className="mb-5 grid gap-3 sm:grid-cols-2">

                            <InfoCard
                              icon={
                                <User size={15} />
                              }
                              label="Customer"
                              value={
                                selectedCustomer?.full_name ||
                                "Unknown"
                              }
                              secondary={
                                selectedCustomer?.phone ||
                                selectedCustomer?.email ||
                                undefined
                              }
                            />

                            <InfoCard
                              icon={
                                <Package size={15} />
                              }
                              label="Order"
                              value={
                                selectedOrder?.order_number ||
                                selectedConversation.order_number ||
                                "No order linked"
                              }
                              secondary={
                                selectedOrder
                                  ? `${selectedOrder.status} · ${selectedOrder.total_amount ?? "-"} ${selectedOrder.currency}`
                                  : undefined
                              }
                            />

                          </div>

                          {/* ================================= */}
                          {/* QUALIFICATION                       */}
                          {/* ================================= */}

                          <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4">

                            <div className="mb-3 flex items-center justify-between">

                              <div>

                                <h3 className="text-sm font-semibold text-gray-900">
                                  Conversation analysis
                                </h3>

                                <p className="mt-0.5 text-[11px] text-gray-500">
                                  Qualification generated from the customer message
                                </p>

                              </div>

                              <Sparkles
                                size={17}
                                className="text-gray-400"
                              />

                            </div>

                            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-[1.15fr_1.15fr_1fr_1.25fr]">

                              {/* URGENCY */}

                              {(() => {

                                const urgencyScore =
                                  selectedConversation.urgency_score ??
                                  0;

                                const urgencyLevel =
                                  getUrgencyLevel(
                                    urgencyScore
                                  );

                                return (
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
                                        {
                                          urgencyScore
                                        }
                                      </span>

                                      <span className="text-[10px] opacity-60">
                                        /100
                                      </span>

                                    </div>

                                    <p className="mt-0.5 text-[11px] font-semibold capitalize">
                                      {
                                        urgencyLevel
                                      }
                                    </p>

                                  </div>
                                );

                              })()}

                              {/* PRIORITY */}

                              {(() => {

                                const priorityScore =
                                  getPriorityScore(
                                    selectedConversation.urgency_score,
                                    selectedConversation.sentiment,
                                    selectedConversation.created_at
                                  );

                                const priority =
                                  getPriorityLevel(
                                    priorityScore
                                  );

                                return (
                                  <div
                                    className={`min-h-[128px] rounded-xl border p-4 ${getPriorityClasses(
                                      priority
                                    )}`}
                                  >

                                    <div className="flex items-center justify-between">

                                      <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
                                        Priority
                                      </span>

                                      <AlertTriangle
                                        size={14}
                                      />

                                    </div>

                                    <div className="mt-1.5 flex items-baseline gap-1">

                                      <span className="text-xl font-bold">
                                        {
                                          priorityScore
                                        }
                                      </span>

                                      <span className="text-[10px] opacity-60">
                                        /100
                                      </span>

                                    </div>

                                    <p className="mt-0.5 text-[11px] font-semibold capitalize">
                                      {
                                        priority
                                      } priority
                                    </p>

                                  </div>
                                );

                              })()}

                              {/* WAITING */}

                              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">

                                <div className="flex items-center justify-between">

                                  <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                                    Waiting
                                  </span>

                                  <Clock3
                                    size={14}
                                    className="text-gray-400"
                                  />

                                </div>

                                <p className="mt-1.5 text-xl font-bold text-gray-900">
                                  {formatWaitingTime(
                                    selectedConversation.created_at
                                  )}
                                </p>

                                <p className="mt-0.5 text-[10px] text-gray-500">
                                  Since started
                                </p>

                              </div>

                              {/* INTENT */}

                              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">

                                <div className="flex items-center justify-between">

                                  <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                                    Intent
                                  </span>

                                  <MessageSquare
                                    size={14}
                                    className="text-gray-400"
                                  />

                                </div>

                                <p className="mt-1.5 line-clamp-2 text-sm font-semibold capitalize leading-5 text-gray-900">
                                  {
                                    selectedConversation.intent ||
                                    "Unknown"
                                  }
                                </p>

                                <p className="mt-1 text-[10px] text-gray-500">
                                  Language: {" "}
                                  {
                                    selectedConversation.language ||
                                    "Unknown language"
                                  }
                                </p>

                              </div>

                            </div>
                          </div>

                          {/* ================================= */}
                          {/* MESSAGE HISTORY                    */}
                          {/* ================================= */}

                          <div>

                            <div className="mb-2.5 flex items-center justify-between">

                              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                Conversation
                              </h3>

                              <span className="text-[9px] text-gray-400">
                                {
                                  selectedMessages.length
                                }{" "}
                                messages
                              </span>

                            </div>

                            <div className="space-y-2.5">

                              {selectedMessages.map(
                                (
                                  message
                                ) => (
                                  <MessageBubble
                                    key={
                                      message.id
                                    }
                                    message={
                                      message
                                    }
                                  />
                                )
                              )}

                            </div>

                          </div>

                          {/* ================================= */}
                          {/* AI RESPONSE                        */}
                          {/* ================================= */}

                          <div className="mt-7">

                            <div className="mb-3 flex items-center justify-between">

                              <div>

                                <div className="flex items-center gap-2">

                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-white">
                                    <Sparkles
                                      size={14}
                                    />
                                  </div>

                                  <h3 className="text-sm font-semibold text-gray-900">
                                    AI-assisted response
                                  </h3>

                                </div>

                                <p className="mt-1.5 text-[11px] text-gray-500">
                                  Review the suggested response before sending it.
                                </p>

                              </div>

                              {selectedDraft && (
                                <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[9px] font-semibold text-gray-600">
                                  Draft v
                                  {
                                    selectedDraft.version_number
                                  }
                                </span>
                              )}

                            </div>

                            {selectedDraft ? (

                              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

                                {/* AI HEADER */}

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

                                {/* AI MESSAGE */}

                                <div className="p-4">

                                  <textarea
                                    value={
                                      editingDraft
                                        ? editingDraftContent
                                        : selectedDraft.content
                                    }
                                    disabled={
                                      !editingDraft
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      setEditingDraftContent(
                                        event
                                          .target
                                          .value
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

                                {/* ACTIONS */}

                                <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

                                  <p className="text-[10px] text-gray-400">
                                    AI-generated content must be reviewed by an agent.
                                  </p>

                                  <div className="flex flex-wrap items-center gap-2">

                                    {/* EDIT / DONE */}

                                    {editingDraft ? (
                                      <button
                                        onClick={
                                          saveDraftEdit
                                        }
                                        disabled={
                                          savingDraft
                                        }
                                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                                      >
                                        <Check
                                          size={
                                            14
                                          }
                                        />

                                        {savingDraft
                                          ? "Saving..."
                                          : "Done"}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={
                                          startEditingDraft
                                        }
                                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                                      >
                                        <Pencil
                                          size={
                                            14
                                          }
                                        />
                                        Edit
                                      </button>
                                    )}

                                    {/* REJECT */}

                                    <button
                                      onClick={
                                        rejectDraft
                                      }
                                      disabled={
                                        savingDraft ||
                                        sending
                                      }
                                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                      <RotateCcw
                                        size={
                                          14
                                        }
                                      />
                                      Reject
                                    </button>

                                    {/* SEND */}

                                    <button
                                      onClick={
                                        sendResponse
                                      }
                                      disabled={
                                        sending ||
                                        savingDraft ||
                                        editingDraft ||
                                        !selectedDraft
                                      }
                                      className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <Send
                                        size={
                                          14
                                        }
                                      />

                                      {sending
                                        ? "Sending..."
                                        : "Send"}
                                    </button>

                                  </div>

                                </div>

                              </div>

                            ) : (

                              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-7 text-center">

                                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm">
                                  <FileText
                                    size={19}
                                  />
                                </div>

                                <p className="mt-3 text-sm font-medium text-gray-600">
                                  No AI draft available
                                </p>

                                <p className="mt-1 text-[11px] text-gray-400">
                                  The AI response may still be processing or was rejected.
                                </p>

                              </div>

                            )}

                          </div>

                        </div>

                        {/* ===================================== */}
                        {/* RIGHT INFO PANEL                       */}
                        {/* ===================================== */}

                        <aside className="border-t border-gray-100 bg-gray-50/50 p-4 xl:border-l xl:border-t-0">

                          {/* WAITING */}

                          <div>

                            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                              Waiting time
                            </p>

                            <p className="mt-1.5 text-xl font-semibold">
                              {formatWaitingTime(
                                selectedConversation.created_at
                              )}
                            </p>

                            <p className="mt-0.5 text-[10px] text-gray-400">
                              Since conversation started
                            </p>

                          </div>

                          {/* SOURCES */}

                          <div className="mt-6">

                            <div className="flex items-center justify-between">

                              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                                AI sources
                              </p>

                              {selectedSources.length >
                                0 && (
                                <span className="text-[9px] text-gray-400">
                                  {
                                    selectedSources.length
                                  }{" "}
                                  retrieved
                                </span>
                              )}

                            </div>

                            {selectedSources.length ===
                            0 ? (

                              <p className="mt-2 text-[10px] text-gray-500">
                                No sources available.
                              </p>

                            ) : (

                              <div className="mt-2 space-y-1.5">

                                {selectedSources.map(
                                  (
                                    source
                                  ) => (
                                    <button
                                      key={
                                        source.id
                                      }
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
                                          #
                                          {
                                            source.rank
                                          }
                                        </div>

                                        <div className="min-w-0 flex-1">

                                          <div className="flex items-start justify-between gap-2">

                                            <p className="line-clamp-2 text-[11px] font-semibold text-gray-800">
                                              {
                                                source.title
                                              }
                                            </p>

                                            <span className="shrink-0 text-[9px] font-semibold text-gray-500">
                                              {formatSimilarity(
                                                source.similarity_score
                                              )}
                                            </span>

                                          </div>

                                          <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-gray-500">
                                            {
                                              source.content
                                            }
                                          </p>

                                          <div className="mt-1.5 flex items-center gap-1 text-[8px] font-medium text-gray-400 group-hover:text-gray-600">
                                            <ExternalLink
                                              size={
                                                9
                                              }
                                            />
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

                            {selectedOrder ? (

                              <div className="mt-2 space-y-2 text-[10px]">

                                <DetailRow
                                  label="Status"
                                  value={
                                    selectedOrder.status
                                  }
                                />

                                <DetailRow
                                  label="Order"
                                  value={
                                    selectedOrder.order_number
                                  }
                                />

                                <DetailRow
                                  label="Tracking"
                                  value={
                                    selectedOrder.tracking_number ||
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
                              {
                                selectedConversation.sentiment ||
                                "Unknown"
                              }
                            </p>

                          </div>

                          {/* AUDIT SUMMARY */}

                          <div className="mt-6 border-t border-gray-200 pt-5">

                            <div className="flex items-center justify-between">

                              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                                Activity
                              </p>

                              <span className="text-[9px] text-gray-400">
                                {
                                  selectedAuditLogs.length
                                }
                              </span>

                            </div>

                            {selectedAuditLogs.length >
                            0 ? (

                              <div className="mt-2 space-y-2">

                                {selectedAuditLogs
                                  .slice(
                                    0,
                                    4
                                  )
                                  .map(
                                    (
                                      log
                                    ) => (
                                      <div
                                        key={
                                          log.id
                                        }
                                        className="rounded-lg border border-gray-200 bg-white p-2"
                                      >

                                        <p className="text-[9px] font-medium text-gray-700">
                                          {formatAuditAction(
                                            log.action
                                          )}
                                        </p>

                                        <p className="mt-0.5 text-[8px] text-gray-400">
                                          {new Date(
                                            log.created_at
                                          ).toLocaleString()}
                                        </p>

                                      </div>
                                    )
                                  )}

                              </div>

                            ) : (

                              <p className="mt-2 text-[10px] text-gray-500">
                                No activity recorded yet.
                              </p>

                            )}

                          </div>

                        </aside>

                      </div>

                    </div>

                    {/* ========================================= */}
                    {/* BOTTOM ACTION BAR                           */}
                    {/* ========================================= */}

                    <div className="border-t border-gray-200 bg-white px-5 py-3">

                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">

                        <p className="text-[10px] text-gray-400">
                          Review the AI suggestion before sending.
                        </p>

                        <div className="flex items-center gap-2">

                          {/* ESCALATE */}

                          <button
                            onClick={
                              escalateConversation
                            }
                            disabled={
                              escalating ||
                              sending
                            }
                            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <AlertTriangle
                              size={14}
                            />

                            {escalating
                              ? "Escalating..."
                              : "Escalate"}
                          </button>

                          {/* CLOSE */}

                          <button
                            onClick={() => {
                              setSelectedConversationId(
                                null
                              );
                              setSelectedSource(
                                null
                              );
                              setEditingDraft(
                                false
                              );
                              setEditingDraftContent(
                                ""
                              );
                            }}
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                          >
                            <X
                              size={14}
                            />
                            Close
                          </button>

                        </div>

                      </div>

                    </div>

                  </>
                )}

              </section>

            </div>

          </div>

        </main>

      </div>

      {/* =================================================== */}
      {/* SOURCE DETAIL MODAL                                  */}
      {/* =================================================== */}

      {selectedSource && (
        <SourceModal
          source={selectedSource}
          onClose={() =>
            setSelectedSource(
              null
            )
          }
        />
      )}

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

        {/* HEADER */}

        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">

          <div className="flex min-w-0 items-start gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <FileText
                size={17}
              />
            </div>

            <div className="min-w-0">

              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                Retrieved FAQ source #{source.rank}
              </p>

              <h2 className="mt-1 text-base font-semibold leading-5 text-gray-900">
                {
                  source.title
                }
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

        {/* CONTENT */}

        <div className="max-h-[calc(85vh-80px)] overflow-y-auto p-5">

          {/* METRICS */}

          <div className="grid gap-3 sm:grid-cols-2">

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">

              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                Rank
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900">
                #{source.rank}
              </p>

            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">

              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                Similarity
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900">
                {formatSimilarity(
                  source.similarity_score
                )}
              </p>

            </div>

          </div>

          {/* ARTICLE TITLE */}

          <div className="mt-5">

            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
              FAQ article
            </p>

            <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4">

              <p className="text-sm font-semibold leading-6 text-gray-900">
                {
                  source.title
                }
              </p>

            </div>

          </div>

          {/* CHUNK CONTENT */}

          <div className="mt-5">

            <div className="flex items-center justify-between">

              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                Retrieved chunk
              </p>

              <span className="text-[9px] text-gray-400">
                FAQ chunk content
              </span>

            </div>

            <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-4">

              <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                {
                  source.content
                }
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

/* ========================================================= */
/* AUDIT ACTION DISPLAY                                        */
/* ========================================================= */

function formatAuditAction(
  action: string
) {
  switch (action) {
    case "READ":
      return "Conversation viewed";

    case "MODIFIED":
      return "AI draft modified";

    case "REJECTED":
      return "AI draft rejected";

    case "SENT":
      return "Response sent";

    case "ESCALATED":
      return "Conversation escalated";

    default:
      return action;
  }
}

/* ========================================================= */
/* MESSAGE BUBBLE                                              */
/* ========================================================= */

function MessageBubble({
  message,
}: {
  message: Message;
}) {
  const isCustomer =
    message.sender_type ===
    "customer";

  const isAI =
    message.sender_type ===
    "ai";

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
          {
            message.content
          }
        </p>

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

/* ========================================================= */
/* SIDEBAR ITEM                                                */
/* ========================================================= */

function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
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
          active
            ? "text-blue-600"
            : "text-gray-500"
        }
      >
        {icon}
      </span>

      <span>
        {label}
      </span>

    </button>
  );
}

/* ========================================================= */
/* MOBILE NAV ITEM                                             */
/* ========================================================= */

function MobileNavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
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

      <span>
        {label}
      </span>
    </button>
  );
}