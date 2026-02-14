"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { contentApi } from "@/lib/api";
import type { ContentSection, FlashCard } from "@/lib/types";
import { RotateCcw, ChevronLeft, ChevronRight, Check, X, Shuffle } from "lucide-react";

export default function FlashcardsPage() {
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [review, setReview] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentApi.getSections().then((res) => setSections(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const section = selectedSection === "all" ? undefined : selectedSection;
    contentApi.getFlashcards(section)
      .then((res) => {
        setCards(res.data);
        setCurrentIndex(0);
        setIsFlipped(false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedSection]);

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;

  const goNext = () => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  const markKnown = () => {
    if (currentCard) {
      setKnown((prev) => new Set(prev).add(currentCard.item_id));
      review.delete(currentCard.item_id);
      setReview(new Set(review));
    }
    goNext();
  };

  const markReview = () => {
    if (currentCard) {
      setReview((prev) => new Set(prev).add(currentCard.item_id));
      known.delete(currentCard.item_id);
      setKnown(new Set(known));
    }
    goNext();
  };

  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const resetProgress = () => {
    setKnown(new Set());
    setReview(new Set());
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Flashcards</h1>
        <p className="text-muted-foreground mt-1">Review concepts with interactive flip cards</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={selectedSection} onValueChange={setSelectedSection}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s.section_key} value={s.section_key}>
                {s.title} ({s.item_count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={shuffleCards}>
          <Shuffle className="h-4 w-4 mr-1" /> Shuffle
        </Button>
        <Button variant="outline" size="sm" onClick={resetProgress}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reset
        </Button>

        <div className="flex gap-2 ml-auto">
          <Badge variant="success">{known.size} known</Badge>
          <Badge variant="destructive">{review.size} review</Badge>
          <Badge variant="outline">{totalCards - known.size - review.size} remaining</Badge>
        </div>
      </div>

      {/* Flashcard */}
      {!loading && currentCard && (
        <div className="flex flex-col items-center">
          <p className="text-sm text-muted-foreground mb-4">
            Card {currentIndex + 1} of {totalCards}
          </p>

          <div
            className="w-full max-w-lg cursor-pointer perspective-1000"
            onClick={() => setIsFlipped(!isFlipped)}
            style={{ perspective: "1000px" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isFlipped ? "back" : "front"}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={`min-h-[280px] flex flex-col justify-center ${isFlipped ? "bg-primary/5 border-primary/30" : ""}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{currentCard.category}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {isFlipped ? "ANSWER" : "QUESTION"} — click to flip
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex items-center justify-center">
                    <p className={`text-center ${isFlipped ? "text-base" : "text-lg font-semibold"}`}>
                      {isFlipped ? currentCard.back : currentCard.front}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-6">
            <Button variant="outline" onClick={goPrev} disabled={currentIndex === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={markReview}>
              <X className="h-4 w-4 mr-1" /> Review Again
            </Button>
            <Button variant="default" size="sm" onClick={markKnown} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-1" /> Know It
            </Button>
            <Button variant="outline" onClick={goNext} disabled={currentIndex === totalCards - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {!loading && cards.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No flashcards found for this section. Try selecting a different one.</p>
        </Card>
      )}
    </div>
  );
}
