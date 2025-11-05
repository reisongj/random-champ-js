import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export default function ResetButton() {
  const { resetAllChampions } = useAppStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = () => {
    resetAllChampions();
    setShowConfirm(true);
    setTimeout(() => setShowConfirm(false), 2000);
  };

  return (
    <>
      <button
        onClick={handleReset}
        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
      >
        🔄 RESET ALL CHAMPIONS
      </button>
      {showConfirm && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          🔄 All Champions Reset!
        </div>
      )}
    </>
  );
}

