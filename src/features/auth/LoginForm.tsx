'use client';

import { useActionState } from 'react';
import { signIn, type SignInState } from './actions';

interface DemoAccount {
  username: string;
  name: string;
  role: string;
}

export function LoginForm({ schoolSlug, demoAccounts, demoPassword }: { schoolSlug: string; demoAccounts: DemoAccount[]; demoPassword?: string }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {});

  function fillDemo(username: string) {
    const form = document.getElementById('sign-in') as HTMLFormElement;
    (form.elements.namedItem('username') as HTMLInputElement).value = username;
    (form.elements.namedItem('password') as HTMLInputElement).value = demoPassword ?? '';
  }

  return (
    <>
      <form id="sign-in" action={formAction} className="panel login__form">
        <input type="hidden" name="school" value={schoolSlug} />
        <label className="field">
          <span>Username</span>
          <input name="username" defaultValue={state.username} autoComplete="username" autoFocus required />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {state.error && <div className="notice notice--error">{state.error}</div>}
        <button className="button button--primary" type="submit" disabled={pending}>
          {pending ? 'Signing in' : 'Sign in'}
        </button>
      </form>

      {demoAccounts.length > 0 && (
        <div className="section">
          <div className="section__header">
            <h3>Demo accounts</h3>
            <span className="muted">
              Password <span className="mono">{demoPassword}</span>
            </span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {demoAccounts.map((account) => (
                  <tr key={account.username}>
                    <td>
                      <button type="button" className="button button--small" onClick={() => fillDemo(account.username)}>
                        Use
                      </button>
                    </td>
                    <td className="mono">{account.username}</td>
                    <td>{account.name}</td>
                    <td className="muted">{account.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
