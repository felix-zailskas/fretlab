import { useId, type ReactNode } from "react";

type TooltipProps = {
  tip: string;
  // Renders the control; wire the id into its aria-describedby.
  children: (describedBy: string) => ReactNode;
};

// Styled tooltip shown above a control on hover and keyboard focus, without
// the native title's delay. The tip doubles as the control's description.
export function Tooltip({ tip, children }: TooltipProps) {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      {children(id)}
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 motion-safe:transition-opacity absolute left-0 bottom-full mb-2 z-20 w-max max-w-60 rounded-md bg-fg-primary text-surface text-xs font-normal leading-snug px-2.5 py-2 shadow-lg"
      >
        {tip}
      </span>
    </span>
  );
}
