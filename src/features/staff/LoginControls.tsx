'use client';

import { useActionState } from 'react';
import { Icon } from '@/ui/Icon';
import { IssuedPassword } from './IssuedPassword';
import type { StaffFormState } from './actions';

export function LoginControls({
  username,
  disabled,
  isSelf,
  resetAction,
  toggleAction,
}: {
  username: string;
  disabled: boolean;
  isSelf: boolean;
  resetAction: (state: StaffFormState) => Promise<StaffFormState>;
  toggleAction: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(resetAction, {});
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span className="mono">{username}</span>
        {disabled && <span className="tag tag--bad">Disabled</span>}
      </div>
      {!isSelf && (
        <div style={{ display: 'flex', gap: 6 }} className="nowrap">
          <form action={formAction}>
            <button className="button button--small" type="submit" disabled={pending} title="Issue a new temporary password">
              <Icon name="password" size={13} /> Reset
            </button>
          </form>
          <form action={toggleAction}>
            <button className={disabled ? 'button button--small' : 'button button--small button--danger'} type="submit">
              <Icon name="locked" size={13} /> {disabled ? 'Enable' : 'Disable'}
            </button>
          </form>
        </div>
      )}
      {state.issued && <IssuedPassword issued={state.issued} />}
      {state.error && <span className="field-error">{state.error}</span>}
    </div>
  );
}
