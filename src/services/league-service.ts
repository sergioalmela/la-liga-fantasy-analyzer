import {ApiResponse, League} from "@/types/api";
import {endpoints, apiClient} from "@/services/api-client";

export class LeagueService {
    async getLeagues(cookie: string): Promise<ApiResponse<League[]>> {
        return apiClient.get<League[]>(endpoints.user.leagues, cookie);
    }
}

export const leagueService = new LeagueService();