'use client';
export function getUserId(): string {
  let id = localStorage.getItem('userId');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('userId', id); }
  return id;
}
