import {ApiResponse, Team} from "@/types/api";
import {endpoints} from "@/lib/api";
import {apiClient} from "@/services/api-client";
import {PlayerMapper} from "@/mappers/player-mapper";
import {Player} from "@/entities/player";

export class TeamService {
    async getPlayers(cookie: string, leagueId: string, teamId: string): Promise<ApiResponse<Player[]>> {
        const url = `${endpoints.league.team(leagueId, teamId)}?x-lang=es`;

        const result = await apiClient.get<Team>(url, cookie);

        if (result.data) {
            const players = result.data.players.map(PlayerMapper.fromTeamPlayer);
            return { data: players, error: null };
        }

        return { data: [], error: result.error };

    }
}

export const teamService = new TeamService();