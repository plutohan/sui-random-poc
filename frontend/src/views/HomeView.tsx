import { FC } from "react";
import LotteryInteraction from "../components/lottery/LotteryInteraction";
import LotteryGridList from "../components/lottery/components/LotteryGridList";

const HomeView: FC = () => {
  return (
    <div className="space-y-10">
      <LotteryGridList />
      {/* <LotteryInteraction /> */}
    </div>
  );
};

export default HomeView;
