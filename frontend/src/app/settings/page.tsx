"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { settingsApi, interviewApi } from "@/lib/api";
import type { UserSettings, LLMConfig } from "@/lib/types";
import { PROVIDER_MODELS } from "@/lib/types";
import {
  Settings,
  Key,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Shield,
  Save,
  Wifi,
} from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Provider config
  const [preferredProvider, setPreferredProvider] = useState("gemini");
  const [preferredModel, setPreferredModel] = useState(PROVIDER_MODELS.gemini[0]);

  // API keys
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");

  // Status
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, "idle" | "testing" | "success" | "error">>({
    gemini: "idle",
    openai: "idle",
    anthropic: "idle",
    ollama: "idle",
  });
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    settingsApi
      .get()
      .then((res) => {
        const s = res.data;
        setSettings(s);
        if (s.preferred_provider) setPreferredProvider(s.preferred_provider);
        if (s.preferred_model) setPreferredModel(s.preferred_model);
        if (s.ollama_base_url) setOllamaUrl(s.ollama_base_url);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPreferredModel(PROVIDER_MODELS[preferredProvider]?.[0] || "");
  }, [preferredProvider]);

  const saveSettings = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const payload: Record<string, unknown> = {
        preferred_provider: preferredProvider,
        preferred_model: preferredModel,
        ollama_base_url: ollamaUrl,
      };
      if (geminiKey) payload.gemini_api_key = geminiKey;
      if (openaiKey) payload.openai_api_key = openaiKey;
      if (anthropicKey) payload.anthropic_api_key = anthropicKey;

      await settingsApi.update(payload);
      // Refresh
      const res = await settingsApi.get();
      setSettings(res.data);
      setSaveMessage("Settings saved successfully!");
      setGeminiKey("");
      setOpenaiKey("");
      setAnthropicKey("");
    } catch {
      setSaveMessage("Failed to save settings");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const testConnection = async (provider: string) => {
    setTestStatus((prev) => ({ ...prev, [provider]: "testing" }));
    try {
      const keyMap: Record<string, string> = {
        gemini: geminiKey,
        openai: openaiKey,
        anthropic: anthropicKey,
      };
      const config: Record<string, unknown> = {
        provider,
        model: PROVIDER_MODELS[provider]?.[0],
      };
      if (provider !== "ollama") {
        config.api_key = keyMap[provider];
      } else {
        config.base_url = ollamaUrl;
      }

      await interviewApi.testConnection(config);
      setTestStatus((prev) => ({ ...prev, [provider]: "success" }));
    } catch {
      setTestStatus((prev) => ({ ...prev, [provider]: "error" }));
    }
  };

  const deleteKey = async (provider: string) => {
    try {
      await settingsApi.deleteApiKey(provider);
      const res = await settingsApi.get();
      setSettings(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const providers = [
    {
      id: "gemini",
      name: "Google Gemini",
      description: "Gemini 2.0 Flash, Pro models",
      hasKey: settings?.has_gemini_key,
      keyState: geminiKey,
      setKey: setGeminiKey,
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "GPT-4o, GPT-4 Turbo models",
      hasKey: settings?.has_openai_key,
      keyState: openaiKey,
      setKey: setOpenaiKey,
    },
    {
      id: "anthropic",
      name: "Anthropic",
      description: "Claude Sonnet, Haiku, Opus models",
      hasKey: settings?.has_anthropic_key,
      keyState: anthropicKey,
      setKey: setAnthropicKey,
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your LLM providers and application preferences
        </p>
      </div>

      {/* Default Provider */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Default Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Preferred Provider</label>
              <Select value={preferredProvider} onValueChange={setPreferredProvider}>
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
              <label className="text-sm font-medium mb-1 block">Default Model</label>
              <Select value={preferredModel} onValueChange={setPreferredModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(PROVIDER_MODELS[preferredProvider] || []).map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> API Keys
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Keys are encrypted at rest and never exposed in API responses
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {providers.map((p) => (
            <div key={p.id} className="space-y-2 pb-4 border-b last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.hasKey ? (
                    <Badge variant="success" className="gap-1">
                      <Shield className="h-3 w-3" /> Stored
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not Set</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={p.keyState}
                  onChange={(e) => p.setKey(e.target.value)}
                  placeholder={p.hasKey ? "••••••••••• (replace)" : `Enter ${p.name} API key`}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection(p.id)}
                  disabled={!p.keyState || testStatus[p.id] === "testing"}
                  className="gap-1"
                >
                  {testStatus[p.id] === "testing" && <Loader2 className="h-3 w-3 animate-spin" />}
                  {testStatus[p.id] === "success" && <CheckCircle className="h-3 w-3 text-green-500" />}
                  {testStatus[p.id] === "error" && <XCircle className="h-3 w-3 text-red-500" />}
                  <Wifi className="h-3 w-3" />
                  Test
                </Button>
                {p.hasKey && (
                  <Button variant="outline" size="sm" onClick={() => deleteKey(p.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Ollama */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Ollama (Local)</h3>
                <p className="text-xs text-muted-foreground">Run models locally — no API key needed</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection("ollama")}
                disabled={testStatus.ollama === "testing"}
                className="gap-1"
              >
                {testStatus.ollama === "testing" && <Loader2 className="h-3 w-3 animate-spin" />}
                {testStatus.ollama === "success" && <CheckCircle className="h-3 w-3 text-green-500" />}
                {testStatus.ollama === "error" && <XCircle className="h-3 w-3 text-red-500" />}
                <Wifi className="h-3 w-3" />
                Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={saveSettings} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All Settings
        </Button>
        {saveMessage && (
          <span className={`text-sm ${saveMessage.includes("success") ? "text-green-500" : "text-destructive"}`}>
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
}
