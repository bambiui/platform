"use client";
import { Button } from "@/src/components/ui/button";
export default function Home() {
  return (
    <div className="flex flex-1 gap-4 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <Button intent="primary">Hello world</Button>
        <Button intent="secondary" appearance="link" onClick={() => window.open("https://bambi-ui.felekoglu.dev", "_blank")}>go to bambiui</Button>
    </div>
  );
}
