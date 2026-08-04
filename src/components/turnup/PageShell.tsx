import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { TopBar } from "./TopBar";

export function PageShell({
  children,
  title,
  eyebrow,
  lead,
}: {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  lead?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-8 md:px-6">
        {title && (
          <div className="py-8 md:py-12">
            {eyebrow && <p className="section-chip mb-4">{eyebrow}</p>}
            <h1 className="font-display text-3xl font-bold uppercase md:text-5xl">{title}</h1>
            {lead && (
              <p className="mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">{lead}</p>
            )}
          </div>
        )}
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
