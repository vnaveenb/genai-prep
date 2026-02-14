"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { interviewApi } from "@/lib/api";
import type { LLMConfig, InterviewMessage, InterviewEvaluation } from "@/lib/types";
import { PROVIDER_MODELS } from "@/lib/types";
import {
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Play,
  StopCircle,
  BarChart3,
  Loader2,
  CheckCircle,
  XCircle,
  Zap,
  Shield,
  Brain,
  Settings2,
} from "lucide-react";

type Phase = "setup" | "interview" | "evaluation";
type InterviewType = "python" | "system_design" | "genai" | "ml_dl" | "mixed";

export default function InterviewPage() {
  // ─── State ──────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("setup");

  // LLM config
  const [provider, setProvider] = useState<LLMConfig["provider"]>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(PROVIDER_MODELS.gemini[0]);
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  // Interview config
  const [interviewType, setInterviewType] = useState<InterviewType>("genai");
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(5);

  // Chat
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Evaluation
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Update model when provider changes
  useEffect(() => {
    setModel(PROVIDER_MODELS[provider]?.[0] || "");
  }, [provider]);

  const llmConfig = useCallback((): Record<string, unknown> => ({
    provider,
    api_key: provider !== "ollama" ? apiKey : undefined,
    model,
    base_url: provider === "ollama" ? ollamaUrl : undefined,
  }), [provider, apiKey, model, ollamaUrl]);

  // ─── Test Connection ────────────────────────────────────
  const testConnection = async () => {
    setConnectionStatus("testing");
    try {
      await interviewApi.testConnection(llmConfig());
      setConnectionStatus("success");
    } catch {
      setConnectionStatus("error");
    }
  };

  // ─── Start Interview (SSE) ─────────────────────────────
  const startInterview = async () => {
    setIsStreaming(true);
    setMessages([]);
    setStreamingContent("");

    try {
      const response = await interviewApi.startStream({
        interview_type: interviewType,
        llm_config: llmConfig(),
        difficulty,
        num_questions: numQuestions,
      });

      if (!response.ok) {
        throw new Error("Failed to start interview");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

      let accumulated = "";
      let sid = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.session_id) {
                sid = parsed.session_id;
                setSessionId(sid);
              }
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              }
            } catch {
              // SSE text chunk
              accumulated += data;
              setStreamingContent(accumulated);
            }
          }
        }
      }

      const interviewerMsg: InterviewMessage = {
        role: "interviewer",
        content: accumulated,
        timestamp: new Date().toISOString(),
      };
      setMessages([interviewerMsg]);
      setStreamingContent("");
      setPhase("interview");
    } catch (err) {
      console.error("Failed to start interview", err);
    } finally {
      setIsStreaming(false);
    }
  };

  // ─── Send Message (SSE) ────────────────────────────────
  const sendMessage = async () => {
    if (!userInput.trim() || isStreaming) return;

    const candidateMsg: InterviewMessage = {
      role: "candidate",
      content: userInput.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, candidateMsg]);
    setUserInput("");
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await interviewApi.sendMessageStream({
        session_id: sessionId,
        message: candidateMsg.content,
        llm_config: llmConfig(),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader");

      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              }
            } catch {
              accumulated += data;
              setStreamingContent(accumulated);
            }
          }
        }
      }

      const interviewerMsg: InterviewMessage = {
        role: "interviewer",
        content: accumulated,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, interviewerMsg]);
      setStreamingContent("");
    } catch (err) {
      console.error("Send failed", err);
    } finally {
      setIsStreaming(false);
    }
  };

  // ─── Evaluate ──────────────────────────────────────────
  const evaluateInterview = async () => {
    setEvaluating(true);
    try {
      const res = await interviewApi.evaluate({
        session_id: sessionId,
        llm_config: llmConfig(),
      });
      setEvaluation(res.data);
      setPhase("evaluation");
    } catch (err) {
      console.error("Evaluation failed", err);
    } finally {
      setEvaluating(false);
    }
  };

  // ─── Render: Setup ─────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Mock Interview</h1>
          <p className="text-muted-foreground mt-1">
            Practice with an AI interviewer powered by your chosen LLM
          </p>
        </div>

        {/* LLM Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> LLM Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Provider</label>
                <Select value={provider} onValueChange={(v) => setProvider(v as LLMConfig["provider"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="ollama">Ollama (Local)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Model</label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(PROVIDER_MODELS[provider] || []).map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {provider !== "ollama" ? (
              <div>
                <label className="text-sm font-medium mb-1 block">API Key</label>
                <Input
                  type="password"
                  placeholder={`Enter your ${provider} API key`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium mb-1 block">Ollama Base URL</label>
                <Input
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>
            )}

            <Button
              variant="outline"
              onClick={testConnection}
              disabled={connectionStatus === "testing" || (!apiKey && provider !== "ollama")}
              className="gap-2"
            >
              {connectionStatus === "testing" && <Loader2 className="h-4 w-4 animate-spin" />}
              {connectionStatus === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
              {connectionStatus === "error" && <XCircle className="h-4 w-4 text-red-500" />}
              Test Connection
            </Button>
          </CardContent>
        </Card>

        {/* Interview Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" /> Interview Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={interviewType} onValueChange={(v) => setInterviewType(v as InterviewType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="genai">GenAI / LLM</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="system_design">System Design</SelectItem>
                    <SelectItem value="ml_dl">ML / Deep Learning</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Difficulty</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Questions</label>
                <Select value={String(numQuestions)} onValueChange={(v) => setNumQuestions(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 5, 7, 10].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={startInterview}
              disabled={isStreaming || (!apiKey && provider !== "ollama")}
              className="w-full gap-2"
              size="lg"
            >
              {isStreaming ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Starting Interview...</>
              ) : (
                <><Play className="h-4 w-4" /> Start Interview</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render: Interview Chat ────────────────────────────
  if (phase === "interview") {
    return (
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Mock Interview — <span className="capitalize">{interviewType.replace("_", " ")}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {provider}/{model} · {difficulty} · {numQuestions} questions
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={evaluateInterview}
              disabled={evaluating || messages.length < 2}
              className="gap-2"
            >
              {evaluating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              End & Evaluate
            </Button>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "candidate" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "candidate"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="text-xs mb-1 opacity-70 capitalize">{msg.role}</div>
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {/* Streaming indicator */}
          {isStreaming && streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-muted">
                <div className="text-xs mb-1 opacity-70">Interviewer</div>
                <div className="text-sm whitespace-pre-wrap">{streamingContent}</div>
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
              </div>
            </div>
          )}
          {isStreaming && !streamingContent && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t pt-4">
          <div className="flex gap-2">
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your answer..."
              className="min-h-[60px] max-h-[150px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              onClick={sendMessage}
              disabled={isStreaming || !userInput.trim()}
              size="lg"
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    );
  }

  // ─── Render: Evaluation ────────────────────────────────
  if (phase === "evaluation" && evaluation) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interview Evaluation</h1>
          <p className="text-muted-foreground mt-1">
            Your performance analysis for this mock interview
          </p>
        </div>

        {/* Score Overview */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="text-6xl font-bold">
                {evaluation.overall_score}<span className="text-2xl text-muted-foreground">/10</span>
              </div>
              <p className="text-muted-foreground mt-1">Overall Score</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Correctness", value: evaluation.correctness, icon: CheckCircle },
                { label: "Depth", value: evaluation.depth, icon: Brain },
                { label: "Communication", value: evaluation.communication, icon: MessageSquare },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="text-center">
                  <Icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-2xl font-semibold">{value}/10</div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <Progress value={value * 10} className="mt-2 h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-500">
              <Zap className="h-5 w-5" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {evaluation.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Areas to Improve */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <Shield className="h-5 w-5" /> Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {evaluation.areas_to_improve.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {evaluation.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Button onClick={() => { setPhase("setup"); setMessages([]); setEvaluation(null); }} className="w-full gap-2">
          Start New Interview
        </Button>
      </div>
    );
  }

  return null;
}
