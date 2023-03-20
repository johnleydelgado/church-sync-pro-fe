import axios from "axios";
import React, { FC, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";

import LoginButton from "./components/LoginButton";
import bgImage from "../../../common/assets/doodle.png";
import pcLogin from "../../../common/assets/planning-center-btn.png";
import qboLogin from "../../../common/assets/qbo_login.png";
import { setThirdPartyTokens } from "../../../redux/common";
import { RootState } from "../../../redux/store";

interface indexProps {}

const SecondaryLogin: FC<indexProps> = () => {
  const subscribed = useRef(false);
  const { thirdPartyTokens } = useSelector((state: RootState) => state.common);
  const dispatch = useDispatch();

  const qboLoginHandler = async () => {
    const res = await axios.get("http://localhost:8080/csp/authQB");
    const authUri = res.data;
    window.location.href = authUri;
  };

  const pcLoginHandler = async () => {
    const res = await axios.get("http://localhost:8080/csp/authPC");
    const authUri = res.data;
    window.location.href = authUri;
  };

  const loadQbo = async () => {
    const url = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const realmId = urlParams.get("realmId");

    if (realmId) {
      console.log("realmId", realmId);
      try {
        const res = await axios.post("http://localhost:8080/csp/callBackQBO", {
          url,
        });
        const { access_token, refresh_token } = res.data;
        if (access_token)
          dispatch(
            setThirdPartyTokens({
              ...thirdPartyTokens,
              qbo_access_token: access_token,
              qbo_refresh_token: refresh_token,
              qbo_realm_id: realmId,
            })
          );
      } catch (e: any) {
        console.log(e);
        // NOTE: create a redirect or history here
      }

      //   window.history.pushState({}, "", newUrl[0]);
    }
  };

  const loadPC = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.get("code");
    const realmId = urlParams.get("realmId");

    if (hasCode && !realmId) {
      console.log("hasCode", hasCode);
      try {
        const res = await axios.post("http://localhost:8080/csp/callBackPC", {
          code: hasCode,
        });
        console.log(res.data);
        const { access_token, refresh_token } = res.data;
        if (access_token)
          dispatch(
            setThirdPartyTokens({
              ...thirdPartyTokens,
              PlanningCenter: refresh_token,
            })
          );
      } catch (e: any) {
        console.log(e);
        // NOTE: create a redirect or history here
      }

      //   window.history.pushState({}, "", newUrl[0]);
    }
  };

  useEffect(() => {
    if (!subscribed.current) {
      loadQbo();
      loadPC();
    }
    return () => {
      subscribed.current = true;
    };
  }, []);

  return (
    <div className="h-screen bg-slate-400">
      <div
        className="h-full flex-grow flex justify-center mx-auto items-center"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundPosition: "center",
        }}
      >
        <div className="bg-otherGray h-60 w-72 rounded-lg shadow-xl">
          <div className="flex flex-col justify-center p-4 gap-6">
            <p className="font-montserrat font-medium text-center text-lg">
              QBO and Planning Center
            </p>
            <LoginButton
              loginImage={qboLogin}
              onClick={qboLoginHandler}
              name="Already connected to Qbo"
              isHide={!!thirdPartyTokens?.qbo_access_token}
            />
            <LoginButton
              loginImage={pcLogin}
              onClick={pcLoginHandler}
              name="Already connected to Planning Center"
              isHide={!!thirdPartyTokens?.PlanningCenter}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecondaryLogin;
