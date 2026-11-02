# Customer Support Agent

Customer Support Agent is a role-based support workspace for managing conversations, AI-assisted replies, escalations, and operational knowledge. The application is built with Next.js and Supabase, while the automation layer is maintained separately in n8n.

The product is organized around three workspaces:

- **Client:** view profile and orders, then open and continue support conversations.
- **Agent:** triage the inbox, review AI drafts, edit or send responses, reject drafts, and escalate complex cases.
- **Supervisor:** monitor KPIs, manage the knowledge base, review escalations, and resolve supervisor-owned conversations.

## Core Capabilities

- Supabase Auth with server-side role and user-identity checks.
- Conversation, message, ticket, order, FAQ, draft, and audit-log data stored in Supabase.
- Real-time updates for conversations, messages, drafts, tickets, customers, and knowledge-base records.
- AI draft review with human acceptance, editing, rejection, and escalation controls.
- Priority visibility based on urgency, sentiment, queue, and waiting time.
- Supervisor escalation center and operational dashboard.
- FAQ and chunk management for retrieval-augmented response generation.
- Resend test endpoint for validating server-side email delivery.

## Technology

| Area | Technology |
| --- | --- |
| Web application | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind CSS v4, lucide-react |
| Authentication and database | Supabase Auth, PostgreSQL, Supabase SSR |
| Realtime | Supabase Realtime / Postgres changes |
| Email | Resend |
| Automation | n8n workflows maintained outside this repository |

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm
- A Supabase project with the required schema and Row Level Security policies
- Optional: a Resend API key for the email test route
- Optional: the separately maintained n8n workflows for AI qualification, drafting, and escalation

### Install and run

```bash
cd customer-support-agent
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000` after the development server starts.

### Environment variables

Set the following values in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anonymous key. |
| `RESEND_API_KEY` | Server-side Resend credential used by the email test route. |

Do not commit `.env.local` or any secret credentials.

### Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Start the production server. |
| `npm run lint` | Run ESLint. |

## Application Structure

```text
customer-support-agent/
├── app/
│   ├── login/                         Authentication UI
│   ├── signup/                        Account creation
│   ├── client/[userId]/               Customer workspace
│   │   ├── orders/                    Order tracking
│   │   └── support/                   Support conversations
│   ├── agent/[userId]/                Agent workspace
│   │   ├── conversations/             Inbox and draft review
│   │   ├── faq/                       FAQ search
│   │   └── profile/                   Agent profile
│   ├── supervisor/[userId]/           Supervisor workspace
│   │   ├── dashboard/                 Operational dashboard
│   │   ├── escalations/               Escalation center
│   │   └── knowledge-base/            FAQ and chunk management
│   └── api/email/test/                Resend test endpoint
├── components/                        Shared UI components
├── hooks/                             Global realtime utilities
├── lib/auth/                          Role authorization helpers
├── lib/supabase/                      Browser, server, and realtime clients
├── public/                            Static assets
├── .env.example                       Environment variable template
└── package.json                        Scripts and dependencies
```

Route layouts use `requireRole` to verify both the authenticated user ID and the expected profile role. Unauthorized requests are redirected to the login or unauthorized page.

## Supabase Data Model

The application expects the following logical entities:

| Entity | Responsibility |
| --- | --- |
| `profiles` | Authenticated user details, role, and customer relationship. |
| `customers` | Customer records associated with conversations and orders. |
| `conversations` | Threads, channels, queue, status, sentiment, intent, and urgency score. |
| `messages` | Customer, agent, and supervisor messages. |
| `message_versions` | AI, reflection, agent, and supervisor draft versions. |
| `tickets` | Escalation records and resolution status. |
| `orders` | Customer order context. |
| `faq_articles`, `faq_chunks` | Knowledge-base source material for retrieval. |
| `ai_response_sources` | FAQ chunks used by an AI response. |
| `conversation_audit_logs` | Traceability for review, edits, rejection, sending, and escalation. |

Enable the relevant tables in the Supabase Realtime publication when testing live updates. Realtime must continue to respect Row Level Security policies.

## n8n Automation Workflows

n8n is a separate integration layer. Workflow exports and credentials are not included in this repository. The workflows exchange conversation data with Supabase and return analysis, drafts, notifications, or corrected drafts for the application to display.

| Workflow | Trigger | Responsibility | Application result |
| --- | --- | --- | --- |
| **W1 - Qualification** | New customer message | Detect language, intent, sentiment, impact, time sensitivity, blocking, and persistence. Calculate an urgency score. | Conversation priority, queue, and qualification fields are updated. |
| **W2 - Assisted Response** | New or qualifying conversation | Retrieve relevant FAQ chunks, use RAG/LLM generation, and create an AI response draft. | A draft is stored as a `message_versions` record with AI authorship and can be reviewed by an agent. |
| **W3 - Escalation** | Agent escalation or high-risk case | Create or update an escalation, notify the supervisor channel, and coordinate additional handling. | A ticket appears in the supervisor escalation center. |
| **Reflection - AI Correction** | AI draft rejection or required correction | Re-evaluate the conversation and produce an improved response draft. | A corrected `message_versions` record is returned for another human review. |

The application remains human-in-the-loop: AI output is presented as a draft, and an agent or supervisor must review it before sending.

## End-to-End Flow

```text
Customer message
   |
   v
W1 - Qualification
   |
   v
Urgency and conversation classification
   |
   +----------------------+
   |                      |
   v                      v
W2 - Assisted Response   W3 - Escalation
   |                      |
   v                      v
FAQ retrieval and AI      Ticket and supervisor
draft generation          notification
   |                      |
   +----------+-----------+
           |
           v
       Human review
       /          \
   Accept        Reject or escalate
      |                |
      v                v
    Send       Reflection - AI Correction
              |
              v
          Corrected draft
              |
              v
           Human review
```

In the normal path, the customer message is qualified, an assisted response is drafted, and an agent reviews and sends the final response. High-urgency or complex cases are escalated to a ticket for supervisor handling. Rejected AI drafts can enter the Reflection workflow before returning to human review.

## License

Private and proprietary.
