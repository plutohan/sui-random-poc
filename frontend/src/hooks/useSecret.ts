import { useState, useEffect } from "react"
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"
import { keccak256 as keccakHash } from "js-sha3"
import { walrus, WalrusFile } from "@mysten/walrus"

// Helper function to generate random bytes
const generateRandomBytes = (length: number): Uint8Array => {
	const bytes = new Uint8Array(length)
	crypto.getRandomValues(bytes)
	return bytes
}

// Helper function to convert bytes to hex string
const bytesToHex = (bytes: Uint8Array): string => {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

// Helper function to compute Keccak256 hash
export const keccak256 = (data: Uint8Array): Uint8Array => {
	const hashHex = keccakHash(data)
	const hashBytes = new Uint8Array(hashHex.length / 2)
	for (let i = 0; i < hashBytes.length; i++) {
		hashBytes[i] = parseInt(hashHex.substring(i * 2, i * 2 + 2), 16)
	}
	return hashBytes
}

export const useSecret = (currentAccountAddress: string | undefined) => {
	const suiClient = useSuiClient()
	const { mutate: signAndExecute } = useSignAndExecuteTransaction()
	const client = suiClient.$extend(walrus({ network: "testnet" }))

	const [claimSecretHash, setClaimSecretHash] = useState<string>("")
	const [walrusBlobId, setWalrusBlobId] = useState<string>("")
	const [generatedSecret, setGeneratedSecret] = useState<string>("")
	const [isGeneratingSecret, setIsGeneratingSecret] = useState<boolean>(false)
	const [isRetrievingSecret, setIsRetrievingSecret] = useState<boolean>(false)
	const [status, setStatus] = useState<string>("")

	// Load secret from localStorage on mount
	useEffect(() => {
		const storedHash = localStorage.getItem("lotterySecretHash")
		const storedBlobId = localStorage.getItem("lotteryWalrusBlobId")
		const storedSecret = localStorage.getItem("lotterySecret")

		if (storedHash) setClaimSecretHash(storedHash)
		if (storedBlobId) setWalrusBlobId(storedBlobId)
		if (storedSecret) setGeneratedSecret(storedSecret)
	}, [])

	const handleGenerateAndUploadSecret = async () => {
		if (!currentAccountAddress) {
			setStatus("Please connect your wallet first")
			return
		}

		setIsGeneratingSecret(true)
		setStatus("Generating claim secret and uploading to Walrus...")

		try {
			// Generate random secret (32 bytes)
			const secretBytes = generateRandomBytes(32)
			const secretHex = bytesToHex(secretBytes)

			// Compute hash of the secret
			const hashBytes = keccak256(secretBytes)
			const hashHex = bytesToHex(hashBytes)

			// Create a WalrusFile with the secret as text (hex string)
			const file = WalrusFile.from({
				contents: new TextEncoder().encode(secretHex),
				identifier: `lottery-secret-${Date.now()}.txt`,
				tags: {
					"content-type": "text/plain",
				},
			})

			// Create upload flow
			setStatus("Creating Walrus upload flow...")
			const flow = client.walrus.writeFilesFlow({ files: [file] })
			await flow.encode()

			// Step 1: Register the blob (requires wallet signature)
			setStatus("Please sign the transaction to register blob on Walrus...")
			const registerTx = flow.register({
				epochs: 5,
				owner: currentAccountAddress,
				deletable: false,
			})

			await new Promise<void>((resolve, reject) => {
				signAndExecute(
					{ transaction: registerTx },
					{
						onSuccess: async (result) => {
							console.log("Register transaction successful:", result)
							setStatus("Uploading blob to Walrus storage nodes...")

							try {
								// Step 2: Upload the blob
								await flow.upload({ digest: result.digest })

								// Step 3: Certify (requires another wallet signature)
								setStatus("Please sign the transaction to certify the blob...")
								const certifyTx = flow.certify()

								signAndExecute(
									{ transaction: certifyTx },
									{
										onSuccess: async (certifyResult) => {
											console.log("Certify transaction successful:", certifyResult)

											// Wait for transaction and get the blob ID from events
											const txDetails = await client.waitForTransaction({
												digest: certifyResult.digest,
												options: {
													showEvents: true,
													showObjectChanges: true,
												},
											})

											// Extract blob ID from events
											let blobId = ""
											if (txDetails.events) {
												for (const event of txDetails.events) {
													if (event.type.includes("Blob")) {
														const parsedJson = event.parsedJson as any
														if (parsedJson.blob_id) {
															const { blobIdFromInt } = await import("@mysten/walrus")
															blobId = blobIdFromInt(parsedJson.blob_id)
															break
														}
													}
												}
											}

											if (!blobId) {
												throw new Error("Could not extract blob ID from transaction")
											}

											console.log("Extracted Blob ID:", blobId)

											// Store the generated values in state and localStorage
											setGeneratedSecret(secretHex)
											setClaimSecretHash(hashHex)
											setWalrusBlobId(blobId)

											// Persist to localStorage
											localStorage.setItem("lotterySecret", secretHex)
											localStorage.setItem("lotterySecretHash", hashHex)
											localStorage.setItem("lotteryWalrusBlobId", blobId)

											setStatus(
												`Secret generated and uploaded!\nSecret: ${secretHex}\nHash: ${hashHex}\nWalrus Blob ID: ${blobId}\n\n✓ Secret saved! You can now use this for all lottery picks.`
											)
											setIsGeneratingSecret(false)
											resolve()
										},
										onError: (error) => {
											console.error("Certify transaction failed:", error)
											setStatus(`Error certifying blob: ${error.message}`)
											setIsGeneratingSecret(false)
											reject(error)
										},
									}
								)
							} catch (error: any) {
								console.error("Error uploading blob:", error)
								setStatus(`Error uploading: ${error.message}`)
								setIsGeneratingSecret(false)
								reject(error)
							}
						},
						onError: (error) => {
							console.error("Register transaction failed:", error)
							setStatus(`Error registering blob: ${error.message}`)
							setIsGeneratingSecret(false)
							reject(error)
						},
					}
				)
			})
		} catch (error: any) {
			console.error("Error generating/uploading secret:", error)
			setStatus(`Error: ${error.message}`)
			setIsGeneratingSecret(false)
		}
	}

	const handleRetrieveSecretFromWalrus = async (blobIdInput: string) => {
		const blobId = blobIdInput.trim()

		if (!blobId) {
			setStatus("Please enter a Walrus Blob ID")
			return
		}

		setIsRetrievingSecret(true)
		setStatus("Retrieving secret from Walrus...")

		try {
			console.log("Fetching blob from Walrus, Blob ID:", blobId)

			// Fetch the blob from Walrus and convert to file
			const blob = await client.walrus.getBlob({ blobId })
			console.log("Got blob:", blob)

			const file = await blob.asFile()
			console.log("Converted to file:", file)

			// Read the file content
			const blobText = await file.text()
			console.log("Retrieved secret from Walrus:", blobText)

			setGeneratedSecret(blobText)

			// Compute hash of the secret for use in picks
			const secretBytes = Array.from(
				blobText.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
			)
			const hashBytes = keccak256(new Uint8Array(secretBytes))
			const hashHex = bytesToHex(hashBytes)

			setClaimSecretHash(hashHex)
			setWalrusBlobId(blobId)

			// Save to localStorage
			localStorage.setItem("lotterySecret", blobText)
			localStorage.setItem("lotterySecretHash", hashHex)
			localStorage.setItem("lotteryWalrusBlobId", blobId)

			setStatus(
				`✓ Secret retrieved and saved! Length: ${blobText.length} chars\nYou can now use this secret for lottery picks.`
			)
		} catch (error: any) {
			console.error("Error retrieving secret from Walrus:", error)
			setStatus(`Error retrieving secret: ${error.message}`)
		} finally {
			setIsRetrievingSecret(false)
		}
	}

	return {
		claimSecretHash,
		walrusBlobId,
		generatedSecret,
		isGeneratingSecret,
		isRetrievingSecret,
		status,
		handleGenerateAndUploadSecret,
		handleRetrieveSecretFromWalrus,
	}
}
