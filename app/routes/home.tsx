import type { Route } from "./+types/home";
import Board from "~/components/board/Board";
import { Greeting } from "~/components/greeting/Greeting";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <>
      <Board />
      <Greeting />
    </>
  );
}
