"use client";

import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useRef } from "react";
import { Session } from "@/types/sensor";
import { Brain, Send, Sparkles, User, Bot, TrendingUp, Activity, Thermometer } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface QuickPrompt {
  icon: React.ReactNode;
  text: string;
  prompt: string;
}

export default function AICoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sensorData, setSensorData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick prompts for users to try
  const quickPrompts: QuickPrompt[] = [
    {
      icon: <TrendingUp className="h-4 w-4" />,
      text: "Analyze my progress",
      prompt: "Based on my recent sauna sessions, how am I progressing? What improvements do you see?"
    },
    {
      icon: <Activity className="h-4 w-4" />,
      text: "Optimize my routine",
      prompt: "How can I optimize my sauna routine for maximum health benefits?"
    },
    {
      icon: <Thermometer className="h-4 w-4" />,
      text: "Temperature guidance",
      prompt: "What's the ideal temperature and duration for my current fitness level?"
    },
    {
      icon: <Brain className="h-4 w-4" />,
      text: "Recovery tips",
      prompt: "What are the best pre and post-sauna practices for optimal recovery?"
    }
  ];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch session data
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch("/api/sensor/sessions");
        if (response.ok) {
          const data = await response.json();
          setSessions(data.sessions || []);
        }
      } catch (err) {
        console.error("Error fetching sessions:", err);
      }
    };

    fetchSessions();
  }, []);

  // Fetch current sensor data
  useEffect(() => {
    const fetchCurrentData = async () => {
      try {
        const response = await fetch("/api/sensor/current");
        if (response.ok) {
          const data = await response.json();
          setSensorData(data);
        }
      } catch (err) {
        console.error("Error fetching sensor data:", err);
      }
    };

    fetchCurrentData();
  }, []);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          sessionData: sessions.slice(0, 5), // Send last 5 sessions for context
          sensorData: sensorData ? {
            temperature: sensorData.data?.temp,
            humidity: sensorData.data?.hum,
          } : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to get AI response" }));
        throw new Error(errorData.error || "Failed to get AI response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      
      let errorText = "Sorry, I encountered an error. ";
      
      if (error instanceof Error) {
        errorText += error.message;
      }

      const errorMessage: Message = {
        role: "assistant",
        content: errorText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    handleSendMessage(prompt);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Wellness</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>AI Sauna Coach</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col h-[calc(100vh-4rem)]">
          {/* Hero section */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-purple-500/20 blur-3xl"></div>
                <div className="relative rounded-full bg-gradient-to-br from-orange-500 to-purple-600 p-6">
                  <Brain className="h-12 w-12 text-white" />
                </div>
              </div>
              
              <div className="text-center max-w-2xl">
                <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                  AI Sauna Coach
                </h1>
                <p className="text-lg text-muted-foreground mb-2">
                  Powered by Google Gemini
                </p>
                <p className="text-muted-foreground">
                  Get personalized insights, safety guidance, and optimization tips for your sauna sessions.
                  I analyze your session history and provide expert recommendations.
                </p>
              </div>

              {/* Quick prompts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl w-full mt-4">
                {quickPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickPrompt(prompt.prompt)}
                    className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left group"
                  >
                    <div className="flex-shrink-0 p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-purple-600/10 text-orange-500 group-hover:from-orange-500/20 group-hover:to-purple-600/20 transition-colors">
                      {prompt.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{prompt.text}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {prompt.prompt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Stats */}
              {sessions.length > 0 && (
                <div className="flex items-center gap-6 text-sm text-muted-foreground mt-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span>{sessions.length} sessions analyzed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Powered by Gemini AI</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                
                <div
                  className={`max-w-[70%] rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-orange-500 to-purple-600 text-white"
                      : "bg-card border"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      message.role === "user"
                        ? "text-white/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce"></div>
                    <div
                      className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t bg-background p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask me anything about sauna health, safety, or optimization..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Powered by Google Gemini • All advice should be verified with healthcare professionals
              </p>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

