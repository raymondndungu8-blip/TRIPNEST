"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  MessageCircle,
  Send,
  Car,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireRole } from "@/components/auth/require-role";
import { useSession } from "@/components/providers/session-provider";
import { useToast } from "@/components/providers/toast-provider";
import { supabase } from "@/lib/supabase";
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  type ConversationPreview,
  type Message,
} from "@/lib/messages";
import { friendlyErrorMessage } from "@/lib/utils";

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
  clientId,
  driverId,
  driverName,
  driverVehicle,
  onBack,
}: {
  clientId: string;
  driverId: string;
  driverName: string;
  driverVehicle: string;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const msgs = await fetchMessages(clientId, driverId);
        if (active) {
          setMessages(msgs);
          setLoading(false);
          setTimeout(scrollToBottom, 100);
        }
      } catch {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [clientId, driverId, scrollToBottom]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${clientId}-${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.driver_id === driverId) {
            setMessages((prev) => [...prev, msg]);
            setTimeout(scrollToBottom, 50);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, driverId, scrollToBottom]);

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
      await sendMessage(clientId, driverId, "client", trimmed);
      setText("");
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
        <Avatar name={driverName} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{driverName}</p>
          <p className="truncate text-xs text-muted-foreground">{driverVehicle}</p>
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
              No messages yet. Say hi to coordinate your pickup!
            </p>
          </div>
        ) : (
          <div className="space-y-2 px-1">
            {messages.map((msg) => {
              const isMe = msg.sender_type === "client";
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
                      {formatTime(msg.created_at)}
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
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border pt-3">
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

function InboxContent() {
  const { client } = useSession();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<ConversationPreview | null>(null);

  useEffect(() => {
    if (!client) return;
    let active = true;
    async function load() {
      try {
        const convos = await fetchConversations(client!.id);
        if (active) {
          setConversations(convos);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [client]);

  if (!client) return null;

  if (activeChat) {
    return (
      <AppShell>
        <ChatView
          clientId={client.id}
          driverId={activeChat.driver_id}
          driverName={activeChat.driver_name}
          driverVehicle={`${activeChat.driver_vehicle} · ${activeChat.driver_plate}`}
          onBack={() => setActiveChat(null)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-1">
        <h1 className="font-display text-2xl font-extrabold text-foreground">
          Inbox
        </h1>
        <p className="text-sm text-muted-foreground">
          Chat with your drivers to coordinate pickups
        </p>
      </div>

      {/* Conversations list */}
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
            description="Once you book a ride or add a favorite driver, you can chat with them here."
          />
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {conversations.map((convo) => (
                <motion.button
                  key={convo.driver_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setActiveChat(convo)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-2/40 p-3.5 text-left transition-all hover:bg-surface-2"
                >
                  <Avatar name={convo.driver_name} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-foreground">
                        {convo.driver_name}
                      </p>
                      {convo.last_message_at && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(convo.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {convo.driver_vehicle} · {convo.driver_plate}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {convo.last_message || (
                        <span className="italic">Tap to start chatting</span>
                      )}
                    </p>
                  </div>
                  <Car className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                </motion.button>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </AppShell>
  );
}

export default function InboxPage() {
  return (
    <RequireRole role="client">
      <InboxContent />
    </RequireRole>
  );
}
