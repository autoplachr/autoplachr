"use client";

import { BarChart3 } from "lucide-react";
import { euro } from "./catalog";
import type { MarketValuationResult } from "../src/lib/price-engine";

export function ValuationAuditPanel({
  result,
  id,
}: {
  result: MarketValuationResult;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="detail-panel flex flex-col gap-3 min-w-0"
      aria-label="Detaljna analiza svih parametara procjene"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 size={18} className="text-[var(--accent)] shrink-0" aria-hidden="true" />
          <h2 className="!m-0 text-[16px] font-bold text-[var(--text)]">
            Zašto je ovakva procjena? (Detaljna analiza svih parametara)
          </h2>
        </div>
        <span className="text-[12px] font-medium text-[var(--muted)] tabular-nums">
          {result.auditFactors.length} analiziranih parametara · Medijan:{" "}
          <strong className="text-[var(--text)] !m-0">{euro(result.medianMarketPrice)}</strong>
        </span>
      </div>

      <div className="divide-y divide-slate-200/75 dark:divide-zinc-800/80">
        {result.auditFactors.map(factor => {
          const isBase = factor.id === "audit-base";
          const impactText = isBase
            ? euro(factor.impactEur)
            : factor.impactEur > 0
            ? `+${euro(factor.impactEur)}`
            : factor.impactEur < 0
            ? `-${euro(Math.abs(factor.impactEur))}`
            : "0 €";
          const impactTone = isBase
            ? "text-[var(--text)]"
            : factor.impactEur > 0
            ? "text-emerald-700 dark:text-emerald-400"
            : factor.impactEur < 0
            ? "text-amber-700 dark:text-amber-400"
            : "text-[var(--muted)]";

          return (
            <div
              key={factor.id}
              className="py-2.5 first:pt-1 last:pb-1 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-2 md:gap-4 items-start"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-semibold border-[var(--border)] bg-[var(--hover)] text-[var(--spec)]`}
                  >
                    {factor.category}
                  </span>
                  <span className="text-[13.5px] font-semibold text-[var(--text)]">
                    {factor.parameterLabel}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--muted)] mt-1 leading-relaxed">
                  {factor.explanation}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11.5px] text-[var(--spec)] tabular-nums">
                  <span>
                    <strong className="!m-0 font-semibold text-[var(--text)]">Vozilo:</strong>{" "}
                    {factor.userValue}
                  </span>
                  <span className="text-[var(--muted)]">•</span>
                  <span>
                    <strong className="!m-0 font-semibold text-[var(--text)]">Referenca:</strong>{" "}
                    {factor.benchmarkValue}
                  </span>
                </div>
              </div>
              <div className={`text-[14px] font-bold tabular-nums md:text-right shrink-0 ${impactTone}`}>
                {impactText}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[var(--border)] bg-[var(--hover)] -mx-1 px-3 py-2 rounded-md">
        <span className="text-[13px] font-semibold text-[var(--text)]">
          Ukupna procijenjena tržišna vrijednost u RH
        </span>
        <strong className="text-[16px] font-bold tabular-nums text-[var(--text)] !m-0">
          {euro(result.medianMarketPrice)}
        </strong>
      </div>
    </section>
  );
}
