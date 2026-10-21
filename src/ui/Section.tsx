import type { ReactNode } from 'react';

export function Section({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section__header">
        <h2>{title}</h2>
        {aside && <div className="muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
