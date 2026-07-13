/** Bare domain of an email address, e.g. "a@iitm.ac.in" -> "iitm.ac.in". */
export function domainOf(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}
