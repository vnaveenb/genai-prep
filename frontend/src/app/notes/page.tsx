"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notesApi, contentApi } from "@/lib/api";
import type { Note, ContentSection } from "@/lib/types";
import {
  Bookmark,
  BookmarkCheck,
  Search,
  Plus,
  Trash2,
  Save,
  StickyNote,
  Filter,
} from "lucide-react";

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [sections, setSections] = useState<ContentSection[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSection, setFilterSection] = useState<string>("all");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  // Editor
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  // New note
  const [showNewForm, setShowNewForm] = useState(false);
  const [newItemId, setNewItemId] = useState("");
  const [newSection, setNewSection] = useState("");
  const [newContent, setNewContent] = useState("");

  const fetchNotes = useCallback(async () => {
    try {
      const res = await notesApi.list(
        filterSection !== "all" ? filterSection : undefined,
        bookmarkedOnly || undefined,
        searchQuery || undefined
      );
      setNotes(res.data);
    } catch {
      setNotes([]);
    }
  }, [filterSection, bookmarkedOnly, searchQuery]);

  useEffect(() => {
    contentApi
      .getSections()
      .then((res) => setSections(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotes().finally(() => setLoading(false));
  }, [fetchNotes]);

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setEditContent(note.content || "");
  };

  const saveNote = async () => {
    if (!selectedNote) return;
    setSaving(true);
    try {
      await notesApi.update(selectedNote.item_id, { content: editContent });
      await fetchNotes();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleBookmark = async (note: Note) => {
    try {
      await notesApi.toggleBookmark(note.item_id, note.section);
      await fetchNotes();
      if (selectedNote?.item_id === note.item_id) {
        setSelectedNote({ ...selectedNote, is_bookmarked: !note.is_bookmarked });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNote = async (itemId: string) => {
    try {
      await notesApi.delete(itemId);
      if (selectedNote?.item_id === itemId) {
        setSelectedNote(null);
        setEditContent("");
      }
      await fetchNotes();
    } catch (e) {
      console.error(e);
    }
  };

  const createNote = async () => {
    if (!newItemId || !newSection) return;
    try {
      await notesApi.createOrUpdate({
        item_id: newItemId,
        section: newSection,
        content: newContent,
      });
      setShowNewForm(false);
      setNewItemId("");
      setNewSection("");
      setNewContent("");
      await fetchNotes();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notes & Bookmarks</h1>
          <p className="text-muted-foreground mt-1">
            Capture insights and bookmark important topics
          </p>
        </div>
        <Button onClick={() => setShowNewForm(!showNewForm)} className="gap-2">
          <Plus className="h-4 w-4" /> New Note
        </Button>
      </div>

      {/* New Note Form */}
      {showNewForm && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Section</label>
                <Select value={newSection} onValueChange={setNewSection}>
                  <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.section_key} value={s.section_key}>
                        {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Item ID</label>
                <Input
                  value={newItemId}
                  onChange={(e) => setNewItemId(e.target.value)}
                  placeholder="e.g. research_papers:1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Content</label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write your note here (Markdown supported)..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createNote} disabled={!newItemId || !newSection} className="gap-2">
                <Save className="h-4 w-4" /> Save Note
              </Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="pl-9"
          />
        </div>
        <Select value={filterSection} onValueChange={setFilterSection}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s.section_key} value={s.section_key}>
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={bookmarkedOnly ? "default" : "outline"}
          onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
          className="gap-2"
        >
          <BookmarkCheck className="h-4 w-4" />
          Bookmarked
        </Button>
      </div>

      {/* Notes List + Editor */}
      <div className="grid gap-4 lg:grid-cols-[350px_1fr]">
        {/* Notes sidebar */}
        <div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto">
          {notes.length === 0 && !loading && (
            <Card className="p-6 text-center text-muted-foreground">
              <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No notes yet. Create one to get started!
            </Card>
          )}
          {notes.map((note) => (
            <Card
              key={note.item_id}
              className={`p-3 cursor-pointer transition-colors hover:border-primary/50 ${
                selectedNote?.item_id === note.item_id ? "border-primary" : ""
              }`}
              onClick={() => selectNote(note)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{note.item_id}</p>
                  <Badge variant="secondary" className="text-xs mt-1 capitalize">
                    {note.section.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(note);
                    }}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    {note.is_bookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <Bookmark className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.item_id);
                    }}
                    className="p-1 rounded hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
              {note.content && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {note.content}
                </p>
              )}
            </Card>
          ))}
        </div>

        {/* Editor */}
        <Card className="min-h-[400px]">
          {selectedNote ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedNote.item_id}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="capitalize">
                        {selectedNote.section.replace(/_/g, " ")}
                      </Badge>
                      {selectedNote.is_bookmarked && (
                        <Badge variant="default" className="gap-1">
                          <BookmarkCheck className="h-3 w-3" /> Bookmarked
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button onClick={saveNote} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Write your notes here... (Markdown supported)"
                  className="min-h-[350px] font-mono text-sm resize-y"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Last updated: {new Date(selectedNote.updated_at).toLocaleString()}
                </p>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <StickyNote className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select a note to edit</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
