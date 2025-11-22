import { FC, useState, useEffect } from "react"
import { useSecret } from "../../../hooks/useSecret"

interface SecretManagementProps {
	currentAccountAddress: string | undefined
	onStatusChange?: (status: string) => void
}

export const SecretManagement: FC<SecretManagementProps> = ({
	currentAccountAddress,
	onStatusChange,
}) => {
	const {
		claimSecretHash,
		walrusBlobId,
		generatedSecret,
		isGeneratingSecret,
		isRetrievingSecret,
		status,
		handleGenerateAndUploadSecret,
		handleRetrieveSecretFromWalrus,
	} = useSecret(currentAccountAddress)

	const [blobIdInput, setBlobIdInput] = useState<string>("")

	// Notify parent of status changes using useEffect
	useEffect(() => {
		if (onStatusChange && status) {
			onStatusChange(status)
		}
	}, [status, onStatusChange])

	const handleFetchSecret = () => {
		handleRetrieveSecretFromWalrus(blobIdInput)
	}

	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
			<h3 className="text-xl font-semibold mb-4">My Secret (One-Time Setup)</h3>
			<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
				Generate your secret once and use it for all lottery picks. This allows
				anonymous prize claiming. Your secret is stored in browser local storage.
			</p>
			<div className="flex flex-col gap-4">
				{/* Generate Secret Button */}
				<div>
					<button
						onClick={handleGenerateAndUploadSecret}
						disabled={isGeneratingSecret}
						className="w-full px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
					>
						{isGeneratingSecret
							? "Generating..."
							: claimSecretHash && generatedSecret
							? "✓ Secret Active - Click to Regenerate"
							: "Generate Secret"}
					</button>
				</div>

				{/* Fetch Secret Section - COMMENTED OUT (Walrus disabled) */}
				{/*
				<div className="border-t dark:border-gray-700 pt-4">
					<h4 className="font-semibold mb-2">Or Fetch Existing Secret</h4>
					<p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
						If you already created a secret before, enter your Walrus Blob ID
						to retrieve it.
					</p>
					<div className="flex gap-2">
						<input
							type="text"
							value={blobIdInput}
							onChange={(e) => setBlobIdInput(e.target.value)}
							placeholder="Enter Walrus Blob ID (hex)"
							className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
						/>
						<button
							onClick={handleFetchSecret}
							disabled={isRetrievingSecret || !blobIdInput.trim()}
							className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
						>
							{isRetrievingSecret ? "Fetching..." : "Fetch Secret"}
						</button>
					</div>
				</div>
				*/}

				{/* Display Current Secret */}
				{generatedSecret && claimSecretHash && (
					<div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
						<p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-2">
							✓ Secret Active - Use this for all lottery picks!
						</p>
						<div className="space-y-2">
							<div>
								<p className="text-xs font-medium mb-1">Your Secret:</p>
								<code className="block text-xs bg-white dark:bg-gray-800 p-2 rounded break-all font-mono">
									{generatedSecret}
								</code>
							</div>
							<div>
								<p className="text-xs font-medium mb-1">
									Hash (sent with picks):
								</p>
								<code className="block text-xs bg-white dark:bg-gray-800 p-2 rounded break-all font-mono">
									{claimSecretHash}
								</code>
							</div>
							{/* Walrus Blob ID display - COMMENTED OUT (Walrus disabled) */}
							{/*
							<div>
								<p className="text-xs font-medium mb-1">Walrus Blob ID:</p>
								<code className="block text-xs bg-white dark:bg-gray-800 p-2 rounded break-all font-mono">
									{walrusBlobId}
								</code>
							</div>
							*/}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

// Export the hook as well for use in parent component
export { useSecret }
