import { FC } from "react"
import { LotterySummary } from "../lotteryApi"

type Props = {
	game: LotterySummary
	onSelect: (id: string) => void
}

const LotteryCard: FC<Props> = ({ game, onSelect }) => {
	const isActive = game.isActive
	const statusLabel = isActive ? "Active" : "Ended"

	const slots = game.slots.length ? game.slots : Array(9).fill(false)
	const availableSlots = slots.filter((slot) => !slot).length
	const title = `Lottery ${game.id.slice(0, 6)}...`
	const description = isActive
		? `${availableSlots} slots open • Prize ${game.prize} SUI`
		: `Ended • Prize ${game.prize} SUI`

	return (
		<button
			type="button"
			onClick={() => onSelect(game.id)}
			className={`group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl transition transform hover:-translate-y-0.5 ${
				isActive ? "" : "shadow-inner shadow-gray-500/40 dark:shadow-black/40 opacity-80"
			}`}
			aria-label={`${title} lottery ${statusLabel}`}
			aria-disabled={!isActive}
		>
			<div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-sm bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700">
				<div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-3">
					{slots.slice(0, 9).map((isTaken, index) => {
						const isWinning = !isActive && index === game.winningSlot
						const cellClass = isWinning
							? "bg-gradient-to-br from-yellow-400 to-yellow-600"
							: isTaken
							? "bg-red-500"
							: isActive
							? "bg-blue-500/80"
							: "bg-gray-400/70"
						return (
							<div
								key={index}
								className={`${cellClass} rounded-md border border-white/20`}
								aria-hidden="true"
							/>
						)
					})}
				</div>
				<div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-semibold text-white drop-shadow">
					<span className="truncate">{title}</span>
					<span className="px-2 py-0.5 rounded-full bg-black/50">
						{isActive ? `${availableSlots} open` : "Closed"}
					</span>
				</div>
				<span
					className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${
						isActive ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
					}`}
					aria-label={`Status: ${statusLabel}`}
				>
					{statusLabel}
				</span>
			</div>
			<div className="mt-3 space-y-1">
				<div className="flex items-center justify-between gap-2">
					<p className="font-semibold text-gray-900 dark:text-gray-100">
						{title}
					</p>
					<span className="text-xs rounded-full bg-gray-200 px-2 py-1 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
						{isActive ? "Live" : "Closed"}
					</span>
				</div>
				<p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
				<div className="text-xs text-gray-500 dark:text-gray-400">
					Updated {game.createdAt || "recently"} • Prize {game.prize} SUI
				</div>
			</div>
		</button>
	)
}

export default LotteryCard
