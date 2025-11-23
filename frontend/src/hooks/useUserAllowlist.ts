import { useState, useEffect } from "react"
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { PACKAGE_ID } from "../config/constants"

export const useUserAllowlist = (currentAccountAddress: string | undefined) => {
	const suiClient = useSuiClient()
	const { mutate: signAndExecute } = useSignAndExecuteTransaction()

	const [allowlistId, setAllowlistId] = useState<string>("")
	const [capId, setCapId] = useState<string>("")
	const [isCreatingAllowlist, setIsCreatingAllowlist] = useState<boolean>(false)
	const [status, setStatus] = useState<string>("")

	// Load allowlist info from localStorage on mount
	useEffect(() => {
		const storedAllowlistId = localStorage.getItem("userAllowlistId")
		const storedCapId = localStorage.getItem("userAllowlistCapId")

		if (storedAllowlistId) setAllowlistId(storedAllowlistId)
		if (storedCapId) setCapId(storedCapId)
	}, [])

	const handleCreateUserAllowlist = async () => {
		if (!currentAccountAddress) {
			setStatus("Please connect your wallet first")
			return
		}

		setIsCreatingAllowlist(true)
		setStatus("Creating your personal allowlist...")

		try {
			const tx = new Transaction()

			tx.moveCall({
				target: `${PACKAGE_ID}::random_poc::create_user_allowlist`,
				arguments: [],
			})

			signAndExecute(
				{ transaction: tx },
				{
					onSuccess: async (result) => {
						console.log("Allowlist creation successful:", result)

						try {
							// Wait for transaction and extract created objects
							const txDetails = await suiClient.waitForTransaction({
								digest: result.digest,
								options: {
									showObjectChanges: true,
									showEvents: true,
								},
							})

							// Find the created Allowlist and Cap objects
							let newAllowlistId = ""
							let newCapId = ""

							if (txDetails.objectChanges) {
								for (const change of txDetails.objectChanges) {
									if (change.type === "created") {
										const objectType = change.objectType
										if (objectType.includes("::allowlist::Allowlist")) {
											newAllowlistId = change.objectId
										} else if (objectType.includes("::allowlist::Cap")) {
											newCapId = change.objectId
										}
									}
								}
							}

							if (!newAllowlistId || !newCapId) {
								throw new Error("Could not extract allowlist or cap ID from transaction")
							}

							console.log("Allowlist ID:", newAllowlistId)
							console.log("Cap ID:", newCapId)

							// Store in state and localStorage
							setAllowlistId(newAllowlistId)
							setCapId(newCapId)
							localStorage.setItem("userAllowlistId", newAllowlistId)
							localStorage.setItem("userAllowlistCapId", newCapId)

							setStatus(
								`✓ Allowlist created and you've been added!\nAllowlist ID: ${newAllowlistId}\nCap ID: ${newCapId}\n\nYou can now use this allowlist ID to encrypt your secrets!`
							)
							setIsCreatingAllowlist(false)
						} catch (error: any) {
							console.error("Error extracting allowlist info:", error)
							setStatus(`Error extracting allowlist info: ${error.message}`)
							setIsCreatingAllowlist(false)
						}
					},
					onError: (error) => {
						console.error("Transaction failed:", error)
						setStatus(`Error: ${error.message}`)
						setIsCreatingAllowlist(false)
					},
				}
			)
		} catch (error: any) {
			console.error("Error creating allowlist:", error)
			setStatus(`Error: ${error.message}`)
			setIsCreatingAllowlist(false)
		}
	}

	return {
		allowlistId,
		capId,
		isCreatingAllowlist,
		status,
		handleCreateUserAllowlist,
	}
}
