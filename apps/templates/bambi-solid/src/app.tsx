import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import "./styles/bambi.css";

export default function App() {
  return (
    <Router>
      <FileRoutes />
    </Router>
  );
}
