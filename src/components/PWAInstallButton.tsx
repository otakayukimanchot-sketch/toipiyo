import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { Download, Share2, PlusSquare, Check, X, Smartphone } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already running in installed standalone app, suppress prompt
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center space-x-1.5 font-mono cursor-pointer transition-colors ${
          compact
            ? "px-2 py-1 text-xs border border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
            : "w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold tracking-wider uppercase flex items-center justify-center space-x-2"
        }`}
        title="ホーム画面に追加"
      >
        <Download size={compact ? 13 : 15} />
        <span>ホーム画面に追加</span>
      </button>
    );
  }

  // iOS Safari flow (WebKit manual Share -> Add to Home Screen)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSModal(true)}
          className={`flex items-center space-x-1.5 font-mono cursor-pointer transition-colors ${
            compact
              ? "px-2 py-1 text-xs border border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
              : "w-full py-2.5 px-3 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs font-medium flex items-center justify-center space-x-2"
          }`}
          title="iPhoneのホーム画面に追加"
        >
          <Smartphone size={compact ? 13 : 15} />
          <span>ホーム画面に追加</span>
        </button>

        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowIOSModal(false)}>
            <div 
              className="w-full max-w-sm rounded-none border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <img src="/apple-touch-icon.png" alt="といぴよ" className="w-8 h-8 rounded-lg shadow-sm" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">ホーム画面に追加</h3>
                    <p className="text-[10px] font-mono text-gray-400">TOEIC 7-PART ENGINE</p>
                  </div>
                </div>
                <button onClick={() => setShowIOSModal(false)} className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-sans">
                <div className="flex items-start space-x-3 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                  <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white font-mono text-[11px] font-bold shrink-0">1</span>
                  <div>
                    Safari下部バーの <Share2 size={13} className="inline text-blue-600" /> <strong>「共有」</strong> ボタンをタップします。
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                  <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white font-mono text-[11px] font-bold shrink-0">2</span>
                  <div>
                    メニューから <PlusSquare size={13} className="inline text-blue-600" /> <strong>「ホーム画面に追加」</strong> を選択します。
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                  <span className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white font-mono text-[11px] font-bold shrink-0">3</span>
                  <div>
                    右上の <strong>「追加」</strong> をタップすると、洗練された「といぴよ」アイコンがホームに配置されます。
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2 bg-gray-950 dark:bg-white text-white dark:text-black font-semibold text-xs tracking-wider uppercase cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback for general desktop browsers / guidance
  return (
    <button
      onClick={() => {
        alert("ブラウザのメニュー（共有または設定）から「ホーム画面に追加」または「アプリをインストール」を選択してください。");
      }}
      className={`flex items-center space-x-1.5 font-mono cursor-pointer transition-colors ${
        compact
          ? "px-2 py-1 text-xs border border-gray-200 dark:border-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white"
          : "w-full py-2.5 px-3 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 text-gray-800 dark:text-gray-200 text-xs font-medium flex items-center justify-center space-x-2"
      }`}
      title="ホーム画面に追加"
    >
      <Download size={compact ? 13 : 15} />
      <span>ホーム画面に追加</span>
    </button>
  );
};
