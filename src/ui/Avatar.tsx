// Muted pairs that stay readable on white; the same name always gets the same colour.
const palette: [string, string][] = [
  ['#e3efe9', '#1f5c4a'],
  ['#e4ebf4', '#2c4f7c'],
  ['#f3e7dc', '#7a4a22'],
  ['#ece6f2', '#5a3f7a'],
  ['#f4e3e3', '#8a3434'],
  ['#e5eef0', '#2d5f66'],
  ['#efeadb', '#665521'],
];

export function initials(name: string): string {
  const words = name.replace(/^(Mr|Mrs|Ms|Madam|Dr|Rev)\.?\s+/i, '').split(/[\s,]+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
}

function colourFor(name: string): [string, string] {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export function Avatar({ name, size }: { name: string; size?: 'small' | 'large' }) {
  const [bg, ink] = colourFor(name);
  return (
    <span
      className={size ? `avatar avatar--${size}` : 'avatar'}
      style={{ ['--avatar-bg' as string]: bg, ['--avatar-ink' as string]: ink }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
