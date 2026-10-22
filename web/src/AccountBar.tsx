import { useState } from "react";
import { usePrefs } from "./prefs.tsx";

export type Manager = {
  name: string;
  username: string | null;
  email: string | null;
  isCommissioner: boolean;
};

type Props = {
  mode?: "sign-in" | "sign-up";
  onSignedIn: (manager: Manager) => void;
  onHome: () => void;
};

export function LoginPage({ mode = "sign-in", onSignedIn, onHome }: Props) {
  const { t } = usePrefs();
  const [current, setCurrent] = useState<"sign-in" | "sign-up">(mode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const creating = current === "sign-up";

  async function submit() {
    setMessage("");
    const response = await fetch(creating ? "/api/sign-up" : "/api/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creating ? { username, email, password } : { name: username, password }),
    });
    const body = (await response.json()) as Manager | { error?: string } | null;
    if (!response.ok || !body || !("name" in body)) {
      setMessage(body && "error" in body && body.error ? body.error : "The account request failed.");
      return;
    }
    setPassword("");
    onSignedIn(body);
  }

  return (
    <main className="gate">
      <section className="gate-form">
        <div className="gate-card">
          <button type="button" className="text-back" onClick={onHome}>
            {t.backHome}
          </button>
          <img src="/logo.jpg" alt="" />
          <p className="kicker">{t.office}</p>
          <h1>Bak's Fantasy</h1>
          <p className="lede">{creating ? t.openTable : t.waiting}</p>
          <hr />
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label>
              {creating ? t.username : t.identifier}
              <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
            </label>
            {creating && (
              <label>
                {t.email}
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
              </label>
            )}
            <label>
              {t.password}
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={creating ? "new-password" : "current-password"}
              />
            </label>
            {message && <p className="auth-error">{message}</p>}
            <button type="submit" className="coral">
              {creating ? t.create : t.signIn}
            </button>
          </form>
          <p className="gate-switch">
            {creating ? t.already : t.newHere}{" "}
            <button
              type="button"
              onClick={() => {
                setCurrent(creating ? "sign-in" : "sign-up");
                setMessage("");
              }}
            >
              {creating ? t.signIn : t.createLink}
            </button>
          </p>
        </div>
      </section>
      <aside className="gate-panel">
        <img src="/logo.jpg" alt="" />
        <h2>{t.panelTitle}</h2>
        <p>{t.panelCopy}</p>
      </aside>
    </main>
  );
}

export function UsernameForm({ onSaved }: { onSaved: (manager: Manager) => void }) {
  const { t } = usePrefs();
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  async function save() {
    setMessage("");
    const response = await fetch("/api/username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const body = (await response.json()) as Manager | { error?: string } | null;
    if (!response.ok || !body || !("name" in body)) {
      setMessage(body && "error" in body && body.error ? body.error : "The username was not saved.");
      return;
    }
    onSaved(body);
  }

  return (
    <form
      className="username-form"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder={t.chooseUsername} />
      <button type="submit">{t.saveUsername}</button>
      {message && <small>{message}</small>}
    </form>
  );
}

export function SignOutButton({ onSignedOut }: { onSignedOut: () => void }) {
  const { t } = usePrefs();

  async function signOut() {
    await fetch("/api/sign-out", { method: "POST" });
    onSignedOut();
  }

  return (
    <button type="button" className="sign-out" onClick={() => void signOut()}>
      {t.signOut}
    </button>
  );
}
