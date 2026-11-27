"use client";

import { Check, Scale, X } from "lucide-react";
import { euro, marketValuation, number, power, registered, taxStatus, type Vehicle } from "./catalog";
import { Dialog, Rating, VehiclePhoto } from "./ui";

export function ComparisonModal({
  vehicles,
  onClose,
  onOpenListing,
}: {
  vehicles: Vehicle[];
  onClose: () => void;
  onOpenListing: (id: string) => void;
}) {
  if (!vehicles.length) return null;

  const valuations = vehicles.map(v => marketValuation(v));

  const rows: Array<{
    label: string;
    render: (v: Vehicle, idx: number) => React.ReactNode;
  }> = [
    {
      label: "Cijena",
      render: v => <strong className="tabular-nums text-[15px] text-[var(--text)]">{euro(v.price)}</strong>,
    },
    {
      label: "Tržišna ocjena u RH",
      render: (_, idx) => <Rating valuation={valuations[idx]} align="left" interactive={false} />,
    },
    {
      label: "Prva registracija",
      render: v => <span className="tabular-nums">{registered(v.date)}</span>,
    },
    {
      label: "Kilometraža",
      render: v => <span className="tabular-nums">{number(v.km)} km</span>,
    },
    {
      label: "Snaga motora",
      render: v => <span className="tabular-nums">{power(v.kw)}</span>,
    },
    {
      label: "Gorivo / Mjenjač",
      render: v => `${v.fuel} · ${v.gear}`,
    },
    {
      label: "Pogon / Karoserija",
      render: v => [v.drive, v.bodyType].filter(Boolean).join(" · ") || "—",
    },
    {
      label: "CO₂ emisija",
      render: v => <span className="tabular-nums">{v.co2} g/km</span>,
    },
    {
      label: "Lokacija",
      render: v => v.city,
    },
    {
      label: "Status poreza",
      render: v => taxStatus(v),
    },
    {
      label: "Prodavač",
      render: v => (
        <span className="inline-flex items-center gap-1">
          {v.seller || "Privatni prodavač"}
          {v.verified && <Check size={13} className="text-[var(--accent)]" aria-label="Verificirano" />}
        </span>
      ),
    },
  ];

  return (
    <Dialog title={`Usporedba vozila (${vehicles.length})`} eyebrow="Favoriti" onClose={onClose} variant="form-dialog max-w-[920px] w-[min(96vw,920px)]">
      <div className="dialog-content flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[12.5px] text-[var(--muted)]">
          <Scale size={15} className="text-[var(--accent)] shrink-0" aria-hidden="true" />
          <span>Usporedite ključne tehničke podatke, cijenu i tržišnu procjenu u RH.</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 pr-3 text-left font-semibold text-[var(--muted)] w-[160px] align-bottom">Parametar</th>
                {vehicles.map(v => (
                  <th key={v.id} className="py-2 px-2 text-left align-top min-w-[200px]">
                    <div className="flex flex-col gap-2">
                      <div className="w-full aspect-[16/10] rounded-md overflow-hidden border border-[var(--border)]">
                        <VehiclePhoto photo={v.photos[0]} alt={v.title} />
                      </div>
                      <button
                        type="button"
                        className="text-left font-bold text-[13.5px] leading-snug text-[var(--text)] hover:text-[var(--accent)] hover:underline"
                        onClick={() => {
                          onClose();
                          onOpenListing(v.id);
                        }}
                      >
                        {v.title}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map(row => (
                <tr key={row.label}>
                  <td className="py-2.5 pr-3 font-medium text-[var(--muted)] align-top">{row.label}</td>
                  {vehicles.map((v, idx) => (
                    <td key={v.id} className="py-2.5 px-2 text-[var(--spec)] align-top">
                      {row.render(v, idx)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2 border-t border-[var(--border)]">
          <button type="button" className="btn secondary" onClick={onClose}>
            <X size={15} /> Zatvori usporedbu
          </button>
        </div>
      </div>
    </Dialog>
  );
}
