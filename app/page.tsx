import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800">
      <main className="max-w-md w-full p-6 text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter text-blue-700">
            MenSetsu
          </h1>
          <p className="text-sm text-slate-500 font-medium">内定を決める15分</p>
        </div>
        <div className="py-8">
          <div className="w-32 h-32 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-6 relative overflow-hidden">
            <span className="text-4xl">🎙️</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">
            面接練習を、
            <br />
            もっと手軽に。
          </h2>
        </div>
        <Link
          href="/interview"
          className="block w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg"
        >
          面接を始める
        </Link>
      </main>
    </div>
  );
}