"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/hooks/use-toast";
import ChatInvoiceCard from "@/components/agent/ChatInvoiceCard";
import ChatReportCard from "@/components/agent/ChatReportCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowUpRight,
  Bell,
  Bot,
  Bookmark,
  BookmarkCheck,
  CircleHelp,
  ChevronRight,
  HelpCircle,
  LayoutGrid,
  Loader2,
  LogOut,
  Menu,
  MessageSquareText,
  Mic,
  MicOff,
  Package,
  Palette,
  Receipt,
  Send,
  Sparkles,
  SquarePlus,
  Trash2,
  User as UserIcon,
  Users,
  Wand2,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

type MessageContent = {
  text?: string;
  toolRequest?: {
    name: string;
    input: any;
  };
  toolResponse?: {
    name: string;
    output: any;
  };
};

type Message = {
  role: "user" | "model" | "tool" | "system";
  content: MessageContent[];
  invoiceCard?: {
    invoiceId: string;
    invoiceNumber: string;
  } | null;
  reportCard?: {
    title: string;
    periodLabel: string;
    totalRevenue: number;
    totalInvoices: number;
    averageInvoiceValue: number;
    paidRevenue: number;
    totalPaid: number;
    totalUnpaid: number;
    statusDistribution: Array<{ name: string; value: number; color: string }>;
    monthlyTrend: Array<{ name: string; sales: number; count: number }>;
    topCustomers: Array<{ name: string; sales: number }>;
    topProducts: Array<{ name: string; qty: number; revenue: number }>;
    highlights: string[];
    exportRows: Array<Record<string, string | number>>;
  } | null;
};

type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  bookmarked?: boolean;
};

const quickPrompts = [
  { label: "Create Invoice", text: "Create bill for kapil with recharge 2 qty 199 and domain 2 qty 399" },
  { label: "Show Sales", text: "What are the sales this month?" },
  { label: "Update Stock", text: "Update stock for prepaid recharge to 100" },
  { label: "Add Customer", text: "Add customer John Doe phone 9876543210" },
];

const navItems = [
  { icon: LayoutGrid, label: "Dashboard", active: false },
  { icon: MessageSquareText, label: "Recent Chats", active: true },
  { icon: BookmarkCheck, label: "Bookmarks", active: false },
  { icon: Palette, label: "Customization", active: false },
];

const buildChatTitle = (message: string) => {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New Chat";
  const words = cleaned.split(" ").slice(0, 5).join(" ");
  return words.length > 28 ? `${words.slice(0, 28).trim()}...` : words;
};

const STORAGE_PREFIX = "bizroom-agent-chats";

