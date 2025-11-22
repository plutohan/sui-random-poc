import { FC, useState } from "react";
import { WalletStatus } from "../components/wallet/Status";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { MySecretPanel } from "../components/wallet/MySecretPanel";

const WalletView: FC = () => {
  const account = useCurrentAccount();
  const [secretStatus, setSecretStatus] = useState("");

  return (
    <>
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Wallet Info</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr,1.1fr]">
        <MySecretPanel
          currentAccountAddress={account?.address}
          onStatus={(msg) => setSecretStatus(msg)}
        />
        <div className="space-y-4">
          <WalletStatus />
          {secretStatus && (
            <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
              {secretStatus}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default WalletView;
