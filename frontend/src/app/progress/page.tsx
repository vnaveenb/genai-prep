"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { progressApi, contentApi } from "@/lib/api";
import type { OverallProgress, ContentSection, ContentItem } from "@/lib/types";
import { TrendingUp, Flame, Target, BarChart3, CheckCircle } from "lucide-react";

export default function ProgressPage() {
  const [overview, setOverview] = useState<OverallProgress | null>(null);
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [sectionItems, setSectionItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      progressApi.getOverview(),
      contentApi.getSections(),
    ]).then(([progressRes, sectionsRes]) => {
      setOverview(progressRes.data);
      setSections(sectionsRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedSection) {
      contentApi.getSectionItems(selectedSection)
        .then((res) => setSectionItems(res.data))
        .catch(() => setSectionItems([]));
    }
  }, [selectedSection]);

  const updateItemProgress = async (itemId: string, section: string, status: string, confidence: number) => {
    try {
      await progressApi.updateItem({ item_id: itemId, section, status, confidence });
      const res = await progressApi.getOverview();
      setOverview(res.data);
    } catch (e) {
      console.error("Failed to update progress", e);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress Tracker</h1>
        <p className="text-muted-foreground mt-1">Track your learning journey across all topics</p>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.overall_completion}%</div>
              <Progress value={overview.overall_completion} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {overview.completed}/{overview.total_items} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confidence</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.average_confidence}/5</div>
              <Progress value={overview.average_confidence * 20} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.current_streak} days</div>
              <p className="text-xs text-muted-foreground mt-1">{overview.days_active} total active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.in_progress}</div>
              <p className="text-xs text-muted-foreground mt-1">{overview.not_started} not started</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section Heatmap */}
      {overview && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Section Overview</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {overview.sections.map((sec) => (
              <Card
                key={sec.section}
                className={`p-4 cursor-pointer transition-colors hover:border-primary/50 ${
                  selectedSection === sec.section ? "border-primary" : ""
                }`}
                onClick={() => setSelectedSection(sec.section)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{sec.section.replace(/_/g, " ")}</span>
                  <Badge
                    variant={
                      sec.completion_percentage === 100
                        ? "success"
                        : sec.completion_percentage > 50
                        ? "default"
                        : "secondary"
                    }
                  >
                    {sec.completion_percentage}%
                  </Badge>
                </div>
                <Progress value={sec.completion_percentage} className="h-2" />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{sec.completed}/{sec.total} done</span>
                  <span>Conf: {sec.average_confidence}/5</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Section Detail */}
      {selectedSection && sectionItems.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 capitalize">
            {selectedSection.replace(/_/g, " ")} — Items
          </h2>
          <div className="space-y-2">
            {sectionItems.map((item) => (
              <Card key={item.item_id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      defaultValue="not_started"
                      onValueChange={(val) => updateItemProgress(item.item_id, item.section, val, 0)}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        className="w-6 h-6 rounded text-xs border hover:bg-primary hover:text-primary-foreground transition-colors"
                        title={`Confidence: ${n}`}
                        onClick={() => updateItemProgress(item.item_id, item.section, "in_progress", n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
