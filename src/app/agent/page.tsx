"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User as UserIcon, Send, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import ChatInvoiceCard from "@/components/agent/ChatInvoiceCard";

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
};

export default function AgentPage() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!user) {
    return <div className="flex h-screen items-center justify-center">Please log in to use the AI Agent.</div>;
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: [{ text: input.trim() }],
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          userId: user.uid,
        }),
      });

      const data = await response.json();

      // Server may return a friendly model message even on rate-limit errors
      if (data.message) {
        setMessages((prev) => [...prev, data.message as Message]);
      } else if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to get a response from AI.",
        });
      } else {
        toast({ title: "Error", description: "Received unexpected format from AI." });
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



  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col md:p-4">
      <Card className="flex flex-1 flex-col overflow-hidden shadow-lg border-primary/20">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="flex items-center gap-2 text-2xl font-headline text-primary">
            <Sparkles className="h-6 w-6 text-primary" />
            BizRoom AI Agent
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            I can help you create customers, fetch products, and generate invoices automatically!
          </p>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4" ref={scrollRef}>
            <div className="flex flex-col gap-4 pb-4">
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center text-center p-8 opacity-60">
                  <Bot className="h-16 w-16 mb-4 text-primary" />
                  <p className="text-lg font-medium">Hello! How can I help your business today?</p>
                  <p className="text-sm mt-2">Try saying: "Create an invoice for John Doe for 2 hours of Web Design at ₹1000/hr"</p>
                </div>
              )}
              {messages.map((msg, index) => {
                 if (msg.role === 'system' || msg.role === 'tool') return null; // We can hide internal tool responses or format them nicely

                 return (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "model" && (
                      <Avatar className="h-8 w-8 border border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <Bot className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 border shadow-sm"
                      }`}
                    >
                      {msg.content.map((c, i) => {
                        if (c.text) {
                          return (
                            <div key={i} className={`prose prose-sm dark:prose-invert ${msg.role === 'user' ? 'text-primary-foreground' : ''}`}>
                               <ReactMarkdown>{c.text}</ReactMarkdown>
                            </div>
                          );
                        }
                        if (c.toolRequest) {
                           return (
                              <div key={i} className="mt-2 p-3 bg-background border rounded-lg shadow-sm text-sm">
                                 <div className="flex items-center gap-2 font-semibold text-primary mb-2">
                                     <Loader2 className="h-4 w-4 animate-spin" />
                                     Executing: {c.toolRequest.name}...
                                 </div>
                                 <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                    {JSON.stringify(c.toolRequest.input, null, 2)}
                                 </pre>
                              </div>
                           )
                        }
                        if (c.toolResponse && c.toolResponse.name === 'createInvoice') {
                             const invId = c.toolResponse.output?.invoiceId;
                             const invNumber = c.toolResponse.output?.invoiceNumber;
                             if (!invId || !invNumber || !user) return null;
                             return (
                               <ChatInvoiceCard
                                 key={i}
                                 invoiceId={invId}
                                 invoiceNumber={invNumber}
                                 userId={user.uid}
                               />
                             );
                         }
                        return null;
                      })}
                    </div>
                    {msg.role === "user" && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <UserIcon className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                 )
              })}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 border border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted/50 border shadow-sm rounded-2xl px-4 py-3 flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 border-t bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex w-full items-center space-x-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