export default function AgentPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [recentChatsOpen, setRecentChatsOpen] = useState(true);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const storageKey = useMemo(() => {
    return user ? `${STORAGE_PREFIX}:${user.uid}` : null;
  }, [user]);

  const activeSession = useMemo(() => {
    if (!activeSessionId) return null;
    return sessions.find((session) => session.id === activeSessionId) || null;
  }, [activeSessionId, sessions]);

  const activeMessages = activeSession?.messages || [];

  const bookmarkedSessions = useMemo(() => {
    return sessions.filter((s) => s.bookmarked);
  }, [sessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeMessages, isLoading]);

  useEffect(() => {
    if (!storageKey) return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatSession[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed
            .filter((session) => session && Array.isArray(session.messages))
            .map((session) => ({
              ...session,
              title: session.title || "New Chat",
              bookmarked: session.bookmarked || false,
            }))
            .sort((a, b) => b.updatedAt - a.updatedAt);

          setSessions(normalized);
          setActiveSessionId(normalized[0]?.id || null);
          setHydrated(true);
          return;
        }
      }
    } catch (error) {
      console.warn("Failed to load agent chats from localStorage:", error);
    }

    const freshId = crypto.randomUUID();
    setSessions([
      {
        id: freshId,
        title: "New Chat",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        bookmarked: false,
      },
    ]);
    setActiveSessionId(freshId);
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(sessions));
    } catch (error) {
      console.warn("Failed to save agent chats to localStorage:", error);
    }
  }, [hydrated, sessions, storageKey]);

  const updateSession = (sessionId: string, updater: (session: ChatSession) => ChatSession) => {
    setSessions((prev) =>
      prev
        .map((session) => (session.id === sessionId ? updater(session) : session))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  };

  const createNewChat = () => {
    const nextId = crypto.randomUUID();
    setSessions((prev) =>
      [
        {
          id: nextId,
          title: "New Chat",
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          bookmarked: false,
        },
        ...prev,
      ].sort((a, b) => b.updatedAt - a.updatedAt)
    );
    setActiveSessionId(nextId);
    setInput("");
    setMobileSidebarOpen(false);
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading || !user || !activeSessionId) return;

    const userMessage: Message = {
      role: "user",
      content: [{ text }],
    };

    updateSession(activeSessionId, (session) => {
      const nextMessages = [...session.messages, userMessage];
      return {
        ...session,
        title: session.title === "New Chat" ? buildChatTitle(text) : session.title,
        messages: nextMessages,
        updatedAt: Date.now(),
      };
    });
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...activeMessages, userMessage],
          userId: user.uid,
        }),
      });

      const data = await response.json();

      if (data.message) {
        const modelMessage = data.message as Message;
        updateSession(activeSessionId, (session) => ({
          ...session,
          messages: [
            ...session.messages,
            {
              ...modelMessage,
              invoiceCard: data.invoiceCard ?? modelMessage.invoiceCard ?? null,
              reportCard: data.reportCard ?? modelMessage.reportCard ?? null,
            },
          ],
          updatedAt: Date.now(),
        }));
      } else if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to get a response from AI.",
        });
      } else {
        toast({
          title: "Error",
          description: "Received unexpected format from AI.",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Could not reach the AI service. Please check your connection.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBookmark = (sessionId: string) => {
    updateSession(sessionId, (session) => ({
      ...session,
      bookmarked: !session.bookmarked,
    }));
    toast({
      title: sessions.find((s) => s.id === sessionId)?.bookmarked ? "Removed from Bookmarks" : "Added to Bookmarks",
    });
  };

  const deleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      const sorted = filtered.sort((a, b) => b.updatedAt - a.updatedAt);

      if (activeSessionId === sessionId) {
        setActiveSessionId(sorted[0]?.id || null);
      }

      return sorted;
    });
    setDeleteConfirmId(null);
    toast({
      title: "Chat deleted",
    });
  };

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast({
        variant: "destructive",
        title: "Voice Not Supported",
        description: "Speech recognition is not available on this browser.",
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast({
        variant: "destructive",
        title: "Voice Error",
        description: "Could not capture voice. Please try again.",
      });
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const selectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setRecentChatsOpen(false);
    setBookmarksOpen(false);
    setMobileSidebarOpen(false);
  };

  const handleDashboard = () => {
    setMobileSidebarOpen(false);
    router.push("/dashboard");
  };

  const handleCustomization = () => {
    setMobileSidebarOpen(false);
    router.push("/settings?tab=customization");
  };

  const handleHelp = () => {
    setMobileSidebarOpen(false);
    router.push("/help");
  };

  const handleSignOut = async () => {
    try {
      setMobileSidebarOpen(false);
      await signOut(auth);
      router.push("/auth/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: "Please try again.",
      });
    }
  };

  const handleDeleteChat = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setDeleteConfirmId(sessionId);
  };

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Update new chat default to include bookmarked
  useEffect(() => {
    if (!hydrated && sessions.length > 0 && !sessions[0].hasOwnProperty("bookmarked")) {
      setSessions((prev) =>
        prev.map((s) => ({ ...s, bookmarked: s.bookmarked || false }))
      );
    }
  }, [hydrated, sessions]);

  if (loading || !hydrated) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f4f7ff] text-[#17313a]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#0f6f80]" />
          <p className="text-sm text-slate-500">Loading BizRoom AI Assistant...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f4f7ff] p-4 text-[#17313a]">
        <Card className="w-full max-w-md border border-black/5 bg-white shadow-xl">
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f6f80]/10 text-[#0f6f80]">
              <Bot className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">BizRoom AI Assistant</h1>
              <p className="mt-2 text-sm text-slate-600">
                Please log in to start chatting with the billing assistant.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showWelcome = activeMessages.length === 0;
  const recentChats = sessions.slice(0, 8);

  return (
    <div className="relative h-[calc(100vh-4rem)] overflow-hidden bg-[#f4f7ff] text-[#17313a]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,111,128,0.06),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(0,180,216,0.05),transparent_24%)]" />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteConfirmId && deleteSession(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/25 md:hidden" onClick={() => setMobileSidebarOpen(false)}>
          <aside
            className="absolute left-0 top-0 h-full w-[300px] bg-[#eef4ff] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
              <p className="text-xl font-bold text-[#0f6f80]">BizRoom</p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">AI Assistant</p>
              <Button onClick={createNewChat} className="mt-4 w-full rounded-full bg-[#0f6f80] text-white hover:bg-[#0b5f6e]">
                <SquarePlus className="mr-2 h-4 w-4" />
                New Chat
              </Button>
            </div>

            <nav className="mt-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                if (item.label === "Recent Chats") {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => { setRecentChatsOpen((open) => !open); setBookmarksOpen(false); }}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                        recentChatsOpen
                          ? "bg-[#dfe9ff] text-[#0f6f80] font-medium shadow-sm"
                          : "text-slate-600 hover:bg-white",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                      <ChevronRight className={`ml-auto h-4 w-4 transition-transform ${recentChatsOpen ? "rotate-90" : "rotate-0"}`} />
                    </button>
                  );
                }
                if (item.label === "Bookmarks") {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => { setBookmarksOpen((open) => !open); setRecentChatsOpen(false); }}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                        bookmarksOpen
                          ? "bg-[#dfe9ff] text-[#0f6f80] font-medium shadow-sm"
                          : "text-slate-600 hover:bg-white",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                      {bookmarkedSessions.length > 0 && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#0f6f80] text-[10px] text-white">
                          {bookmarkedSessions.length}
                        </span>
                      )}
                      <ChevronRight className={`ml-auto h-4 w-4 transition-transform ${bookmarksOpen ? "rotate-90" : "rotate-0"} ${bookmarkedSessions.length > 0 ? "hidden" : ""}`} />
                    </button>
                  );
                }
                if (item.label === "Customization") {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={handleCustomization}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-white"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                }
                if (item.label === "Dashboard") {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={handleDashboard}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-white"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                }
                return (
                  <button
                    key={item.label}
                    type="button"
                    className={[
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                      item.active
                        ? "bg-[#dfe9ff] text-[#0f6f80] font-medium shadow-sm"
                        : "text-slate-600 hover:bg-white",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Mobile Recent Chats */}
            <div className={recentChatsOpen ? "mt-3 rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur" : "hidden"}>
              <div className="space-y-2">
                {recentChats.map((session) => (
                  <div key={session.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => selectSession(session.id)}
                      className={[
                        "flex-1 rounded-xl border px-3 py-2 text-left transition",
                        session.id === activeSessionId
                          ? "border-[#0f6f80]/20 bg-[#dfe9ff] shadow-sm"
                          : "border-transparent bg-white hover:border-black/5 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <p className="truncate text-sm font-medium text-slate-800">{session.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {session.messages.length ? `${session.messages.length} messages` : "Empty"}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(session.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-yellow-500"
                    >
                      {session.bookmarked ? <BookmarkCheck className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <Bookmark className="h-4 w-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Bookmarks */}
            <div className={bookmarksOpen ? "mt-3 rounded-2xl border border-white/70 bg-white/75 p-3 shadow-sm backdrop-blur" : "hidden"}>
              {bookmarkedSessions.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">No bookmarked chats yet.</p>
              ) : (
                <div className="space-y-2">
                  {bookmarkedSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => selectSession(session.id)}
                      className={[
                        "w-full rounded-xl border px-3 py-2 text-left transition",
                        session.id === activeSessionId
                          ? "border-[#0f6f80]/20 bg-[#dfe9ff] shadow-sm"
                          : "border-transparent bg-white hover:border-black/5 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <p className="truncate text-sm font-medium text-slate-800">{session.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {session.messages.length ? `${session.messages.length} messages` : "Empty"}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 space-y-1">
              <button
                type="button"
                onClick={handleHelp}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-white"
              >
                <HelpCircle className="h-4 w-4" />
                Help
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-white"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="relative flex h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar */}
        <aside className="hidden w-[260px] flex-shrink-0 border-r border-[#d9e3f7] bg-[#eef4ff] md:flex md:flex-col">
          <div className="p-4 pb-2">
            <div className="rounded-[24px] border border-white/70 bg-white/75 p-4 shadow-[0_10px_30px_rgba(15,111,128,0.06)] backdrop-blur">
              <p className="text-[28px] font-extrabold leading-none tracking-tight text-[#0f6f80]">BizRoom</p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">AI Assistant</p>
            </div>

            <Button
              type="button"
              onClick={createNewChat}
              className="mt-4 w-full rounded-full bg-[#0f6f80] py-6 text-white shadow-sm transition hover:bg-[#0b5f6e]"
            >
              <SquarePlus className="mr-2 h-4 w-4" />
              New Chat
            </Button>
          </div>

          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.label === "Recent Chats") {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { setRecentChatsOpen((open) => !open); setBookmarksOpen(false); }}
                    className={[
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                      recentChatsOpen
                        ? "bg-[#dfe9ff] text-[#0f6f80] font-medium shadow-sm"
                        : "text-slate-500 hover:bg-white hover:text-slate-700",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                    <ChevronRight className={`ml-auto h-4 w-4 transition-transform ${recentChatsOpen ? "rotate-90" : "rotate-0"}`} />
                  </button>
                );
              }
              if (item.label === "Bookmarks") {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { setBookmarksOpen((open) => !open); setRecentChatsOpen(false); }}
                    className={[
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                      bookmarksOpen
                        ? "bg-[#dfe9ff] text-[#0f6f80] font-medium shadow-sm"
                        : "text-slate-500 hover:bg-white hover:text-slate-700",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                    {bookmarkedSessions.length > 0 && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#0f6f80] text-[10px] text-white">
                        {bookmarkedSessions.length}
                      </span>
                    )}
                    <ChevronRight className={`h-4 w-4 transition-transform ${bookmarksOpen ? "rotate-90" : "rotate-0"} ${bookmarkedSessions.length > 0 ? "hidden" : ""}`} />
                  </button>
                );
              }
              if (item.label === "Dashboard") {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={handleDashboard}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-500 hover:bg-white hover:text-slate-700"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              }
              if (item.label === "Customization") {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={handleCustomization}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-500 hover:bg-white hover:text-slate-700"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              }
              return (
                <button
                  key={item.label}
                  type="button"
                  className={[
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                    item.active
                      ? "bg-[#dfe9ff] text-[#0f6f80] font-medium shadow-sm"
                      : "text-slate-500 hover:bg-white hover:text-slate-700",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Recent Chats Panel */}
          <div className={recentChatsOpen ? "mt-2 flex-1 overflow-hidden px-3" : "hidden"}>
            <div className="flex h-full flex-col rounded-[24px] border border-white/70 bg-white/75 p-3 shadow-[0_10px_30px_rgba(15,111,128,0.06)] backdrop-blur">
              <div className="flex-1 space-y-1.5 overflow-auto pr-1">
                {recentChats.map((session) => (
                  <div key={session.id} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => selectSession(session.id)}
                      className={[
                        "flex-1 rounded-2xl border px-3 py-2.5 text-left transition",
                        session.id === activeSessionId
                          ? "border-[#0f6f80]/20 bg-[#dfe9ff] shadow-sm"
                          : "border-transparent bg-white hover:border-black/5 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <p className="truncate text-sm font-medium text-slate-800">{session.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {session.messages.length ? `${session.messages.length} messages` : "Empty"}
                      </p>
                    </button>
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => toggleBookmark(session.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-yellow-500"
                        title={session.bookmarked ? "Remove bookmark" : "Add bookmark"}
                      >
                        {session.bookmarked ? (
                          <BookmarkCheck className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <Bookmark className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteChat(e, session.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-red-500"
                        title="Delete chat"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bookmarks Panel */}
          <div className={bookmarksOpen ? "mt-2 flex-1 overflow-hidden px-3" : "hidden"}>
            <div className="flex h-full flex-col rounded-[24px] border border-white/70 bg-white/75 p-3 shadow-[0_10px_30px_rgba(15,111,128,0.06)] backdrop-blur">
              {bookmarkedSessions.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <p className="text-xs text-slate-400">No bookmarked chats yet.<br />Click the bookmark icon on any chat.</p>
                </div>
              ) : (
                <div className="flex-1 space-y-1.5 overflow-auto pr-1">
                  {bookmarkedSessions.map((session) => (
                    <div key={session.id} className="group flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => selectSession(session.id)}
                        className={[
                          "flex-1 rounded-2xl border px-3 py-2.5 text-left transition",
                          session.id === activeSessionId
                            ? "border-[#0f6f80]/20 bg-[#dfe9ff] shadow-sm"
                            : "border-transparent bg-white hover:border-black/5 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <p className="truncate text-sm font-medium text-slate-800">{session.title}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {session.messages.length ? `${session.messages.length} messages` : "Empty"}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleBookmark(session.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-yellow-400 hover:bg-white"
                        title="Remove bookmark"
                      >
                        <BookmarkCheck className="h-3.5 w-3.5 fill-yellow-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="mt-auto px-3 pb-4">
            <div className="space-y-1">
              <button type="button" onClick={handleHelp} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-white">
                <HelpCircle className="h-4 w-4" />
                Help
              </button>
              <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-white">
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>

            <div className="mt-2 flex items-center gap-3 px-1 py-2">
              <Avatar className="h-9 w-9 border border-black/5">
                <AvatarFallback className="bg-slate-900 text-white">
                  {user.displayName?.slice(0, 1)?.toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{user.displayName || "Kapildev"}</p>
                <p className="truncate text-[10px] uppercase tracking-[0.2em] text-slate-500">AI Assistant</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-[44px] items-center justify-between border-b border-[#d9e3f7] bg-[#f7f9ff] px-4 md:px-5">
            <div className="flex items-center gap-2 text-[12px] text-slate-700">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <span className="hidden md:inline-flex items-center gap-2">
                <LayoutGrid className="h-3.5 w-3.5" />
                Active Session: {activeSession?.title || "New Chat"}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-600">
              <Button type="button" onClick={handleDashboard} className="h-8 rounded-md bg-[#0f6f80] px-3 text-white hover:bg-[#0b5f6e]">
                <LayoutGrid className="mr-2 h-3.5 w-3.5" />
                Dashboard
              </Button>
              <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5">
                <Bell className="h-4 w-4" />
              </button>
              <button type="button" onClick={handleHelp} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5">
                <CircleHelp className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            {showWelcome ? (
              <div className="flex flex-1 items-center justify-center px-4 py-8">
                <div className="flex w-full max-w-3xl flex-col items-center text-center">
                  <div className="mb-8 relative">
                    <div className="absolute inset-0 rounded-full bg-[#0f6f80]/15 blur-3xl" />
                    <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-slate-950 shadow-[0_0_45px_rgba(15,111,128,0.32)]">
                      <div className="h-24 w-24 rounded-full bg-[radial-gradient(circle_at_30%_30%,#61f0ff_0%,#0f6f80_35%,#0d1220_65%,#ff4d4d_100%)] opacity-90" />
                    </div>
                  </div>

                  <h1 className="text-[30px] font-bold tracking-tight text-slate-900 sm:text-[34px]">
                    Hey <span className="text-[#0f6f80]">{user.displayName || "Kapildev"}</span>!
                  </h1>
                  <p className="mt-2 text-sm text-slate-500 sm:text-base">Can I help you with anything?</p>
                  <p className="mt-2 text-sm text-slate-400">Ready to assist you with anything you need.</p>

                  <div className="mt-8 w-full max-w-[520px]">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                      }}
                      className="flex items-center gap-2 rounded-full border border-[#f7a8d0] bg-[#f4f5fa] px-3 py-2 shadow-[0_0_0_1px_rgba(15,111,128,0.12)]"
                    >
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question"
                        className="h-10 border-0 bg-transparent px-3 text-slate-600 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                        disabled={isLoading}
                      />
                      <Button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="h-10 w-10 rounded-full bg-[#0f6f80] p-0 text-white hover:bg-[#0b5f6e]"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </form>
                  </div>

                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt.label}
                        type="button"
                        onClick={() => setInput(prompt.text)}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 shadow-sm transition hover:border-[#0f6f80]/30 hover:text-[#0f6f80]"
                      >
                        {prompt.label === "Create Invoice" && <Receipt className="h-3.5 w-3.5 text-[#0f6f80]" />}
                        {prompt.label === "Show Sales" && <ArrowUpRight className="h-3.5 w-3.5 text-[#0f6f80]" />}
                        {prompt.label === "Update Stock" && <Package className="h-3.5 w-3.5 text-[#0f6f80]" />}
                        {prompt.label === "Add Customer" && <Users className="h-3.5 w-3.5 text-[#0f6f80]" />}
                        {prompt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex min-h-0 flex-1 overflow-hidden px-4 py-4 md:px-6 md:py-5">
                  <div ref={scrollRef} className="h-full min-h-0 overflow-y-auto overscroll-contain">
                    <div className="mx-auto flex max-w-5xl flex-col gap-6">
                      {activeMessages.map((msg, index) => {
                        if (msg.role === "system" || msg.role === "tool") return null;

                        const isUser = msg.role === "user";

                        return (
                          <div key={index} className="flex flex-col gap-2">
                            <div className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                              {!isUser && (
                                <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white">
                                  <Sparkles className="h-3.5 w-3.5" />
                                </div>
                              )}

                              <div
                                className={[
                                  "max-w-[85%] rounded-2xl px-5 py-4",
                                  isUser
                                    ? "bg-[#0f6f80] text-white shadow-lg shadow-[#0f6f80]/20"
                                    : "border border-slate-100 bg-white text-slate-700 shadow-sm",
                                ].join(" ")}
                              >
                                {msg.content.map((c, i) =>
                                  c.text ? (
                                    <div key={i} className={`prose prose-sm max-w-none ${isUser ? "prose-invert text-white" : "text-slate-700"}`}>
                                      <ReactMarkdown>{c.text}</ReactMarkdown>
                                    </div>
                                  ) : c.toolRequest ? (
                                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                                      <div className="mb-2 flex items-center gap-2 font-semibold text-[#0f6f80]">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Executing {c.toolRequest.name}
                                      </div>
                                      <pre className="overflow-x-auto rounded-lg bg-white p-2 text-xs text-slate-600">
                                        {JSON.stringify(c.toolRequest.input, null, 2)}
                                      </pre>
                                    </div>
                                  ) : null
                                )}
                              </div>

                              {isUser && (
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className="bg-slate-900 text-white">
                                    <UserIcon className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>

                            {msg.role === "model" && msg.invoiceCard && user && (
                              <div className="pl-10">
                                <ChatInvoiceCard
                                  invoiceId={msg.invoiceCard.invoiceId}
                                  invoiceNumber={msg.invoiceCard.invoiceNumber}
                                  userId={user.uid}
                                />
                              </div>
                            )}
                            {msg.role === "model" && msg.reportCard && (
                              <div className="pl-10">
                                <ChatReportCard report={msg.reportCard} />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {isLoading && (
                        <div className="flex items-start gap-3">
                          <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white">
                            <Sparkles className="h-3.5 w-3.5" />
                          </div>
                          <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin text-[#0f6f80]" />
                              Thinking...
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-[#d9e3f7] bg-[#f7f9ff] px-4 py-4 md:px-6">
              <div className="mx-auto max-w-5xl">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="space-y-3"
                >
                  <div className="rounded-xl border border-[#0f6f80] bg-[#0e2033] p-2 shadow-lg">
                    <div className="flex items-center gap-2">
                      <button type="button" className="rounded-lg p-2 text-slate-400 hover:text-white" aria-label="Attach">
                        <Wand2 className="h-4 w-4" />
                      </button>
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about your finances..."
                        className="h-12 border-0 bg-transparent text-white placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={isListening ? stopListening : startListening}
                        className={`rounded-lg p-2 transition ${isListening
                          ? "text-green-400 bg-green-400/10 animate-pulse"
                          : "text-slate-400 hover:text-white"
                          }`}
                        aria-label={isListening ? "Stop listening" : "Voice input"}
                      >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </button>
                      <Button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="h-10 w-10 rounded-lg bg-[#11b7d5] p-0 text-slate-950 hover:bg-[#18c5e4]"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt.label}
                        type="button"
                        onClick={() => setInput(prompt.text)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 shadow-sm hover:border-[#0f6f80]/30 hover:text-[#0f6f80]"
                      >
                        {prompt.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-center text-[10px] text-slate-500">
                    BizRoom AI can make mistakes. Check important financial info before exporting.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}