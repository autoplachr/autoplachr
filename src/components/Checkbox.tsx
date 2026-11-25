import { Check } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

export function Checkbox(props: Omit<ComponentPropsWithoutRef<"input">, "type">) {
  return <span className="precision-checkbox">
    <input {...props} type="checkbox" />
    <Check size={14} strokeWidth={2.5} aria-hidden="true" />
  </span>;
}
