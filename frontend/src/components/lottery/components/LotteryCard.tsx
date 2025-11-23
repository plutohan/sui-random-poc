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
			className={`group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 ${isActive ? "animate-slide-up" : "opacity-70"
				}`}
			aria-label={`${title} lottery ${statusLabel}`}
			aria-disabled={!isActive}
		>
			<div className="relative aspect-square w-full overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-emerald-500 via-cyan-500 to-purple-500 p-1">
				{/* Card Inner Content */}
				<div className="relative w-full h-full bg-white dark:bg-gray-950 rounded-xl overflow-hidden">
					{/* 3x3 Grid */}
					<div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-4">
						{slots.slice(0, 9).map((isTaken, index) => {
							const isWinning = !isActive && index === game.winningSlot
							const cellClass = isWinning
								? "bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse-glow"
								: isTaken
									? "bg-gradient-to-br from-red-400 to-red-600"
									: isActive
										? "bg-gradient-to-br from-blue-400 to-purple-500 group-hover:animate-shimmer"
										: "bg-gray-300 dark:bg-gray-700"
							return (
								<div
									key={index}
									className={`${cellClass} rounded-lg border-2 border-white/30 shadow-sm transition-all duration-300 ${isActive && !isTaken ? "group-hover:scale-110 group-hover:shadow-md" : ""
										}`}
									aria-hidden="true"
								>
									{isWinning && (
										<div className="w-full h-full flex items-center justify-center text-2xl">
											🏆
										</div>
									)}
								</div>
							)
						})}
					</div>

					{/* Status Badge */}
					<span
						className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs font-bold shadow-md z-10 ${isActive
							? "bg-gradient-to-r from-green-400 to-emerald-500 text-white"
							: "bg-gradient-to-r from-red-400 to-rose-500 text-white"
							}`}
						aria-label={`Status: ${statusLabel}`}
					>
						{isActive ? "🟢 LIVE" : "🔴 CLOSED"}
					</span>

					{/* Bottom Info */}
					<div className="absolute bottom-0 left-0 right-0 bg-black/70 dark:bg-black/80 p-3 backdrop-blur-md">
						<div className="flex items-center justify-between text-xs font-semibold text-white">
							<span className="truncate">{title}</span>
							<span className="px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm">
								{isActive ? `${availableSlots} 🎯` : "Closed"}
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Card Footer */}
			<div className="mt-3 space-y-1 px-1">
				<div className="flex items-center justify-between gap-2">
					<p className="font-bold text-gray-900 dark:text-gray-100">
						{title}
					</p>
					<span className={`text-xs font-semibold rounded-full px-3 py-1 ${isActive
						? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
						: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
						}`}>
						{isActive ? "Live" : "Closed"}
					</span>
				</div>
				<p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
				<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
					<span>💰 {game.prize} SUI</span>
					{game.createdAt && (
						<>
							<span>•</span>
							<span>📅 {game.createdAt}</span>
						</>
					)}
				</div>
			</div>
		</button>
	)
}

export default LotteryCard
