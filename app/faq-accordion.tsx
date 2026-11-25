"use client";

import { ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";
import { SEO_FAQS } from "../src/lib/seo";

export function FaqAccordion({ title = "Česta pitanja (FAQ)" }: { title?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="detail-panel rounded-xl flex flex-col gap-3 min-w-0" aria-label={title}>
      <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
        <HelpCircle size={18} className="text-[#2563EB] shrink-0" aria-hidden="true" />
        <h2 className="!m-0 text-[16px] font-bold text-[var(--text)]">{title}</h2>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {SEO_FAQS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={item.question} className="py-2.5 first:pt-1 last:pb-1">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full flex items-center justify-between gap-3 text-left font-semibold text-[13.5px] text-[var(--text)] hover:text-[#2563EB] transition-colors"
              >
                <span>{item.question}</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-[var(--muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)] !m-0 pt-1">
                  {item.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
