"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { studyPlanApi } from "@/lib/api";
import type { StudyDay } from "@/lib/types";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export default function StudyPlanPage() {
  const [plan, setPlan] = useState<StudyDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWeek, setActiveWeek] = useState<1 | 2>(1);

  useEffect(() => {
    studyPlanApi
      .getPlan()
      .then((res) => {
        // Handle both direct array and wrapped response
        const data = Array.isArray(res.data) ? res.data : res.data.days || [];
        setPlan(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = async (day: number, completed: boolean) => {
    try {
      if (completed) {
        await studyPlanApi.uncompleteDay(day);
      } else {
        await studyPlanApi.completeDay(day);
      }
      const res = await studyPlanApi.getPlan();
      const data = Array.isArray(res.data) ? res.data : res.data.days || [];
      setPlan(data);
    } catch (e) {
      console.error(e);
    }
  };

  const completedCount = plan.filter((d) => d.is_completed || (d as any).completed).length;
  const totalDays = plan.length;
  const completionPct = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

  const week1 = plan.filter((d) => d.day <= 7 || d.week === 1);
  const week2 = plan.filter((d) => d.day > 7 || d.week === 2);
  const daysToShow = activeWeek === 1 ? week1 : week2;

  const isCompleted = (d: StudyDay) => d.is_completed || (d as any).completed;

  const dayThemeColors: Record<string, string> = {
    "Foundations": "border-blue-500/50 bg-blue-500/5",
    "Architecture": "border-purple-500/50 bg-purple-500/5",
    "NLP Deep Dive": "border-green-500/50 bg-green-500/5",
    "RAG & Retrieval": "border-orange-500/50 bg-orange-500/5",
    "Agents": "border-red-500/50 bg-red-500/5",
    "Agents & Tools": "border-red-500/50 bg-red-500/5",
    "Python Mastery": "border-yellow-500/50 bg-yellow-500/5",
    "System Design": "border-indigo-500/50 bg-indigo-500/5",
    "Mock Interviews": "border-pink-500/50 bg-pink-500/5",
    "LLM Ops & Productionization": "border-teal-500/50 bg-teal-500/5",
    "Edge Cases & Hard Questions": "border-amber-500/50 bg-amber-500/5",
    "Evaluation & Metrics": "border-cyan-500/50 bg-cyan-500/5",
    "DSA + Integration": "border-lime-500/50 bg-lime-500/5",
    "Final Review": "border-emerald-500/50 bg-emerald-500/5",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">14-Day Study Sprint</h1>
        <p className="text-muted-foreground mt-1">
          Your structured interview preparation roadmap
        </p>
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Sprint Progress</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {completedCount} / {totalDays} days completed
            </span>
          </div>
          <Progress value={completionPct} className="h-3" />
          <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
            <span>{completionPct}% complete</span>
            <span>{totalDays - completedCount} days remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Week tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeWeek === 1 ? "default" : "outline"}
          onClick={() => setActiveWeek(1)}
          className="gap-2"
        >
          Week 1 <Badge variant="secondary">{week1.filter((d) => isCompleted(d)).length}/{week1.length}</Badge>
        </Button>
        <Button
          variant={activeWeek === 2 ? "default" : "outline"}
          onClick={() => setActiveWeek(2)}
          className="gap-2"
        >
          Week 2 <Badge variant="secondary">{week2.filter((d) => isCompleted(d)).length}/{week2.length}</Badge>
        </Button>
      </div>

      {/* Day cards */}
      <div className="grid gap-4">
        {daysToShow.map((day) => {
          const dayTitle = day.title || (day as any).theme || `Day ${day.day}`;
          const dayDesc = day.description || (day as any).focus || "";
          const completed = isCompleted(day);
          const themeClass = dayThemeColors[dayTitle] || "border-border";
          return (
            <Card key={day.day} className={`border-l-4 ${themeClass} transition-all`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleDay(day.day, completed)}
                      className="transition-colors"
                    >
                      {completed ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                    <div>
                      <CardTitle className={`text-lg ${completed ? "line-through text-muted-foreground" : ""}`}>
                        Day {day.day}: {dayTitle}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {dayDesc}
                      </p>
                    </div>
                  </div>
                  <Badge variant={completed ? "success" : "outline"}>
                    {completed ? "Done" : `Day ${day.day}`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Tasks */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <BookOpen className="h-4 w-4" /> Tasks
                    </h4>
                    <ul className="space-y-1.5">
                      {day.tasks.map((task, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Linked sections */}
                  {day.linked_sections && day.linked_sections.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                      {day.linked_sections.map((sec) => (
                        <Badge key={sec} variant="secondary" className="text-xs capitalize">
                          {sec.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
