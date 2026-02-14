"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { contentApi } from "@/lib/api";
import { InterviewCategory } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  GraduationCap,
  Eye,
  EyeOff,
} from "lucide-react";

// ─── Category icon & color mapping ──────────────────────────

const CATEGORY_META: Record<string, { color: string; icon: string }> = {
  "Core ML": { color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: "🧠" },
  "LLMs & Transformers": { color: "bg-purple-500/10 text-purple-600 border-purple-200", icon: "🤖" },
  "System Design": { color: "bg-orange-500/10 text-orange-600 border-orange-200", icon: "🏗️" },
  "Python & Engineering": { color: "bg-green-500/10 text-green-600 border-green-200", icon: "🐍" },
  "Computer Vision & NLP": { color: "bg-pink-500/10 text-pink-600 border-pink-200", icon: "👁️" },
  "Research Papers": { color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: "📄" },
};

// ─── Question Card Component ─────────────────────────────────

function QuestionCard({
  title,
  subtitle,
  shortAnswer,
  detailedAnswer,
  index,
}: {
  title: string;
  subtitle?: string;
  shortAnswer?: string;
  detailedAnswer?: string;
  index: number;
}) {
  const [showDetailed, setShowDetailed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-muted-foreground/70 shrink-0">
                  Q{index + 1}
                </span>
                {subtitle && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {subtitle}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-sm leading-relaxed font-semibold">
                {title}
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* Short Answer — always visible */}
          {shortAnswer && (
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Short Answer</span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {shortAnswer}
              </p>
            </div>
          )}

          {/* Toggle for detailed answer */}
          {detailedAnswer && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailed(!showDetailed)}
                className="w-full justify-between text-xs text-muted-foreground hover:text-foreground h-8"
              >
                <span className="flex items-center gap-1.5">
                  {showDetailed ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {showDetailed ? "Hide Detailed Answer" : "Show Detailed Answer"}
                </span>
                {showDetailed ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>

              <AnimatePresence>
                {showDetailed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-lg bg-muted/50 border p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground">
                          Detailed Answer
                        </span>
                      </div>
                      <p className="text-sm text-foreground/75 leading-relaxed whitespace-pre-line">
                        {detailedAnswer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Subcategory Section Component ───────────────────────────

function SubcategorySection({
  name,
  items,
  startIndex,
}: {
  name: string;
  items: InterviewCategory["subcategories"][0]["items"];
  startIndex: number;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground">{name}</h3>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {items.length}
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid gap-3">
              {items.map((item, i) => (
                <QuestionCard
                  key={item.item_id}
                  title={item.title}
                  subtitle={item.subtitle}
                  shortAnswer={item.short_answer}
                  detailedAnswer={item.detailed_answer}
                  index={startIndex + i}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function QuestionsPage() {
  const [categories, setCategories] = useState<InterviewCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    contentApi
      .getInterviewQuestions()
      .then((res) => setCategories(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Total question count
  const totalQuestions = useMemo(
    () =>
      categories.reduce(
        (sum, cat) =>
          sum + cat.subcategories.reduce((s, sub) => s + sub.items.length, 0),
        0
      ),
    [categories]
  );

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        subcategories: cat.subcategories
          .map((sub) => ({
            ...sub,
            items: sub.items.filter(
              (item) =>
                item.title.toLowerCase().includes(q) ||
                item.short_answer?.toLowerCase().includes(q) ||
                item.detailed_answer?.toLowerCase().includes(q) ||
                item.subtitle?.toLowerCase().includes(q)
            ),
          }))
          .filter((sub) => sub.items.length > 0),
      }))
      .filter((cat) => cat.subcategories.length > 0);
  }, [categories, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading interview questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Senior Engineer Interview Q&A
        </h1>
        <p className="text-muted-foreground mt-1">
          {totalQuestions} questions across {categories.length} categories — study both short and detailed answers
        </p>
      </div>

      {/* Search & Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions, answers, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpandAll(!expandAll)}
          className="shrink-0"
        >
          {expandAll ? (
            <>
              <EyeOff className="h-4 w-4 mr-1.5" />
              Collapse All
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1.5" />
              Expand All Answers
            </>
          )}
        </Button>
      </div>

      {/* Category Tabs */}
      {filteredCategories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">
              No questions match &ldquo;{searchQuery}&rdquo;
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={filteredCategories[0]?.category} className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1.5 bg-muted/50">
            {filteredCategories.map((cat) => {
              const meta = CATEGORY_META[cat.category] || {
                color: "bg-gray-500/10 text-gray-600",
                icon: "📋",
              };
              const qCount = cat.subcategories.reduce(
                (s, sub) => s + sub.items.length,
                0
              );
              return (
                <TabsTrigger
                  key={cat.category}
                  value={cat.category}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 data-[state=active]:shadow-sm"
                >
                  <span>{meta.icon}</span>
                  <span className="hidden sm:inline">{cat.category}</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1 py-0 min-w-[18px] justify-center"
                  >
                    {qCount}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {filteredCategories.map((cat) => {
            const meta = CATEGORY_META[cat.category] || {
              color: "bg-gray-500/10 text-gray-600 border-gray-200",
              icon: "📋",
            };
            let runningIndex = 0;

            return (
              <TabsContent key={cat.category} value={cat.category}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 mt-4"
                >
                  {/* Category header card */}
                  <div
                    className={`rounded-lg border p-4 ${meta.color}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{meta.icon}</span>
                      <div>
                        <h2 className="text-lg font-bold">{cat.category}</h2>
                        <p className="text-xs opacity-75">
                          {cat.subcategories.reduce(
                            (s, sub) => s + sub.items.length,
                            0
                          )}{" "}
                          questions in {cat.subcategories.length} subcategories
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Subcategories */}
                  {cat.subcategories.map((sub) => {
                    const startIdx = runningIndex;
                    runningIndex += sub.items.length;
                    return (
                      <SubcategorySection
                        key={sub.name}
                        name={sub.name}
                        items={
                          expandAll
                            ? sub.items
                            : sub.items
                        }
                        startIndex={startIdx}
                      />
                    );
                  })}
                </motion.div>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
