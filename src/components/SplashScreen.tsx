import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 1500 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden"
        >
          {/* خلفية النمط الإسلامي المتحركة */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 1, 0]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute inset-0 islamic-pattern opacity-15"
          />

          {/* تأثير التوهج الخلفي الكبير */}
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.15, 0.3, 0.15]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute w-80 h-80 rounded-full bg-primary/30 blur-[100px]"
          />

          {/* تأثير توهج ثانوي */}
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5
            }}
            className="absolute w-96 h-96 rounded-full bg-accent/20 blur-[120px]"
          />

          {/* حاوية المحتوى الرئيسية */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 150,
              damping: 20,
              delay: 0.15
            }}
            className="relative z-10 flex flex-col items-center gap-10"
          >
            {/* الشعار مع تأثير النبض المحسن */}
            <motion.div
              animate={{
                scale: [1, 1.08, 1, 1.04, 1],
                filter: ['brightness(1)', 'brightness(1.15)', 'brightness(1)', 'brightness(1.1)', 'brightness(1)']
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="relative"
            >
              {/* حلقة التوهج الخارجية */}
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.4, 0.1, 0.4]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40 blur-2xl"
              />

              {/* حلقة التوهج الداخلية */}
              <motion.div
                animate={{
                  scale: [1.1, 1.25, 1.1],
                  opacity: [0.5, 0.2, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.3
                }}
                className="absolute -inset-2 rounded-3xl bg-primary/30 blur-xl"
              />

              {/* الشعار */}
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-card border-2 border-border shadow-2xl flex items-center justify-center overflow-hidden">
                <img
                  src="/favicon.jpg"
                  alt="صندوق الفتوى مسجد الإيمان"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>

            {/* اسم التطبيق مع أنيميشن سلس */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.5,
                duration: 0.7,
                ease: [0.4, 0, 0.2, 1]
              }}
              className="text-center"
            >
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-4xl font-bold text-black mb-2"
              >
                صندوق الفتوى
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-xl text-black/80 font-medium"
              >
                مسجد الإيمان – 150 مسكن
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-black/60 text-sm mt-3 font-mono dir-ltr"
              >
                النسخة 1.2.0
              </motion.p>
            </motion.div>
          </motion.div>

          {/* مؤشر التحميل المحسن */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="absolute bottom-20 flex flex-col items-center gap-5"
          >
            <div className="flex gap-3">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, -12, 0],
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeInOut'
                  }}
                  className="w-3 h-3 rounded-full bg-primary shadow-lg"
                  style={{
                    boxShadow: '0 0 10px hsl(var(--primary) / 0.5)'
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}