"use client";

import { useEffect, useState } from "react";

export default function DemoPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: "test@bookmark-nav.local", password: "Test123456!" }),
    }).then(async (response) => {
      if (!response.ok) throw new Error("Demo 账号暂不可用");
      window.location.replace("/");
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Demo 登录失败");
    });
    return () => { active = false; };
  }, []);

  return <main className="auth-shell"><div className="auth-panel demo-page"><p className="eyebrow">bookmark-nav Demo</p><h1>{error ? "Demo 暂不可用" : "正在进入 Demo..."}</h1>{error && <p className="form-error" role="alert">{error}</p>}<a className="secondary-button auth-submit" href="/">返回登录</a></div></main>;
}
