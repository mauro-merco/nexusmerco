'use client';

import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';

export function useInternalUsers(enabled = true) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetch('/api/users')
      .then(response => response.json())
      .then(json => {
        if (!active) return;
        setUsers((json.data || []).filter((user: User) => user.role === 'admin' || user.role === 'operador'));
      })
      .catch(() => {
        if (active) setUsers([]);
      });
    return () => { active = false; };
  }, [enabled]);

  return users;
}
