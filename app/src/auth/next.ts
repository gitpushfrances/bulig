// Where to go after signing in (`?next=`). Only a page inside the app, never another site.
export function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null
}
