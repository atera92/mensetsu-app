import { Suspense } from "react";
import MypageClient from "./MypageClient"; // さっき作ったファイルを読み込む

export default function Page() {
  return (
    // この Suspense があることで、Vercelのビルドエラーが消えます
    <Suspense fallback={<div className="p-12 text-center text-slate-500">読み込み中...</div>}>
      <MypageClient />
    </Suspense>
  );
}