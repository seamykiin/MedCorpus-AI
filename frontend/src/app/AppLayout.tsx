import { Outlet } from "react-router";
import GlobalPlainLanguage from "../components/GlobalPlainLanguage";

export default function AppLayout() {
  return (
    <>
      <Outlet />
      <GlobalPlainLanguage />
    </>
  );
}
