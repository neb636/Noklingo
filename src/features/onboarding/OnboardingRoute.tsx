import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Flame,
  HeartHandshake,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { Mascot, NokLogo } from "@/src/components/Mascot";
import { Button, ProgressBar } from "@/src/components/ui";
import type { Profile } from "@/src/domain/types";
import { useAppStore } from "@/src/store/useAppStore";

const motivations = [
  {
    value: "Talk with family",
    label: "Talk with family",
    icon: HeartHandshake,
  },
  { value: "Travel with ease", label: "Travel with ease", icon: MapPin },
  {
    value: "Everyday conversation",
    label: "Everyday conversation",
    icon: MessageCircle,
  },
];

const familiarity: {
  value: Profile["familiarity"];
  label: string;
  detail: string;
}[] = [
  { value: "new", label: "Brand new", detail: "Start with the essentials" },
  {
    value: "some",
    label: "I know a little",
    detail: "I recognize a few phrases",
  },
  {
    value: "comfortable",
    label: "Conversation basics",
    detail: "I can handle simple exchanges",
  },
];

export function OnboardingRoute() {
  const finishOnboarding = useAppStore((state) => state.finishOnboarding);
  const [step, setStep] = useState(0);
  const [motivation, setMotivation] = useState("Talk with family");
  const [dailyGoal, setDailyGoal] = useState(20);
  const [level, setLevel] = useState<Profile["familiarity"]>("new");
  const [politeParticle, setPoliteParticle] =
    useState<Profile["politeParticle"]>("khrap");

  const finish = () =>
    finishOnboarding({
      motivation,
      dailyGoal,
      familiarity: level,
      politeParticle,
    });

  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <NokLogo />
        <button className="text-button" onClick={finish}>
          Skip for now
        </button>
      </header>
      <ProgressBar
        value={((step + 1) / 4) * 100}
        label={`Onboarding step ${step + 1} of 4`}
      />

      <div className="onboarding-layout">
        <div className="onboarding-mascot-wrap">
          <div className="speech-bubble">
            {step === 0 && "Sà-wàt-dee! I’m Nok. Let’s get you speaking Thai."}
            {step === 1 && "A little every day beats a lot once in a while."}
            {step === 2 && "Perfect. I’ll meet you right where you are."}
            {step === 3 && "One tiny choice keeps every example in your voice."}
          </div>
          <Mascot size="large" mood={step === 3 ? "proud" : "happy"} />
        </div>

        <section className="onboarding-card">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <>
                  <span className="eyebrow">Your reason</span>
                  <h1>What brings you to Thai?</h1>
                  <p className="section-lede">
                    We’ll keep your learning path focused on the conversations
                    that matter.
                  </p>
                  <div className="select-stack">
                    {motivations.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        className={`select-card ${motivation === value ? "selected" : ""}`}
                        onClick={() => setMotivation(value)}
                      >
                        <span className="select-icon">
                          <Icon size={23} />
                        </span>
                        <strong>{label}</strong>
                        {motivation === value && (
                          <Check size={20} className="select-check" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <span className="eyebrow">Your pace</span>
                  <h1>Choose a daily goal</h1>
                  <p className="section-lede">
                    You can change this anytime. We recommend a quick 5-minute
                    rhythm.
                  </p>
                  <div className="goal-grid">
                    {[10, 20, 30].map((goal) => (
                      <button
                        key={goal}
                        className={`goal-card ${dailyGoal === goal ? "selected" : ""}`}
                        onClick={() => setDailyGoal(goal)}
                      >
                        <Flame size={24} />
                        <strong>{goal} XP</strong>
                        <span>
                          {goal === 10
                            ? "Easy"
                            : goal === 20
                              ? "Regular"
                              : "Driven"}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <span className="eyebrow">Starting point</span>
                  <h1>How much Thai do you know?</h1>
                  <p className="section-lede">
                    No judgment. Nok is a very patient bird.
                  </p>
                  <div className="select-stack">
                    {familiarity.map((option) => (
                      <button
                        key={option.value}
                        className={`select-card select-card-copy ${level === option.value ? "selected" : ""}`}
                        onClick={() => setLevel(option.value)}
                      >
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.detail}</small>
                        </span>
                        {level === option.value && (
                          <Check size={20} className="select-check" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <span className="eyebrow">Your polite ending</span>
                  <h1>Which particle do you usually say?</h1>
                  <p className="section-lede">
                    Thai speakers commonly use <strong>khrap</strong> or{" "}
                    <strong>kha</strong> according to their own speaking style.
                    It follows the speaker, not the listener.
                  </p>
                  <div className="select-stack">
                    {[
                      {
                        value: "khrap" as const,
                        label: "I use khrap",
                        detail:
                          "Personalized practice uses khrap; listening still teaches both.",
                      },
                      {
                        value: "kha" as const,
                        label: "I use kha",
                        detail:
                          "Personalized practice uses kha; listening still teaches both.",
                      },
                    ].map((option) => (
                      <button
                        key={option.value}
                        className={`select-card select-card-copy ${politeParticle === option.value ? "selected" : ""}`}
                        onClick={() => setPoliteParticle(option.value)}
                      >
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.detail}</small>
                        </span>
                        {politeParticle === option.value && (
                          <Check size={20} className="select-check" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="onboarding-actions">
            {step > 0 && (
              <Button
                tone="ghost"
                onClick={() => setStep((value) => value - 1)}
                aria-label="Go back"
              >
                <ChevronLeft size={22} />
              </Button>
            )}
            <Button
              full
              onClick={() =>
                step === 3 ? finish() : setStep((value) => value + 1)
              }
            >
              {step === 3 ? "Start learning" : "Continue"}
              <ArrowRight size={20} />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
