import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

try {
  const th = localStorage.getItem("bridgenode-theme");
  if (th) document.documentElement.dataset.theme = th;
} catch {}

class Boundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="wrap center">
        <h1>브릿지노드 대시보드</h1>
        <p>
          화면을 불러오지 못했습니다. 데이터는 서버에 안전하게 저장되어
          있습니다.
        </p>
        <button className="btn primary" onClick={() => location.reload()}>
          다시 불러오기
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <Boundary>
    <App />
  </Boundary>,
);
