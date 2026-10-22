import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function Section({ title, icon, aside, children }: { title: ReactNode; icon?: IconName; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section__header">
        <h2>
          {icon && <Icon name={icon} />}
          {title}
        </h2>
        {aside && <div className="muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
