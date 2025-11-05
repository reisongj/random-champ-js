import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image } from 'lucide-react';

export default function ImageViewerButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setShowModal(true)}
        className="glass px-3 py-2 text-white rounded-lg transition-all duration-200 border border-white/20 hover:border-white/40 flex items-center gap-2 text-sm"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Image className="w-4 h-4" />
        <span className="hidden sm:inline">view an fn</span>
      </motion.button>
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src="/IMG_7133.jpeg"
                alt="View"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 glass text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

