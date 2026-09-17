import type { ReactNode } from "react";
import { ButtonLink } from "./button-link";

interface ClosingCallProps {
  id: string;
  title: ReactNode;
  text: ReactNode;
  /** Die erste Aktion ist die Primary-Schaltfläche, weitere stehen als Outline daneben. */
  actions: { href: string; label: string }[];
}

/**
 * Schlussaufruf: volle orange Druckfläche am Seitenende, Tinte darauf, auch im
 * Nachtdruck. Ein bewusster Blickfang — höchstens einmal pro Seite und immer
 * als letzter Abschnitt vor der Fußzeile.
 */
export function ClosingCall({ id, title, text, actions }: ClosingCallProps) {
  const [first, ...rest] = actions;

  return (
    <section aria-labelledby={id} className="on-orange bg-primary text-ink">
      <div className="sheet py-16 md:py-24 lg:grid lg:grid-cols-12 lg:gap-10">
        <h2
          id={id}
          className="condensed text-[clamp(2.5rem,6vw,5.25rem)] leading-[0.9] font-extrabold text-balance lg:col-span-6"
        >
          {title}
        </h2>
        <div className="mt-6 lg:col-span-5 lg:col-start-8 lg:mt-0 lg:self-end">
          <p className="max-w-[40ch] text-xl leading-relaxed">{text}</p>
          {first && rest.length === 0 ? (
            <ButtonLink href={first.href} surface="orange" className="mt-8">
              {first.label}
            </ButtonLink>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              {actions.map((action, index) => (
                <ButtonLink
                  key={action.href}
                  href={action.href}
                  variant={index === 0 ? "primary" : "outline"}
                  surface="orange"
                >
                  {action.label}
                </ButtonLink>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
