export interface FormState {
  error?: string;
  saved?: string;
}

export function formValues(formData: FormData): Record<string, string> {
  return Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v).trim()]));
}
