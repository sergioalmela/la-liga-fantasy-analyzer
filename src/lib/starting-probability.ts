export const STARTING_PROBABILITY_SOURCE = 'FútbolFantasy'

export interface StartingProbability {
  probability: number
  sourceName: typeof STARTING_PROBABILITY_SOURCE
  sourceUrl: string
}

export interface StartingProbabilityRequestPlayer {
  id: string
  name: string
  nickname?: string
  teamId: string
  marketValue: number
}

export interface SourceStartingProbability {
  sourcePlayerId: string
  name: string
  slug: string
  probability: number
  marketValue: number | null
  sourceUrl: string
}

function decodeHtml(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    Aacute: 'Á',
    aacute: 'á',
    Eacute: 'É',
    eacute: 'é',
    Iacute: 'Í',
    iacute: 'í',
    Ntilde: 'Ñ',
    ntilde: 'ñ',
    Oacute: 'Ó',
    oacute: 'ó',
    Uacute: 'Ú',
    uacute: 'ú',
  }

  return value.replace(
    /&(#\d+|#x[\da-f]+|[a-z]+);/gi,
    (entity, code: string) => {
      if (code.startsWith('#x')) {
        return String.fromCodePoint(Number.parseInt(code.slice(2), 16))
      }
      if (code.startsWith('#')) {
        return String.fromCodePoint(Number.parseInt(code.slice(1), 10))
      }
      return namedEntities[code] ?? entity
    }
  )
}

export function normalizePlayerName(value: string): string {
  return decodeHtml(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function parseAttribute(attributes: string, name: string): string | null {
  return attributes.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? null
}

function asProbability(value: string | null): number | null {
  if (!value) return null
  const probability = Number.parseInt(value.replace('%', ''), 10)
  return Number.isInteger(probability) && probability >= 0 && probability <= 100
    ? probability
    : null
}

function asMarketValue(value: string | null): number | null {
  if (!value) return null
  const marketValue = Number(value)
  return Number.isSafeInteger(marketValue) && marketValue > 0
    ? marketValue
    : null
}

export function parseStartingProbabilityPage(
  html: string
): SourceStartingProbability[] {
  const players = new Map<string, SourceStartingProbability>()
  const playerPattern =
    /<div class="jugador_(\d+) jugador tipo_lista[^"]*"([\s\S]*?)>/g

  for (const match of html.matchAll(playerPattern)) {
    const [openingTag, sourcePlayerId, attributes] = match
    const slug = parseAttribute(attributes, 'data-nombre')
    const probability = asProbability(
      parseAttribute(attributes, 'data-probabilidad')
    )
    if (!slug || probability === null) continue

    const startIndex = (match.index ?? 0) + openingTag.length
    const nearbyHtml = html.slice(startIndex, startIndex + 2_500)
    const renderedName = nearbyHtml.match(
      /<span class="nombre">([^<]+)<\/span>/
    )?.[1]
    const name = decodeHtml(renderedName ?? slug.replaceAll('-', ' ')).trim()
    if (!name) continue

    players.set(sourcePlayerId, {
      sourcePlayerId,
      name,
      slug,
      probability,
      marketValue: asMarketValue(
        parseAttribute(attributes, 'data-valor-laliga-fantasy')
      ),
      sourceUrl: `https://www.futbolfantasy.com/jugadores/${encodeURIComponent(slug)}`,
    })
  }

  return [...players.values()]
}

function getPlayerNames(player: StartingProbabilityRequestPlayer): string[] {
  return [
    ...new Set([player.nickname, player.name].filter(Boolean)),
  ] as string[]
}

function hasInitialAndSurnameMatch(left: string, right: string): boolean {
  const leftTokens = normalizePlayerName(left).split(' ')
  const rightTokens = normalizePlayerName(right).split(' ')
  if (leftTokens.length < 2 || rightTokens.length < 2) return false

  const leftFirst = leftTokens[0]
  const rightFirst = rightTokens[0]
  const leftSurname = leftTokens.at(-1)
  const rightSurname = rightTokens.at(-1)

  return (
    leftSurname === rightSurname &&
    leftFirst[0] === rightFirst[0] &&
    (leftFirst.length === 1 || rightFirst.length === 1)
  )
}

function findUnique(
  candidates: SourceStartingProbability[],
  predicate: (candidate: SourceStartingProbability) => boolean
): SourceStartingProbability | null {
  const matches = candidates.filter(predicate)
  return matches.length === 1 ? matches[0] : null
}

export function matchStartingProbability(
  player: StartingProbabilityRequestPlayer,
  candidates: SourceStartingProbability[]
): StartingProbability | null {
  const names = getPlayerNames(player)
  const normalizedNames = names.map(normalizePlayerName)

  const exactNameMatch = findUnique(candidates, (candidate) => {
    const sourceNames = [
      normalizePlayerName(candidate.name),
      normalizePlayerName(candidate.slug),
    ]
    return sourceNames.some((sourceName) =>
      normalizedNames.includes(sourceName)
    )
  })

  const abbreviatedNameMatch =
    exactNameMatch ??
    findUnique(candidates, (candidate) =>
      names.some(
        (name) =>
          hasInitialAndSurnameMatch(name, candidate.name) ||
          hasInitialAndSurnameMatch(name, candidate.slug)
      )
    )

  const marketValueMatch =
    abbreviatedNameMatch ??
    findUnique(
      candidates,
      (candidate) =>
        candidate.marketValue !== null &&
        candidate.marketValue === player.marketValue
    )

  if (!marketValueMatch) return null

  return {
    probability: marketValueMatch.probability,
    sourceName: STARTING_PROBABILITY_SOURCE,
    sourceUrl: marketValueMatch.sourceUrl,
  }
}
