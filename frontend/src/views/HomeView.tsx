import { FC } from "react";
import LotteryInteraction from "../components/lottery/LotteryInteraction";

const HomeView: FC = () => {
  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Sui Random Lottery PoC</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Interact with the on-chain lottery smart contract
        </p>
      </div>
      <LotteryInteraction />
    </>
  );
};

export default HomeView;
