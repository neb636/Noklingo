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
          <AppLink href={`/study/?preview=${encodeURIComponent(lesson.id)}`} className="compact-lesson-link" aria-label={`Open lesson ${lesson.order}: ${lesson.title}`}>
            <div className="compact-lesson-poster" aria-hidden="true">
              <Image className="compact-lesson-backdrop" src={assetPath(lesson.media.posterSrc)} width={720} height={1280} sizes="(max-width: 767px) 112px, 168px" unoptimized alt="" />
              <Image className="compact-lesson-portrait" src={assetPath(lesson.media.posterSrc)} width={720} height={1280} sizes="(max-width: 767px) 92px, 126px" unoptimized alt="" />
              <span className="compact-lesson-play"><Play size={16} fill="currentColor" /></span>
            </div>
            <div className="compact-lesson-copy">
              <span className="compact-lesson-order">Lesson {String(lesson.order).padStart(2, "0")}</span>
              <div className="compact-lesson-title"><span className="lesson-topic-emoji" aria-hidden="true">{lesson.topicEmoji}</span><h3>{lesson.title}</h3></div>
              <p>{lesson.objective.replace(/^Draft plan —\s*/, "")}</p>
              <div className="compact-lesson-meta"><span><Clock3 size={14} /> {formatDuration(lesson.media.durationSeconds)}</span><span><Layers3 size={14} /> {cardCount(lesson.id)} cards</span></div>
              <span className="compact-lesson-action">Start lesson <ArrowRight size={17} /></span>
            </div>
          </AppLink>
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
