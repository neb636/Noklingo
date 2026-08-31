"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Brain, CheckCircle2, RotateCcw } from "lucide-react";
import { AppLink } from "@/components/AppLink";
import { CueCardCarousel } from "@/components/CueCardCarousel";
import { MixedReviewQuiz } from "@/components/MixedReviewQuiz";
import { PageHeader } from "@/components/PageHeader";
import { cueCards } from "@/domain/seed";
import { eligibleMixedReviewCards } from "@/engine/mixed-review";
import { assetPath } from "@/lib/asset-path";
import { useStudyStore } from "@/state/study-store";

export default function ReviewPage() {
  const hydrated = useStudyStore((state) => state.hydrated);
  const lessonProgress = useStudyStore((state) => state.lessonProgress);
  const practiceCompletions = useStudyStore((state) => state.practiceCompletions);
  const session = useStudyStore((state) => state.activeMixedReviewSession);
  const startMixedReview = useStudyStore((state) => state.startMixedReview);
  const setMixedReviewCardIndex = useStudyStore((state) => state.setMixedReviewCardIndex);
  const startMixedReviewQuiz = useStudyStore((state) => state.startMixedReviewQuiz);
  const eligibilitySnapshot = { lessonProgress, practiceCompletions };
  const eligibleCards = eligibleMixedReviewCards(eligibilitySnapshot);

  useEffect(() => {
    if (hydrated && eligibleCards.length && !session) startMixedReview();
  }, [eligibleCards.length, hydrated, session, startMixedReview]);

  if (!hydrated) return <ReviewMessage title="Opening your review…" intro="Loading your completed lessons and saved place." />;
  if (!eligibleCards.length) return <ReviewMessage title="Your review deck is waiting." intro="Finish the cards and practice quiz in a Library lesson to add its phrases here." showLibrary />;
  if (!session) return <ReviewMessage title="Shuffling your cards…" intro="Building a mixed recall round from your completed lessons." />;

  if (session.stage === "cards") {
    const cardById = new Map(cueCards.map((card) => [card.id, card]));
    const cards = session.cardOrder.map((id) => cardById.get(id)).filter((card): card is (typeof cueCards)[number] => Boolean(card));
    return <CueCardCarousel
      cards={cards}
      mode="review"
      title="Review cards"
      contextLabel={`${session.eligibleLessonIds.length} lesson${session.eligibleLessonIds.length === 1 ? "" : "s"} · ${cards.length} cards`}
      initialIndex={session.cardIndex}
      onActiveIndexChange={setMixedReviewCardIndex}
      onBack={leaveReview}
      onComplete={startMixedReviewQuiz}
      completeLabel="Start mixed quiz"
    />;
  }

  if (session.stage === "quiz") return <MixedReviewQuiz session={session} onClose={leaveReview} />;

  return <ReviewComplete
    score={session.answers.filter((answer) => answer.correct).length}
    total={session.answers.length}
    lessonCount={session.eligibleLessonIds.length}
    onRestart={startMixedReview}
  />;
}

function leaveReview() {
  window.location.assign(assetPath("/today/"));
}

function ReviewMessage({ title, intro, showLibrary = false }: { title: string; intro: string; showLibrary?: boolean }) {
  return <div className="page review-page">
    <PageHeader eyebrow="Mixed recall" title={title} intro={intro} />
    {showLibrary && <AppLink href="/library/" className="primary-button">Browse lessons <ArrowRight size={17} /></AppLink>}
  </div>;
}

function ReviewComplete({ score, total, lessonCount, onRestart }: { score: number; total: number; lessonCount: number; onRestart: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const percent = total ? Math.round((score / total) * 100) : 0;
  useEffect(() => { headingRef.current?.focus(); }, []);
  return <div className="page review-page">
    <PageHeader eyebrow="Review complete" title="Every card had its turn." intro={`You recalled phrases from ${lessonCount} completed lesson${lessonCount === 1 ? "" : "s"}.`} />
    <section className="review-complete-card" aria-labelledby="review-score-heading">
      <span className="complete-emoji" aria-hidden="true">{percent >= 80 ? "🎉" : "🌱"}</span>
      <Brain size={28} aria-hidden="true" />
      <h2 id="review-score-heading" ref={headingRef} tabIndex={-1}>{score} of {total}</h2>
      <p>{percent}% recalled correctly. This practice score does not change mastery or scheduling.</p>
      <div className="review-complete-actions">
        <button type="button" className="gradient-button" onClick={onRestart}><RotateCcw size={18} /> Shuffle and review again</button>
        <AppLink href="/library/" className="soft-button">Back to Library</AppLink>
      </div>
      <span className="review-complete-status"><CheckCircle2 size={16} /> Review saved on this device</span>
    </section>
  </div>;
}
