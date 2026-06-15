/**
 * 面接のパーソナライズ設定とプロンプト生成（クライアント・サーバー共通）。
 *
 * 「汎用の面接練習」を「“あなたの企業・職種・あなたのES”に合わせた本番直結の練習」に
 * 変えるのがこのアプリの価値の核。フリーはシナリオ＋難易度まで、
 * 企業・職種・提出資料に基づく深掘り(=本物の面接対策)はプレミアム限定にする。
 */

export type ScenarioKey =
  | "general"
  | "shinsotsu"
  | "engineer"
  | "koumuin"
  | "kango"
  | "eigyo"
  | "daini";

export type DifficultyKey = "gentle" | "normal" | "pressure";

export type InterviewSetup = {
  scenario: ScenarioKey;
  difficulty: DifficultyKey;
  /** 以下はプレミアム限定で意味を持つ */
  company?: string;
  role?: string;
  focus?: string;
  /** 候補者のES・自己PR・職務経歴など */
  material?: string;
};

export const SCENARIOS: {
  key: ScenarioKey;
  label: string;
  description: string;
  hint: string;
  firstQuestion: string;
}[] = [
  {
    key: "general",
    label: "おまかせ（一般）",
    description: "業界を限定しない標準的な面接",
    hint: "一般的な採用面接として、経験・志望動機・人柄をバランスよく確認する。",
    firstQuestion:
      "これまでのご経験の中で、最も成果が出た取り組みを1つ教えてください。役割・期間・成果を具体的にお願いします。",
  },
  {
    key: "shinsotsu",
    label: "新卒・総合職",
    description: "ガクチカ・自己PR・志望動機中心",
    hint: "新卒総合職の面接として、学生時代の取り組み(ガクチカ)・自己PR・志望動機・将来像を深掘りする。ポテンシャルと人柄を重視する。",
    firstQuestion:
      "学生時代に最も力を入れたことを教えてください。なぜ取り組み、どんな役割で、どんな成果が出たのかを具体的にお願いします。",
  },
  {
    key: "engineer",
    label: "転職・ITエンジニア",
    description: "技術経験・実績・チーム開発",
    hint: "中途のITエンジニア面接として、技術スタック・担当範囲・設計判断・チーム開発・実績(数値)を深掘りする。なぜその技術を選んだかの根拠を重視する。",
    firstQuestion:
      "直近で担当された開発について教えてください。使用技術、ご自身の担当範囲、難しかった技術的判断を具体的にお願いします。",
  },
  {
    key: "koumuin",
    label: "公務員",
    description: "志望動機・公共性・人物重視",
    hint: "公務員採用面接として、志望動機・公共への貢献意欲・協調性・倫理観・地域や住民への関心を確認する。落ち着いた口調で人物像を丁寧に掘る。",
    firstQuestion:
      "公務員を志望される理由を教えてください。なぜ民間ではなく行政なのか、ご自身の経験を交えて具体的にお願いします。",
  },
  {
    key: "kango",
    label: "看護・医療",
    description: "志望動機・患者対応・チーム医療",
    hint: "看護・医療職の面接として、志望動機・患者対応の姿勢・チーム医療での役割・困難な状況への対応・倫理観を確認する。共感的だが具体性を求める。",
    firstQuestion:
      "看護(医療)職を志望される理由と、これまでの実習や経験で印象に残っている患者対応を具体的に教えてください。",
  },
  {
    key: "eigyo",
    label: "営業職",
    description: "実績・数値・顧客対応",
    hint: "営業職の面接として、売上や目標達成などの数値実績・顧客との関係構築・失注からの学び・再現性のあるプロセスを深掘りする。",
    firstQuestion:
      "これまでの営業で最も成果を出した事例を教えてください。目標に対する達成度や、成果を出すために工夫した点を数字を交えてお願いします。",
  },
  {
    key: "daini",
    label: "第二新卒",
    description: "短期離職の説明・志望動機",
    hint: "第二新卒の面接として、前職の経験・退職理由の納得感・志望動機・今後の成長意欲を確認する。退職理由は前向きな言語化ができているかを見る。",
    firstQuestion:
      "現職(前職)での経験と、転職を考えた理由を教えてください。退職理由は前向きな言葉で具体的にお願いします。",
  },
];

export const DIFFICULTIES: {
  key: DifficultyKey;
  label: string;
  description: string;
  hint: string;
}[] = [
  {
    key: "gentle",
    label: "和やか",
    description: "リラックスして練習",
    hint: "口調は柔らかく、候補者が話しやすい雰囲気を作る。深掘りは穏やかに、励ましを交える。",
  },
  {
    key: "normal",
    label: "標準",
    description: "本番に近い緊張感",
    hint: "口調は冷静・丁寧。淡々と進めつつ、抽象的な回答には具体化を求める。",
  },
  {
    key: "pressure",
    label: "圧迫（厳しめ）",
    description: "厳しい面接官を想定",
    hint: "口調は厳しめで、回答の矛盾や曖昧さを容赦なく指摘する。ただし人格否定・侮辱は絶対にしない。あくまで内容への厳しさに留める。",
  },
];

