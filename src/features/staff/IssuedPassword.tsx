export function IssuedPassword({ issued }: { issued: { name: string; username: string; password: string } }) {
  return (
    <div className="notice notice--success" style={{ display: 'block' }}>
      <strong>Login ready for {issued.name}.</strong> Username <span className="mono">{issued.username}</span>, temporary password{' '}
      <span className="mono" style={{ fontSize: 15 }}>
        {issued.password}
      </span>
      . Give these to them in person. They will be asked to choose their own password when they first sign in. This password is not shown again.
    </div>
  );
}
