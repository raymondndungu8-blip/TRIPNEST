"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, MessageCircle, Send, Heart, Phone } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireRole } from "@/components/auth/require-role";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { onSnapshot, query, limitToLast } from "firebase/firestore";
import { db } from "@/lib/firestore";
import { collections, where, orderBy } from "@/lib/db";
import {
  fetchDriverConversations,
  fetchMessages,
  fetchOlderMessages,
  MESSAGE_PAGE_SIZE,
  sendMessage,
  markConversationRead,
  type DriverConversationPreview,
  type Message,
} from "@/lib/messages";
import { UnreadBadge } from "@/components/ui/unread-badge";
import { cn, friendlyErrorMessage } from "@/lib/utils";
import { notifyUser } from "@/lib/notify";
import type { Driver } from "@/lib/types";

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChatView({
  driverId,
  clientId,
  clientName,
  clientSubtitle,
  onBack,
}: {
  driverId: string;
  clientId: string;
  clientName: string;
  clientSubtitle: string;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [olderLoading, setOlderLoading] = useState(false);
  const [noMoreOlder, setNoMoreOlder] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const q = query(
      collections.messages(),
      where("clientId", "==", clientId),
      where("driverId", "==", driverId),
      orderBy("createdAt", "asc"),
      limitToLast(MESSAGE_PAGE_SIZE)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Message[];
        setMessages((prev) => {
          // The live query re-fires on every message change and may now
          // include rows we already loaded via "Load earlier" — dedupe.
          const ids = new Set(msgs.map((m) => m.id));
          return [...prev.filter((m) => !ids.has(m.id)), ...msgs];
        });
        setLoading(false);
        markConversationRead(clientId, driverId, "driver");
        setTimeout(scrollToBottom, 100);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsub();
  }, [clientId, driverId, scrollToBottom]);

  async function loadEarlier() {
    if (olderLoading || noMoreOlder) return;
    const oldest = messages[0];
    if (!oldest) return;
    setOlderLoading(true);
    try {
      const older = await fetchOlderMessages(clientId, driverId, oldest.createdAt);
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const fresh = older.filter((m) => !ids.has(m.id));
        return [...fresh, ...prev];
      });
      if (older.length < MESSAGE_PAGE_SIZE) setNoMoreOlder(true);
    } catch {
      toast("Could not load earlier messages", "error");
    } finally {
      setOlderLoading(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (trimmed.length > 2000) {
      toast("Message is too long (max 2000 characters)", "warning");
      return;
    }
    setSending(true);
    try {
      await sendMessage(clientId, driverId, "driver", trimmed);
      setText("");
      notifyUser({
        targetUserId: clientId,
        title: "New message 📩",
        body: trimmed,
        url: "/client/inbox",
      }).catch(() => {});
    } catch (err) {
      toast(friendlyErrorMessage(err, "Could not send message"), "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-80px)] flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <button
          onClick={onBack}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar name={clientName} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{clientName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {clientSubtitle}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {loading ? (
          <div className="space-y-3 px-1">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-2/3" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No messages yet. Say hi and coordinate the pickup!
            </p>
          </div>
        ) : (
          <div className="space-y-2 px-1">
            {!noMoreOlder && (
              <div className="flex justify-center">
                <button
                  onClick={loadEarlier}
                  disabled={olderLoading}
                  className="rounded-full border border-border bg-surface-2/60 px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
                >
                  {olderLoading ? "Loading…" : "Load earlier messages"}
                </button>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.senderType === "driver";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      isMe
                        ? "bg-accent text-background rounded-br-md"
                        : "bg-surface-2 text-foreground rounded-bl-md"
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isMe ? "text-background/60" : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-border pt-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          maxLength={2000}
          className="input-transparent flex-1 rounded-2xl border border-border bg-surface-2/60 px-4 py-3 text-[15px] focus:outline-none focus:ring-1 focus:ring-accent/40"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim() || sending}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function InboxContent({ driver }: { driver: Driver }) {
  const [conversations, setConversations] = useState<
    DriverConversationPreview[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] =
    useState<DriverConversationPreview | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const convos = await fetchDriverConversations(driver.id);
        if (active) {
          setConversations(convos);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [driver.id]);

  if (activeChat) {
    return (
      <AppShell>
        <ChatView
          driverId={driver.id}
          clientId={activeChat.client_id}
          clientName={activeChat.client_name}
          clientSubtitle={
            activeChat.client_phone
              ? activeChat.client_phone
              : activeChat.is_favorite
                ? "Favorite rider"
                : "Rider"
          }
          onBack={() => setActiveChat(null)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            Inbox
          </h1>
          <p className="text-sm text-muted-foreground">
            Chat with your riders to coordinate pickups
          </p>
        </div>
        <UnreadBadge role="driver" userId={driver.id} />
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[72px] w-full" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            description="Once you accept a ride or a rider favorites you, you can chat with them here."
          />
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {conversations.map((convo) => (
                <motion.button
                  key={convo.client_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setActiveChat(convo)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-2/40 p-3.5 text-left transition-all hover:bg-surface-2"
                >
                  <Avatar name={convo.client_name} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate font-semibold text-foreground">
                          {convo.client_name}
                        </p>
                        {convo.unread && (
                          <span className="ml-1 inline-block h-2 w-2 shrink-0 rounded-full bg-accent" />
                        )}
                        {convo.is_favorite && (
                          <Heart className="h-3.5 w-3.5 shrink-0 fill-destructive text-destructive" />
                        )}
                      </div>
                      {convo.last_message_at && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(convo.last_message_at)}
                        </span>
                      )}
                    </div>
                    {convo.client_phone && (
                      <p className="inline-flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {convo.client_phone}
                      </p>
                    )}
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {convo.last_message || (
                        <span className="italic">Tap to start chatting</span>
                      )}
                    </p>
                  </div>
                  <MessageCircle
                    className={cn(
                      "h-5 w-5 shrink-0",
                      convo.last_message
                        ? "text-accent"
                        : "text-muted-foreground/40"
                    )}
                  />
                </motion.button>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </AppShell>
  );
}

export default function DriverInboxPage() {
  const { driver } = useSession();
  return (
    <RequireRole role="driver">
      {driver && <InboxContent driver={driver} />}
    </RequireRole>
  );
}
