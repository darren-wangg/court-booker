'use client'

import { useQuery } from '@tanstack/react-query'

export interface User {
  id: number;
  email: string;
}

interface UsersResponse {
  success: boolean;
  data: User[];
  error?: string;
}

async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users')
  const result: UsersResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch users')
  }

  return result.data
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes - users don't change often
  })
}
