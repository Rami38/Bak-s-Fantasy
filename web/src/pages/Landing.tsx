import { useEffect, useState } from "react";
import { usePrefs } from "../prefs.tsx";
import type { MouseEvent } from "react";

type Props = {
  onEnter: (mode: "sign-in" | "sign-up") => void;
};

export function Landing({ onEnter }: Props) {
  const { t, lang, setLang } = usePrefs();
  const [step, setStep] = useState(0);
  const story = [
    { title: t.squad, body: t.aboutSquad },
    { title: t.slate, body: t.aboutSlate },
    { title: t.leagues, body: t.aboutLeague },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => (current + 1) % 3), 4200);
    return () => window.clearInterval(timer);
  }, []);

  function shift(event: MouseEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty("--mx", x.toFixed(3));
    event.currentTarget.style.setProperty("--my", y.toFixed(3));
  }

  return (
    <section className="landing" onMouseMove={shift}>
      <div className="landing-stage" aria-hidden="true">
        <div className="landing-glow" />
        <div className="landing-sweep" />
        <div className="landing-pitch" />
        <div className="landing-ball" />
        <span className="landing-kit kit-a">14</span>
        <span className="landing-kit kit-b">7</span>
        <span className="landing-kit kit-c">10</span>
      </div>
      <header className="landing-top">
        <div className="brand">
          <img src="/logo.jpg" alt="" />
          <div>
            <strong>Bak's Fantasy</strong>
            <span>{t.landingKicker}</span>
          </div>
        </div>
        <div className="landing-actions">
          <button type="button" className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
            EN
          </button>
          <button type="button" className={lang === "fr" ? "on" : ""} onClick={() => setLang("fr")}>
            FR
          </button>
          <button type="button" onClick={() => onEnter("sign-in")}>
            {t.signIn}
          </button>
          <button type="button" className="coral" onClick={() => onEnter("sign-up")}>
            {t.create}
          </button>
        </div>
      </header>
      <div className="landing-copy">
        <p className="kicker">{t.home}</p>
        <h1>{t.landingTitle}</h1>
        <p className="lede">{t.landingLede}</p>
        <p className="landing-now" aria-live="polite">
          <b>0{step + 1}</b>
          {story[step].title}
        </p>
        <button type="button" className="coral" onClick={() => onEnter("sign-up")}>
          {t.landingPlay}
        </button>
        <div className="landing-facts">
          {story.map((item, index) => (
            <article key={item.title} className={index === step ? "on" : ""}>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
