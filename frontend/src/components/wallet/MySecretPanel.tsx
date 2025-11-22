import { FC } from "react"
import { SecretManagement } from "../lottery/components/SecretManagement"

type Props = {
	currentAccountAddress?: string
	onStatus?: (message: string) => void
}

export const MySecretPanel: FC<Props> = ({ currentAccountAddress, onStatus }) => {
	return (
		<div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
			<h3 className="text-xl font-semibold mb-4">My Secret (One-Time Setup)</h3>
			<SecretManagement
				currentAccountAddress={currentAccountAddress}
				onStatusChange={onStatus || (() => {})}
			/>
		</div>
	)
}
