import { FC } from "react"

interface LotteryGridProps {
	slots: boolean[]
	isActive: boolean
	winningSlot: number
	selectedSlot: number | null
	onSlotSelect: (index: number) => void
}

export const LotteryGrid: FC<LotteryGridProps> = ({
	slots,
	isActive,
	winningSlot,
	selectedSlot,
	onSlotSelect,
}) => {
	return (
		<div className="glass rounded-3xl shadow-xl p-8 mb-6 border border-emerald-200/20 dark:border-emerald-500/20">
			<h3 className="text-2xl font-bold text-gradient mb-6 text-center">Pick Your Slot</h3>

			{/* 3x3 Grid */}
			<div className="grid grid-cols-3 gap-4 mb-8 max-w-lg mx-auto p-4">
				{slots.map((isTaken, index) => {
					const isWinning = !isActive && index === winningSlot
					const isSelected = selectedSlot === index
					const isAvailable = isActive && !isTaken

					return (
						<button
							key={index}
							type="button"
							onClick={() => isAvailable ? onSlotSelect(index) : null}
							disabled={!isAvailable}
							className={`
								relative aspect-square flex items-center justify-center rounded-2xl font-bold text-3xl
								transition-all duration-300 transform
								${isWinning
									? "bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 text-white shadow-2xl ring-4 ring-yellow-300 dark:ring-yellow-500 scale-110 animate-pulse-glow"
									: isTaken
										? "bg-gradient-to-br from-red-500 to-red-700 text-white/70 shadow-lg cursor-not-allowed"
										: !isActive
											? "bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-800 text-gray-500 dark:text-gray-600 cursor-not-allowed opacity-50"
											: isSelected
												? "bg-gradient-to-br from-blue-500 to-purple-600 text-white ring-4 ring-blue-400 dark:ring-purple-500 shadow-2xl scale-105"
												: "bg-gradient-to-br from-emerald-400 via-cyan-400 to-purple-500 hover:from-emerald-500 hover:via-cyan-500 hover:to-purple-600 text-white shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer"
								}
								${isAvailable ? "hover:ring-4 hover:ring-emerald-400 dark:hover:ring-cyan-400" : ""}
							`}
							title={`Slot ${index}${isTaken
								? " (Taken)"
								: !isActive
									? " (Lottery Ended)"
									: " (Available)"
								}${isWinning ? " - WINNER!" : ""}`}
						>
							{/* Gradient border effect */}
							{isAvailable && (
								<div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-300 via-cyan-300 to-purple-400 dark:from-emerald-600 dark:via-cyan-600 dark:to-purple-600 opacity-0 hover:opacity-30 transition-opacity duration-300 -z-10 blur-sm"></div>
							)}

							{/* Slot content */}
							<span className={`relative z-10 ${isWinning ? "drop-shadow-lg" : ""}`}>
								{isWinning ? "🏆" : index}
							</span>

							{/* Shimmer effect for available slots */}
							{isAvailable && !isSelected && (
								<div className="absolute inset-0 overflow-hidden rounded-2xl">
									<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer"></div>
								</div>
							)}

							{/* Winner glow effect */}
							{isWinning && (
								<div className="absolute inset-0 rounded-2xl bg-yellow-400/30 blur-xl animate-pulse"></div>
							)}
						</button>
					)
				})}
			</div>

			{/* Legend */}
			<div className="flex flex-wrap gap-4 text-sm justify-center items-center pt-4 border-t border-gray-200 dark:border-gray-700">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-gradient-to-br from-emerald-400 via-cyan-400 to-purple-500 rounded-xl shadow-md"></div>
					<span className="font-medium">Available</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-md ring-2 ring-blue-400"></div>
					<span className="font-medium">Selected</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-700 rounded-xl shadow-md"></div>
					<span className="font-medium">Taken</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-xl shadow-md flex items-center justify-center text-lg">
						🏆
					</div>
					<span className="font-medium">Winner</span>
				</div>
			</div>
		</div>
	)
}
