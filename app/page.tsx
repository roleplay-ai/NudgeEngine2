import { redirect } from 'next/navigation';

// Root "/" is handled by middleware:
// - Unauthenticated → /login
// - Authenticated   → role-based home
// This file is a fallback only.
export default function RootPage() {
  redirect('/login');
}
