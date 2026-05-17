import { mount, StartClient } from "@solidjs/start/client";

export default function Client() {
  return <StartClient />;
}

mount(() => <Client />, document.getElementById("app")!);
