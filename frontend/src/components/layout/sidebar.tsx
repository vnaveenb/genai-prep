"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  HelpCircle,
  Layers,
  TrendingUp,
  Calendar,
  MessageSquare,
  BookmarkIcon,
  Settings,
  ChevronLeft,
  ChevronRight,
  Brain,
  GraduationCap,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/questions", label: "Interview Q&A", icon: GraduationCap },
  { href: "/quiz", label: "Quiz Mode", icon: HelpCircle },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/study-plan", label: "Study Plan", icon: Calendar },
  { href: "/interview", label: "Mock Interview", icon: MessageSquare },
  { href: "/notes", label: "Notes & Bookmarks", icon: BookmarkIcon },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <Brain className="h-8 w-8 text-primary shrink-0" />
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="text-lg font-bold text-foreground">GenAI Prep</h1>
            <p className="text-[10px] text-muted-foreground">Senior Engineer Interview</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  );
}
