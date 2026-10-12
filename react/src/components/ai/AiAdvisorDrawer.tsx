import React, { useEffect, useRef } from 'react';
import { X, Sparkles, Info } from 'lucide-react';
import { AIAssistViewComponent, type PromptRequestEventArgs } from '@syncfusion/ej2-react-interactive-chat';
import { MarkdownConverter } from '@syncfusion/ej2-markdown-converter';
import { runAdvisorQuery } from '@/services/aiAdvisor';

// The sample advisor's chat is Syncfusion AI AssistView. The view only collects
// prompts and shows answers; runAdvisorQuery stays the provider. Its styles come with the Tailwind 3
// theme bundle, which @imports ai-assistview.css.

interface AiAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// The questions the local engine answers specifically; anything else gets the portfolio snapshot.
const SUGGESTED_PROMPTS = [
  'Which inspections are overdue?',
  'What leases are expiring soon?',
  'Summarize the acquisition pipeline',
  'Which properties have occupancy risk?'
];

// The engine answers in Markdown built from session data. Escape angle brackets first so a name in
// the data can never become markup, then convert to the HTML AI AssistView renders.
function toResponseHtml(markdown: string): string {
  return MarkdownConverter.toHtml(markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')) as string;
}

export const AiAdvisorDrawer: React.FC<AiAdvisorDrawerProps> = ({ isOpen, onClose }) => {
  const assist = useRef<AIAssistViewComponent>(null);
  const pending = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(pending.current); // drop an answer still on its way when the drawer closes
    };
  }, [isOpen, onClose]);

  const onPromptRequest = (args: PromptRequestEventArgs) => {
    window.clearTimeout(pending.current);
    const prompt = args.prompt ?? '';
    // A short pause so the answer reads as a reply; the engine itself is synchronous and local.
    pending.current = window.setTimeout(() => {
      assist.current?.addPromptResponse(toResponseHtml(runAdvisorQuery(prompt).markdown));
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[1100]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="Sample AI Advisor"
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[var(--app-card-bg)] border-l border-[var(--app-card-border)] z-[1101] flex flex-col shadow-2xl"
      >
        <div className="px-5 py-4 border-b border-[var(--app-card-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--color-sf-fg-brand-primary)]" aria-hidden="true" />
            <h2 className="font-semibold text-sm text-[var(--color-sf-fg-primary)]">Sample AI Advisor</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--color-sf-bg-surface-hover)] text-[var(--color-sf-fg-secondary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus-ring)]"
            aria-label="Close AI advisor"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-3 bg-[var(--color-sf-bg-warning-primary)] border-b border-[var(--app-card-border)] flex items-start gap-2">
          <Info size={14} className="text-[var(--color-sf-fg-warning-primary)] mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-xs text-[var(--color-sf-fg-warning-primary)] leading-snug">
            <strong>Local Sample AI Engine</strong> — Evaluated on Current Session State. No external network calls; not a production AI model.
          </p>
        </div>

        {/* The view fills the rest of the drawer and scrolls its conversation inside. */}
        <div className="flex-1 min-h-0">
          <AIAssistViewComponent
            id="sample-ai-advisor"
            ref={assist}
            height="100%"
            showHeader={false}
            promptPlaceholder="Ask about the portfolio..."
            promptSuggestions={SUGGESTED_PROMPTS}
            promptSuggestionsHeader="Try asking"
            promptRequest={onPromptRequest}
          />
        </div>
      </div>
    </>
  );
};
