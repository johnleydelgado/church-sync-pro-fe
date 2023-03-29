import React, { FC, ReactNode, useState } from "react";

import NavBar from "../NavBar/NavBar";
import SideBar from "../SideBar/SideBar";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: FC<MainLayoutProps> = ({ children }) => {
  const [isTrigger, setIsTrigger] = useState(true);

  return (
    <div className="font-montserrat font-medium h-full bg-slate-100">
      <NavBar />
      <SideBar isTrigger={isTrigger} setIsTrigger={setIsTrigger} />

      <div
        className={`transform duration-200 delay-150 h-5/6 bg-slate-100 p-6 ${
          isTrigger ? `ml-24` : "ml-64"
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default MainLayout;
