"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { contentApi, quizApi } from "@/lib/api";
import type { ContentSection, QuizQuestion, QuizResult } from "@/lib/types";
import { CheckCircle, XCircle, ArrowRight, RotateCcw, Trophy } from "lucide-react";

export default function QuizPage() {
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [questionCount, setQuestionCount] = useState("5");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>[]>([]);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [phase, setPhase] = useState<"setup" | "quiz" | "review">("setup");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    contentApi.getSections().then((res) => setSections(res.data)).catch(() => {});
  }, []);

  const startQuiz = async () => {
    if (!selectedSection) return;
    setLoading(true);
    try {
      const res = await quizApi.generate({ section: selectedSection, count: parseInt(questionCount) });
      setQuestions(res.data);
      setCurrentIndex(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setShowResult(false);
      setQuizResult(null);
      setPhase("quiz");
    } catch (e) {
      console.error("Failed to generate quiz", e);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = () => {
    const current = questions[currentIndex];
    setShowResult(true);
    setAnswers((prev) => [
      ...prev,
      {
        question: current.question,
        question_id: current.question_id,
        selected_answer: selectedAnswer,
        correct_answer: current.correct_answer,
        options: current.options,
        explanation: current.explanation,
        section: current.section,
        topic: current.topic,
        question_type: current.question_type,
      },
    ]);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const sessionId = `quiz_${Date.now()}`;
    try {
      const res = await quizApi.submit(sessionId, answers);
      setQuizResult(res.data);
      setPhase("review");
    } catch {
      // Still show results locally
      const correct = answers.filter((a) => a.selected_answer === a.correct_answer).length;
      setQuizResult({
        session_id: sessionId,
        total_questions: answers.length,
        correct_answers: correct,
        score_percentage: Math.round((correct / answers.length) * 100),
        results: answers.map((a) => ({
          question: a.question as string,
          selected_answer: a.selected_answer as string,
          correct_answer: a.correct_answer as string,
          is_correct: a.selected_answer === a.correct_answer,
          explanation: a.explanation as string,
        })),
      });
      setPhase("review");
    }
  };

  const currentQuestion = questions[currentIndex];

  if (phase === "setup") {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quiz Mode</h1>
          <p className="text-muted-foreground mt-1">Test your knowledge across different topics</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configure Quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Section</label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.section_key} value={s.section_key}>
                      {s.title} ({s.item_count} items)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Number of Questions</label>
              <Select value={questionCount} onValueChange={setQuestionCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["3", "5", "10", "15"].map((n) => (
                    <SelectItem key={n} value={n}>{n} questions</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={startQuiz} disabled={!selectedSection || loading} className="w-full">
              {loading ? "Generating..." : "Start Quiz"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "review" && quizResult) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quiz Results</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <CardTitle className="text-2xl">
                  {quizResult.correct_answers}/{quizResult.total_questions} Correct
                </CardTitle>
                <p className="text-muted-foreground">Score: {quizResult.score_percentage}%</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {quizResult.results.map((r, i) => (
              <div key={i} className={`p-4 rounded-lg border ${r.is_correct ? "border-green-500/50 bg-green-500/10" : "border-red-500/50 bg-red-500/10"}`}>
                <div className="flex items-start gap-2">
                  {r.is_correct ? <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" /> : <XCircle className="h-5 w-5 text-red-500 mt-0.5" />}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{r.question}</p>
                    {!r.is_correct && (
                      <p className="text-sm mt-1"><span className="text-red-400">Your answer:</span> {r.selected_answer}</p>
                    )}
                    <p className="text-sm mt-1"><span className="text-green-400">Correct:</span> {r.correct_answer}</p>
                    {r.explanation && <p className="text-xs text-muted-foreground mt-2">{r.explanation}</p>}
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={() => setPhase("setup")} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" /> Take Another Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz phase
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quiz</h1>
          <p className="text-muted-foreground">Question {currentIndex + 1} of {questions.length}</p>
        </div>
        <Badge variant="outline">
          {answers.filter((a) => a.selected_answer === a.correct_answer).length}/{answers.length} correct
        </Badge>
      </div>

      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{currentQuestion.section.replace(/_/g, " ")}</Badge>
              {currentQuestion.topic && <Badge variant="outline">{currentQuestion.topic}</Badge>}
            </div>
            <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentQuestion.options ? (
              currentQuestion.options.map((option, i) => {
                let optionClass = "p-3 rounded-lg border cursor-pointer transition-colors ";
                if (showResult) {
                  if (option === currentQuestion.correct_answer) {
                    optionClass += "border-green-500 bg-green-500/10";
                  } else if (option === selectedAnswer && option !== currentQuestion.correct_answer) {
                    optionClass += "border-red-500 bg-red-500/10";
                  } else {
                    optionClass += "border-muted opacity-50";
                  }
                } else {
                  optionClass += selectedAnswer === option
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:border-primary/50";
                }
                return (
                  <div
                    key={i}
                    className={optionClass}
                    onClick={() => !showResult && setSelectedAnswer(option)}
                  >
                    <span className="text-sm">{option}</span>
                  </div>
                );
              })
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Open-ended question — self-evaluate your answer</p>
                <textarea
                  className="w-full min-h-[100px] p-3 rounded-lg border bg-transparent text-sm"
                  placeholder="Type your answer..."
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  disabled={showResult}
                />
              </div>
            )}

            {showResult && currentQuestion.explanation && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm"><strong>Explanation:</strong> {currentQuestion.explanation}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {!showResult ? (
                <Button onClick={submitAnswer} disabled={!selectedAnswer} className="flex-1">
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={nextQuestion} className="flex-1">
                  {currentIndex < questions.length - 1 ? (
                    <>Next Question <ArrowRight className="h-4 w-4 ml-1" /></>
                  ) : (
                    <>Finish Quiz <Trophy className="h-4 w-4 ml-1" /></>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
