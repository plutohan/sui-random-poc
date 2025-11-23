import React, { useState } from "react"
import { useNavigation } from "../../providers/navigation/NavigationContext"
import { ConnectButton } from "@mysten/dapp-kit"
import { useTheme } from "../../providers/theme/ThemeContext"

const NavBar: React.FC = () => {
	const { toggleDarkMode } = useTheme()
	const { currentPage, navigate } = useNavigation()
	const [showHowTo, setShowHowTo] = useState(false)

	return (
		<nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-950/95 backdrop-blur-lg shadow-lg border-b border-emerald-200/30 dark:border-emerald-500/30">
			<div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex flex-row justify-between items-center h-16">
					{/* Logo & Navigation */}
					<div className="flex items-center space-x-8">
						<div className="flex items-center gap-2 hidden sm:flex">
							<img
								src="/apple-touch-icon.png"
								alt="WalrusPlay Logo"
								className="w-8 h-8 rounded-lg"
							/>
							<h1 className="text-2xl font-bold text-gradient">
								WalrusPlay
							</h1>
						</div>
						<ul className="flex space-x-2">
							<li>
								<button
									onClick={() => navigate("/")}
									className={`px-4 py-2 rounded-lg font-semibold transition-all ${
										currentPage === "/" ||
										currentPage.startsWith("/lottery/")
											? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
											: "text-gray-700 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10"
									}`}
								>
									🏠 Home
								</button>
							</li>
							<li>
								<button
									onClick={() => navigate("/wallet")}
									className={`px-4 py-2 rounded-lg font-semibold transition-all ${
										currentPage === "/wallet"
											? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
											: "text-gray-700 dark:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10"
									}`}
								>
									💼 Wallet
								</button>
							</li>
						</ul>
					</div>

					{/* Actions */}
					<div className="flex items-center space-x-3">
						<button
							onClick={() => setShowHowTo(true)}
							className="px-4 py-2 rounded-lg font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg transition-all transform hover:-translate-y-0.5"
						>
							❓ How To Play
						</button>
						<button
							onClick={toggleDarkMode}
							className="px-3 py-2 rounded-lg font-semibold bg-white/20 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-white/30 dark:hover:bg-white/20 transition-all"
							title="Toggle Dark Mode"
						>
							🌓
						</button>
						<div className="all-[initial]">
							<ConnectButton />
						</div>
					</div>
				</div>
			</div>

			{/* How To Play Modal */}
			{showHowTo && (
				<div
					className="fixed inset-0 h-screen z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-slide-up"
					role="dialog"
					aria-modal="true"
					aria-label="How to play"
					onClick={() => setShowHowTo(false)}
				>
					<div
						className="glass-strong rounded-2xl shadow-2xl max-w-2xl w-full p-8 space-y-6 animate-slide-up"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between">
							<h3 className="text-2xl font-bold text-gradient">
								How to Play
							</h3>
							<button
								onClick={() => setShowHowTo(false)}
								aria-label="Close how to play modal"
								className="text-3xl text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
							>
								✕
							</button>
						</div>

						<ol className="list-decimal list-inside space-y-4 text-base text-gray-700 dark:text-gray-300">
							<li className="pl-2">
								<strong>Connect Wallet:</strong> Use the button
								on the top right to connect your Sui wallet.
							</li>
							<li className="pl-2">
								<strong>Generate Secret:</strong> Go to the
								Wallet page and generate your one-time secret in
								"My Secret" to enable anonymous prize claims.
							</li>
							<li className="pl-2">
								<strong>Choose Lottery:</strong> Pick a lottery
								from the home grid and click a card to open its
								3x3 board.
							</li>
							<li className="pl-2">
								<strong>Pick a Slot:</strong> Select an
								available slot on the board and confirm to
								submit your pick transaction.
							</li>
							<li className="pl-2">
								<strong>Win & Claim:</strong> If you win,
								collect your prize directly or claim anonymously
								using your secret! Creators can also collect
								their fees.
							</li>
						</ol>

						<div className="flex justify-end pt-4">
							<button
								onClick={() => setShowHowTo(false)}
								className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-lg transition-all transform hover:-translate-y-0.5"
							>
								Got it! 🎉
							</button>
						</div>
					</div>
				</div>
			)}
		</nav>
	)
}

export default NavBar
