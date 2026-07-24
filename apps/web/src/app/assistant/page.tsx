'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User } from 'lucide-react';
import { answerEngineeringQuestion } from '@boq/engine';
import type { ChatMessage } from '@boq/shared';
import { useEstimate } from '@/hooks/use-estimate';
import { useProjectStore } from '@/store/project-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatPKR } from '@/lib/format';

const SUGGESTIONS = [
  'What is the current total cost?',
  'Summarize material quantities',
  'Any engineering warnings?',
  'What items might be missing?',
  'Explain how calculations work',
  'Suggest assumptions and exclusions',
];

function uid() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function AssistantPage() {
  const estimate = useEstimate();
  const project = useProjectStore((s) => s.project);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'I am the BOQ Pro engineering assistant. Ask about costs, materials, warnings, missing items, or calculation methods. Answers are rule-based from your current estimate — not invented quantities.',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function ask(question: string) {
    const q = question.trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: q,
      createdAt: new Date().toISOString(),
    };

    const answer = answerEngineeringQuestion(q, {
      entryCount: project.entries.length,
      grandTotal: estimate.costs.grandTotal,
      materialCost: estimate.costs.material,
      labourCost: estimate.costs.labour,
      equipmentCost: estimate.costs.equipment,
      warnings: estimate.warnings,
      topMaterials: estimate.materials
        .slice()
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .map((m) => ({
          name: m.name,
          quantity: m.quantity,
          unit: m.unit,
        })),
    });

    const botMsg: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: answer,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
          Engineering AI
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold">Assistant</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Context: {project.entries.length} entries · {formatPKR(estimate.costs.grandTotal)}
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  m.role === 'assistant'
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                    : 'bg-[var(--muted)] text-[var(--foreground)]'
                }`}
              >
                {m.role === 'assistant' ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                    : 'bg-[var(--muted)]/60'
                }`}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </CardContent>

        <div className="border-t border-[var(--border)] p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <Textarea
              rows={2}
              placeholder="Ask about costs, materials, warnings…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              className="min-h-[44px] resize-none"
            />
            <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
