import { Outlet } from "react-router";
import { Header } from "~/components/header/Header";

export default function WithHeaderLayout() {
  return (
    <>
      <Header />
      <main className="flex flex-col items-center justify-center pt-0 pb-4">
        <Outlet />
      </main>
    </>
  );
}
