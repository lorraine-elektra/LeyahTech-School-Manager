import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="login">
      <div className="panel panel--padded" style={{ maxWidth: 420 }}>
        <p>This page does not exist, or your account cannot open it.</p>
        <p style={{ marginTop: 8 }}>
          <Link href="/">Go to sign-in</Link>
        </p>
      </div>
    </div>
  );
}
