export const MIN_PASSWORD_LENGTH = 8;

export function passwordProblem(password: string, username: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.toLowerCase().includes(username.toLowerCase())) return 'The password cannot contain your username.';
  if (/^(.)\1+$/.test(password) || /^(12345678|password|qwertyui)/i.test(password)) return 'This password is too easy to guess. Use a mix of words and numbers.';
  return undefined;
}
