import type { ApiResponse } from '../types/api.ts'
import type { FantasyUserProfile } from '../types/dashboard.ts'
import { apiClient, endpoints } from './api-client.ts'
import { parseFantasyUser } from './api-contracts.ts'

export class UserService {
  async getCurrentUser(): Promise<ApiResponse<FantasyUserProfile>> {
    const response = await apiClient.get<unknown>(
      `${endpoints.user.info}?x-lang=es`
    )
    if (response.error || !response.data) {
      return {
        data: null,
        error: response.error || 'Fantasy API returned no user data',
        status: response.status,
      }
    }

    const parsed = parseFantasyUser(response.data)
    return parsed.error
      ? { data: null, error: parsed.error, status: response.status }
      : { data: parsed.data, error: null, status: response.status }
  }
}

export const userService = new UserService()
