type QuoteLine = {
  /** 原文（英語）。出典の記録として保持し、表示はしない */
  en: string;
  /** 和訳 */
  ja: string;
  /** 締めの一文として強調する */
  emphasis?: boolean;
};

const QUOTE_LINES: QuoteLine[] = [
  {
    en: "Luck plays no part in Diplomacy. Cunning and cleverness, honesty and perfectly-timed betrayal are the tools needed to outwit your fellow players. The most skillful negotiator will climb to victory over the backs of both enemies and friends.",
    ja: "ディプロマシーに運の要素はない。狡猾さと知恵、誠実さ、そして絶妙なタイミングの裏切り——それこそが、ほかのプレイヤーを出し抜くための武器だ。最も巧みな交渉人が、敵も味方も踏み台にして勝利へと登りつめる。",
  },
  {
    en: "Who do you trust?",
    ja: "あなたは、誰を信じる？",
    emphasis: true,
  },
];

const QUOTE_SOURCE = {
  name: "Avalon Hill",
  url: "https://www.avalonhill.com/",
};

/** トップページの歓迎メッセージ */
export const Greeting = () => (
  <section aria-labelledby="greeting-title" className="w-full px-4 py-8">
    <div className="mx-auto max-w-160 rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      <h2 id="greeting-title" className="text-xl font-bold text-gray-900">
        Diplomacy MOE へようこそ
      </h2>

      <figure className="mt-5">
        <blockquote className="space-y-4 border-l-4 border-brand pl-4">
          {QUOTE_LINES.map((line) => (
            <p
              key={line.ja}
              className={`text-sm leading-relaxed text-gray-800 ${line.emphasis ? "font-bold" : ""}`}
            >
              {line.ja}
            </p>
          ))}
        </blockquote>
        <figcaption className="mt-4 text-right text-xs text-gray-500">
          —{" "}
          <cite className="not-italic">
            <a
              href={QUOTE_SOURCE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-brand"
            >
              {QUOTE_SOURCE.name}
            </a>
          </cite>
        </figcaption>
      </figure>
    </div>
  </section>
);
