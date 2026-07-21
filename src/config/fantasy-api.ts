const configuredCompetitionId =
  process.env.NEXT_PUBLIC_FANTASY_COMPETITION_ID || '1'

export const FANTASY_COMPETITION_ID = /^[A-Za-z0-9_-]+$/.test(
  configuredCompetitionId
)
  ? configuredCompetitionId
  : '1'

export const FANTASY_COMPETITION_PATH = `/v1/competition/${FANTASY_COMPETITION_ID}`
