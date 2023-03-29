import React, { FC, ReactNode } from "react";
import ReactDOM from "react-dom";
import { useDispatch, useSelector } from "react-redux";

import { CLOSE_MODAL } from "../../../redux/common";
import { RootState } from "../../../redux/store";
type Size = "sm" | "md" | "full";
interface CommonModalProps {
  children: ReactNode;
  size?: Size;
  customSize?: string;
}

const CommonModal: FC<CommonModalProps> = ({
  children,
  size = "full",
  customSize,
}) => {
  const openModals = useSelector((state: RootState) => state.common.openModals);
  let configSize = "";
  const dispatch = useDispatch();
  const onClose = () => {
    dispatch(CLOSE_MODAL("commonModal"));
  };

  switch (size) {
    case "sm":
      configSize = ""; // base on children content
      break;
    case "md":
      configSize = "w-96 h-96";
      break;
    case "full":
      configSize = "w-2/3 h-2/3";
      break;
    default:
      configSize = "w-2/3 h-2/3";
  }

  if (!openModals.includes("commonModal")) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out opacity-100"
      onClick={onClose}
    >
      <div className="bg-black opacity-50 absolute inset-0" />
      <div
        className={`p-6 rounded shadow-lg relative bg-white ${
          !customSize ? configSize : customSize
        } `}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default CommonModal;