export function getScenario(key: ScenarioKey) {
  return SCENARIOS.find((s) => s.key === key) ?? SCENARIOS[0];
}

export function getDifficulty(key: DifficultyKey) {
  return DIFFICULTIES.find((d) => d.key === key) ?? DIFFICULTIES[1];
}

const BASE_PROMPT = `【役割】
あなたは日本語で話す、厳格だが公平な採用担当者です。候補者を尊重しつつ、執拗に深掘りして事実と再現性を確認します。

【話し方】
- 返答は「復唱 + 確認 + 質問」の順で組み立てる。
- 質問は必ず1つずつ。抽象的な回答には具体化を要求する。
- 候補者の発言には必ず「なるほど」「承知しました」などの相槌を入れる。

【評価の観点】
- 具体性（事実・数値・期間・役割が明確か）
- 一貫性（過去の発言と矛盾していないか）
- 再現性（同様の成果を再現できる条件が説明できるか）
- 因果（なぜそうしたか、何が変化したか）
- 責任範囲（意思決定や担当範囲が明確か）
- 失敗対応（失敗の原因・学び・再発防止が語れるか）

【進行ルール】
- 回答が抽象的なら、例・数字・具体エピソードが出るまで問い直す。
- 「なぜ」「具体的に」「どうやって」を軸に、論点を深掘りする。
- 1問につき最大3回まで深掘りし、その後は次の質問へ進む。
- 思考プロセスと行動を分けて質問する。
- 候補者の言葉を要約してから確認し、矛盾があれば静かに指摘する。

【NG】
- 人格否定や不適切な表現は禁止。
- 誘導質問や決めつけは避ける。`;

/**
 * Geminiの対話モデルへ渡すシステムプロンプトを組み立てる。
 * @param setup  面接設定（null ならデフォルトの一般面接）
 * @param isPremium  プレミアム会員なら企業/職種/提出資料による個別化を有効にする
 */
export function buildInterviewPrompt(
  setup: InterviewSetup | null,
  isPremium: boolean
): string {
  const scenario = getScenario(setup?.scenario ?? "general");
  const difficulty = getDifficulty(setup?.difficulty ?? "normal");

  const sections: string[] = [BASE_PROMPT];

  sections.push(`【今回の面接シナリオ】\n${scenario.hint}`);
  sections.push(`【面接官のトーン】\n${difficulty.hint}`);

  // ここから先はプレミアム限定の個別化
  if (isPremium && setup) {
    const personal: string[] = [];
    if (setup.company?.trim()) {
      personal.push(
        `応募先企業は「${setup.company.trim()}」。この企業を受ける候補者として、志望動機の具体性や企業理解、カルチャーフィットを意識して質問する。`
      );
    }
    if (setup.role?.trim()) {
      personal.push(
        `応募職種は「${setup.role.trim()}」。この職種で求められる能力・経験に沿って深掘りする。`
      );
    }
    if (setup.focus?.trim()) {
      personal.push(`候補者が特に練習したい点:「${setup.focus.trim()}」。ここを重点的に扱う。`);
    }
    if (setup.material?.trim()) {
      const material = setup.material.trim().slice(0, 4000);
      personal.push(
        `以下は候補者が提出した応募書類（自己PR・ガクチカ・職務経歴など）です。必ず内容を踏まえ、ここに書かれた具体的な経験・実績を1つずつ取り上げて深掘りしてください。曖昧な記述や数字の根拠は重点的に問い直してください。\n----- 応募書類ここから -----\n${material}\n----- 応募書類ここまで -----`
      );
    }
    if (personal.length > 0) {
      sections.push(`【この候補者に合わせた個別化】\n${personal.join("\n")}`);
    }
  }

  sections.push(`【最初の質問】\n「${scenario.firstQuestion}」`);

  return sections.join("\n\n") + "\n";
}

/** 採点プロンプトに足す、面接文脈の説明（company_match の判定に使う） */
export function buildJudgeContext(
  setup: InterviewSetup | null,
  isPremium: boolean
): string {
  const scenario = getScenario(setup?.scenario ?? "general");
  const lines = [`面接の種類: ${scenario.label}`];
  if (isPremium && setup?.company?.trim()) {
    lines.push(`応募先企業: ${setup.company.trim()}`);
  }
  if (isPremium && setup?.role?.trim()) {
    lines.push(`応募職種: ${setup.role.trim()}`);
  }
  return lines.join(" / ");
}
