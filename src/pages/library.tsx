"use client";

import { ArrowRight, Clock3, Layers3, Play } from "lucide-react";
import Image from "next/image";
import { AppLink } from "@/components/AppLink";
import { PageHeader } from "@/components/PageHeader";
import { cueCards, lessons } from "@/domain/seed";
import { assetPath } from "@/lib/asset-path";

export default function LibraryPage() {
  return <div className="page library-page">
    <PageHeader
      eyebrow="Lesson library"
      title="Thai you can use today."
      intro="Short real-world videos, friendly cue cards, and a quick practice round—at your own pace."
      side={<span className="count-label">{lessons.length} lessons</span>}
    />

    <section className="lesson-library-section" aria-labelledby="lesson-library-heading">
      <div className="lesson-library-heading">
        <div><p className="eyebrow">Choose your next topic</p><h2 id="lesson-library-heading">Explore the collection</h2></div>
      </div>

      <div className="lesson-library-track" aria-label="Lesson collection">
        {lessons.map((lesson) => <article key={lesson.id} className="compact-lesson-card">
          <AppLink href={`/study/?preview=${encodeURIComponent(lesson.id)}`} className="compact-lesson-poster" aria-label={`Open lesson ${lesson.order}: ${lesson.title}`}>
            <Image src={assetPath(lesson.media.posterSrc)} width={720} height={1280} sizes="(max-width: 767px) 76vw, (max-width: 1200px) 31vw, 250px" unoptimized alt="" />
            <span className="compact-lesson-order">Lesson {lesson.order}</span>
            <span className="compact-lesson-play"><Play size={18} fill="currentColor" /></span>
          </AppLink>
          <div className="compact-lesson-copy">
            <span className="lesson-topic-emoji" aria-hidden="true">{lesson.topicEmoji}</span>
            <div><h3>{lesson.title}</h3><p>{lesson.objective.replace(/^Draft plan —\s*/, "")}</p></div>
            <div className="compact-lesson-meta"><span><Clock3 size={14} /> {formatDuration(lesson.media.durationSeconds)}</span><span><Layers3 size={14} /> {cardCount(lesson.id)} cards</span></div>
            <AppLink href={`/study/?preview=${encodeURIComponent(lesson.id)}`} className="compact-lesson-link">Open lesson <ArrowRight size={16} /></AppLink>
          </div>
        </article>)}
      </div>

    </section>
    <p className="library-footnote">Library visits and practice quizzes do not change your mastery record.</p>
  </div>;
}

function cardCount(lessonId: string) {
  return cueCards.filter((card) => card.lessonId === lessonId).length;
}

function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}
