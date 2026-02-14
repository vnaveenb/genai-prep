"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { contentApi, progressApi } from "@/lib/api";
import type { ContentStats, OverallProgress } from "@/lib/types";
import {
  HelpCircle,
  Layers,
  TrendingUp,
  Calendar,
  MessageSquare,
  BookmarkIcon,
  Flame,
  Target,
  BookOpen,
  Zap,
} from "lucide-react";

const featureCards = [
  { href: "/quiz", label: "Quiz Mode", icon: HelpCircle, color: "text-blue-500", desc: "Test your knowledge with MCQ and open-ended questions" },
  { href: "/flashcards", label: "Flashcards", icon: Layers, color: "text-purple-500", desc: "Review concepts with interactive flip cards" },
  { href: "/progress", label: "Progress", icon: TrendingUp, color: "text-green-500", desc: "Track your learning journey across all topics" },
  { href: "/study-plan", label: "14-Day Sprint", icon: Calendar, color: "text-orange-500", desc: "Follow a structured study plan" },
  { href: "/interview", label: "Mock Interview", icon: MessageSquare, color: "text-red-500", desc: "AI-powered interview practice with real-time feedback" },
  { href: "/notes", label: "Notes & Bookmarks", icon: BookmarkIcon, color: "text-yellow-500", desc: "Your personal notes and saved items" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [progress, setProgress] = useState<OverallProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, progressRes] = await Promise.all([
          contentApi.getStats(),
          progressApi.getOverview(),
        ]);
        setStats(statsRes.data);
        setProgress(progressRes.data);
      } catch {
        console.error("Failed to load dashboard data — backend may not be running");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">GenAI Senior Engineer Interview Preparation</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Topics</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_items || 0}</div>
            <p className="text-xs text-muted-foreground">across {stats?.total_sections || 0} sections</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress?.completed || 0}</div>
            <Progress value={progress?.overall_completion || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{progress?.overall_completion || 0}% complete</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress?.current_streak || 0} days</div>
            <p className="text-xs text-muted-foreground">{progress?.days_active || 0} total active days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flashcards</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_flashcards || 0}</div>
            <p className="text-xs text-muted-foreground">available for review</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {featureCards.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    <CardTitle className="text-base">{feature.label}</CardTitle>
                  </div>
                  <CardDescription>{feature.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Section Progress */}
      {progress && progress.sections.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Section Progress</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {progress.sections.map((sec) => (
              <Card key={sec.section} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{sec.section.replace(/_/g, " ")}</span>
                  <Badge variant={sec.completion_percentage === 100 ? "success" : "secondary"}>
                    {sec.completed}/{sec.total}
                  </Badge>
                </div>
                <Progress value={sec.completion_percentage} className="h-1.5" />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">Confidence: {sec.average_confidence}/5</span>
                  <span className="text-xs text-muted-foreground">{sec.completion_percentage}%</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Content Library */}
      {stats && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Content Library</h2>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {stats.sections.map((sec) => (
              <Card key={sec.key} className="p-4">
                <div className="text-sm font-medium">{sec.title}</div>
                <div className="text-2xl font-bold mt-1">{sec.item_count}</div>
                <div className="text-xs text-muted-foreground">items</div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
