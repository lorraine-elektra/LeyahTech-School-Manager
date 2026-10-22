import type { ReactNode } from 'react';

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'accent';

export function Tag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={tone === 'neutral' ? 'tag' : `tag tag--${tone}`}>{children}</span>;
}
