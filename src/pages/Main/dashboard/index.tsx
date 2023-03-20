import React, { FC, useState } from "react";

import NavBar from "../../../common/components/NavBar/NavBar";
import SideBar from "../../../common/components/SideBar/SideBar";
interface DashboardProps {}

const Dashboard: FC<DashboardProps> = () => {
  const [isTrigger, setIsTrigger] = useState(true);
  return (
    <div className="font-montserrat font-medium h-full bg-slate-100 flex">
      <SideBar isTrigger={isTrigger} setIsTrigger={setIsTrigger} />
      <NavBar />
    </div>
  );
};

export default Dashboard;
