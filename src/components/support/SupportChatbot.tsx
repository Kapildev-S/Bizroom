'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { cn } from "@/lib/utils";
import { chatWithSupport, type ChatMessage } from '@/app/actions/chatActions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function SupportChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', content: 'Hi there! 👋 I\'m BizBot. How can I help you today?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: inputValue };
        const newHistory = [...messages, userMessage];

        setMessages(newHistory);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await chatWithSupport(newHistory);

            if (response.success && response.message) {
                setMessages(prev => [...prev, { role: 'model', content: response.message as string }]);
            } else {
                setMessages(prev => [...prev, { role: 'model', content: response.message || "Sorry, something went wrong. Please try again." }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', content: "Connection error. Please check your internet." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSendMessage();
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            {/* Chat Window */}
            <div className={cn(
                "pointer-events-auto transition-all duration-300 ease-in-out origin-bottom-right mb-4",
                isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-0 opacity-0 translate-y-10"
            )}>
                <Card className="w-[350px] md:w-[400px] h-[500px] shadow-2xl border-primary/20 flex flex-col bg-background/95 backdrop-blur-sm">
                    <CardHeader className="p-4 border-b bg-primary/5 flex flex-row items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 text-primary">
                            <Bot className="w-6 h-6" />
                            <CardTitle className="text-lg">BizBot Support</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={cn("flex gap-2 max-w-[85%]", msg.role === 'user' ? "ml-auto" : "mr-auto")}>
                                {msg.role === 'model' && (
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                                        <Bot className="w-3.5 h-3.5 text-primary" />
                                    </div>
                                )}
                                <div className={cn(
                                    "p-3 rounded-2xl text-sm shadow-sm",
                                    msg.role === 'user'
                                        ? "bg-primary text-primary-foreground rounded-br-none"
                                        : "bg-muted text-foreground rounded-bl-none"
                                )}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                                            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                            strong: ({ node, ...props }) => <strong className="font-bold text-inherit" {...props} />,
                                            a: ({ node, ...props }) => <a className="underline hover:text-primary/90" target="_blank" rel="noopener noreferrer" {...props} />,
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-2 mr-auto max-w-[85%]">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                                    <Bot className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <div className="bg-muted p-3 rounded-2xl rounded-bl-none text-sm text-muted-foreground">
                                    <span className="animate-pulse">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </CardContent>

                    <CardFooter className="p-3 border-t bg-background">
                        <div className="flex w-full gap-2">
                            <Input
                                placeholder="Ask a question..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="flex-1 focus-visible:ring-primary/50"
                            />
                            <Button size="icon" onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()} className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200">
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>

            {/* Toggle Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="lg"
                className={cn(
                    "pointer-events-auto h-14 w-14 rounded-full shadow-lg transition-transform duration-200 hover:scale-110",
                    isOpen ? "bg-destructive hover:bg-destructive/90 rotate-90" : "bg-primary hover:bg-primary/90"
                )}
            >
                {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-7 h-7 text-white" />}
            </Button>
        </div>
    );
}
