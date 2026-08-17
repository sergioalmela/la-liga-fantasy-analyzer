import type { ApiResponse } from '@/types/api'
import { apiClient, endpoints } from './api-client.ts'
import type { LineupPayload } from './squad-advisor-service.ts'

export async function applyLineup(
  teamId: string,
  payload: LineupPayload
): Promise<ApiResponse<unknown>> {
  return apiClient.put<unknown>(
    `${endpoints.team.lineup(teamId)}?x-lang=es`,
    payload
  )
}
