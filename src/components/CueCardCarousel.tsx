"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, Sparkles, VolumeX } from "lucide-react";
import type { CueCard, VideoLesson } from "@/domain/schemas";
import { withPreferredParticle } from "@/lib/language-display";
import { pronunciationAudioAssets } from "@/lib/pronunciation-audio";
import { useStudyStore } from "@/state/study-store";
import { ConceptAudioButton } from "./PhraseAudioButton";

export function CueCardCarousel({
  lesson,
  cards,
  onBack,
  onComplete,
}: {
  lesson: VideoLesson;
  cards: CueCard[];
  onBack: () => void;
  onComplete: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [flippedId, setFlippedId] = useState<string>();
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const frontFlipRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const backFlipRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const flipFocusIndex = useRef<number | null>(null);
  const settings = useStudyStore((state) => state.settings);

  useEffect(() => {
    trackRef.current?.focus();
  }, []);

  useEffect(() => {
    const index = flipFocusIndex.current;
    if (index === null) return;
    (flippedId ? backFlipRefs.current[index] : frontFlipRefs.current[index])?.focus();
    flipFocusIndex.current = null;
  }, [flippedId]);

  function scrollTo(index: number) {
    const next = Math.max(0, Math.min(cards.length - 1, index));
    cardRefs.current[next]?.scrollIntoView?.({ behavior: settings.reduceMotion ? "auto" : "smooth", inline: "center", block: "nearest" });
    setFlippedId(undefined);
    setActiveIndex(next);
  }

  function syncActiveCard() {
    const track = trackRef.current;
    if (!track) return;
    const center = track.getBoundingClientRect().left + track.clientWidth / 2;
    let closest = 0;
    let distance = Number.POSITIVE_INFINITY;
    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const nextDistance = Math.abs(rect.left + rect.width / 2 - center);
      if (nextDistance < distance) {
        distance = nextDistance;
        closest = index;
      }
    });
    if (closest !== activeIndex) {
      setFlippedId(undefined);
      setActiveIndex(closest);
    }
  }

  if (!cards.length) {
    return <section className="cue-cards-screen"><StudyTopBar title="Cue cards" onBack={onBack} /><div className="lesson-empty-state"><span>🗂️</span><h1>No cue cards yet</h1><p>This lesson is still waiting for its phrase cards.</p></div></section>;
  }

  return (
    <section className="cue-cards-screen" onKeyDown={(event) => {
      if (event.target !== trackRef.current) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); scrollTo(activeIndex - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); scrollTo(activeIndex + 1); }
    }}>
      <StudyTopBar title="Cue cards" onBack={onBack} action={<span className="lesson-counter">{activeIndex + 1} / {cards.length}</span>} />
      <div className="cue-lesson-label"><span>Lesson {lesson.order}</span><b>{lesson.topicEmoji} {lesson.title}</b></div>

      <div className="cue-carousel-track" ref={trackRef} onScroll={syncActiveCard} tabIndex={0} aria-label={`${lesson.title} cue cards`}>
        {cards.map((card, index) => {
          const hasBack = Boolean(card.usage || card.literalNote || card.culturalNote);
          const hasAudio = Boolean(pronunciationAudioAssets(card).thaiSrc);
          const flipped = flippedId === card.id;
          return (
            <article
              key={card.id}
              ref={(node) => { cardRefs.current[index] = node; }}
              className={`learning-card${flipped ? " is-flipped" : ""}`}
              aria-label={`${card.naturalMeaning}, card ${index + 1} of ${cards.length}`}
            >
              <div className="learning-card-inner">
                <div className="learning-card-face learning-card-front" aria-hidden={flipped} inert={flipped}>
                  <span className="cue-emoji" aria-hidden="true">{card.emoji}</span>
                  <h2>{card.naturalMeaning}</h2>
                  {settings.showThaiScript && <p className="thai cue-card-thai" lang="th">{withPreferredParticle(card.thai, settings.politeParticle)}</p>}
                  {settings.showRomanization && <p className="cue-card-romanization">{withPreferredParticle(card.romanization, settings.politeParticle)}</p>}
                  {hasAudio ? <div className="cue-card-listen"><ConceptAudioButton card={card} compact /><span>Listen again</span></div> : <div className="cue-card-audio-unavailable"><VolumeX size={17} /><span>Audio coming soon</span></div>}
                  {hasBack && <button ref={(node) => { frontFlipRefs.current[index] = node; }} type="button" className="flip-card-button" onClick={() => { flipFocusIndex.current = index; setFlippedId(card.id); }}><RotateCcw size={18} /> Tap to flip</button>}
                </div>
                {hasBack && <div className="learning-card-face learning-card-back" aria-hidden={!flipped} inert={!flipped}>
                  <span className="cue-emoji small" aria-hidden="true">{card.emoji}</span>
                  <p className="eyebrow">How to use it</p>
                  <h2>{card.naturalMeaning}</h2>
                  {card.usage && <p>{card.usage}</p>}
                  {card.literalNote && <p><b>Literal note</b> {card.literalNote}</p>}
                  {card.culturalNote && <p><b>Context</b> {card.culturalNote}</p>}
                  <button ref={(node) => { backFlipRefs.current[index] = node; }} type="button" className="flip-card-button" onClick={() => { flipFocusIndex.current = index; setFlippedId(undefined); }}><RotateCcw size={18} /> Back to phrase</button>
                </div>}
              </div>
            </article>
          );
        })}
      </div>

      <div className="carousel-controls" aria-label="Cue card navigation">
        <button type="button" onClick={() => scrollTo(activeIndex - 1)} disabled={activeIndex === 0} aria-label="Previous cue card"><ArrowLeft size={20} /></button>
        <span><i style={{ width: `${((activeIndex + 1) / cards.length) * 100}%` }} /></span>
        <button type="button" onClick={() => scrollTo(activeIndex + 1)} disabled={activeIndex === cards.length - 1} aria-label="Next cue card"><ArrowRight size={20} /></button>
      </div>

      <div className="cue-cards-footer">
        {activeIndex === cards.length - 1 ? <button type="button" className="gradient-button" onClick={onComplete}><Sparkles size={18} /> Start practice quiz</button> : <button type="button" className="black-button" onClick={() => scrollTo(activeIndex + 1)}>Next card <ArrowRight size={19} /></button>}
      </div>
    </section>
  );
}

export function StudyTopBar({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
  return <header className="study-topbar"><button type="button" className="plain-icon-button" onClick={onBack} aria-label="Go back"><ArrowLeft size={24} /></button><strong>{title}</strong><div className="study-topbar-action">{action}</div></header>;
}
