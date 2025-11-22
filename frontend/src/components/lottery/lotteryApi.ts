import { SuiClient, type EventId } from "@mysten/sui/client"
import { mistToSui, PACKAGE_ID } from "../../config/constants"

export type LotterySummary = {
	id: string
	isActive: boolean
	slotCount: number
	slots: boolean[]
	winningSlot: number
	winner: string | null
	creator: string
	prize: string
	prizeMist: number
	prizeValue: number
	fee: string
	feeMist: number
	feeValue: number
	remainingFee: string
	remainingFeeMist: number
	prizeClaimed: boolean
	createdAt: string
	createdAtMs: number
	coverImage: string
}

const createCoverImage = (id: string) => {
	const colors = ["#2563eb", "#f97316", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"]
	const color = colors[id.length % colors.length]
	const label = `Lottery ${id.slice(0, 6)}`
	const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='${color}' stop-opacity='0.95'/><stop offset='100%' stop-color='${color}' stop-opacity='0.65'/></linearGradient></defs><rect width='200' height='200' rx='24' fill='url(#g)'/><text x='50%' y='50%' fill='white' font-size='16' font-family='Arial, sans-serif' text-anchor='middle' dominant-baseline='central'>${label}</text></svg>`
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const parseLotteryFields = (
	fields: any,
	createdAt = "",
	objectId = "",
	createdAtMs = 0
): LotterySummary => {
	const slots = Array.isArray(fields.slots) ? fields.slots : []
	const prize = Number(fields.prize || 0)
	const fee = Number(fields.fee || 0)
	const remainingFee = Number(fields.remaining_fee || 0)
	const winningSlot = Number(fields.winning_slot ?? -1)
	const winner =
		fields.winner && typeof fields.winner === "string" ? fields.winner : null
	const isActive = winner === null

	const resolvedId = objectId || fields.id?.id || fields.id || ""
	const resolvedCreatedAtMs = createdAtMs || (createdAt ? Date.parse(createdAt) : 0)

	return {
		id: resolvedId,
		isActive,
		slotCount: slots.length,
		slots,
		winningSlot,
		winner,
		creator: String(fields.creator || ""),
		prize: mistToSui(prize),
		prizeMist: prize,
		prizeValue: Number(mistToSui(prize)),
		fee: mistToSui(fee),
		feeMist: fee,
		feeValue: Number(mistToSui(fee)),
		remainingFee: mistToSui(remainingFee),
		remainingFeeMist: remainingFee,
		prizeClaimed: Boolean(fields.prize_claimed),
		createdAt,
		createdAtMs: resolvedCreatedAtMs,
		coverImage: createCoverImage(resolvedId || "lottery"),
	}
}

export const fetchLotteryDetail = async (
	client: SuiClient,
	id: string,
	createdAt = "",
	createdAtMs = 0
): Promise<LotterySummary | null> => {
	const obj = await client.getObject({
		id,
		options: { showContent: true },
	})

	if (obj.data?.content && "fields" in obj.data.content) {
		const fields = obj.data.content.fields as any
		return parseLotteryFields(fields, createdAt, id, createdAtMs)
	}
	return null
}

export const fetchAllLotteries = async (
	client: SuiClient,
	page: number,
	pageSize: number
): Promise<{ data: LotterySummary[]; total: number }> => {
	const eventType = `${PACKAGE_ID}::random_poc::LotteryCreatedEvent`

	let cursor: EventId | null = null
	let hasNextPage = true
	const events: any[] = []

	while (hasNextPage) {
		const response: any = await client.queryEvents({
			query: { MoveEventType: eventType },
			cursor,
			limit: 50,
		})
		events.push(...response.data)
		hasNextPage = response.hasNextPage
		cursor = response.nextCursor

		if (events.length > 400) break
	}

	// Order newest first using timestamp
	const sortedEvents = events.sort((a, b) => {
		const tsA = Number(a.timestampMs || 0)
		const tsB = Number(b.timestampMs || 0)
		return tsB - tsA
	})

	const uniqueLotteryMap = new Map<
		string,
		{ createdAt: string; createdAtMs: number }
	>() // id -> metadata
	sortedEvents.forEach((event) => {
		if (event.parsedJson?.lottery_id) {
			const lotteryId = event.parsedJson.lottery_id as string
			const tsMs = Number(event.timestampMs || 0)
			const createdAt = tsMs ? new Date(tsMs).toLocaleDateString() : ""
			if (!uniqueLotteryMap.has(lotteryId)) {
				uniqueLotteryMap.set(lotteryId, { createdAt, createdAtMs: tsMs })
			}
		}
	})

	const ids = Array.from(uniqueLotteryMap.keys())
	const total = ids.length

	const start = (page - 1) * pageSize
	const end = start + pageSize
	const pageIds = ids.slice(start, end)

	const lotteries = await Promise.all(
		pageIds.map((id) => {
			const meta = uniqueLotteryMap.get(id)
			return fetchLotteryDetail(client, id, meta?.createdAt || "", meta?.createdAtMs || 0)
		})
	)

	const valid = lotteries.filter((item): item is LotterySummary => item !== null)

	return { data: valid, total }
}
