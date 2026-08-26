"use client";

import { ArrowRight, ExternalLink, Play } from "lucide-react";
import Image from "next/image";
import { AppLink } from "@/components/AppLink";
import { PageHeader } from "@/components/PageHeader";
import { cueCards, lessons } from "@/domain/seed";
import { assetPath } from "@/lib/asset-path";

export default function LibraryPage() {
  const firstLesson = lessons[0];
  const remainingLessons = lessons.slice(1);

  return <div className="page">
    <PageHeader
      eyebrow="Lesson library"
      title="Useful Thai, one short lesson at a time."
      intro="Watch a real exchange, notice the language that matters, and return whenever you want a phrase to feel familiar."
      side={<span className="count-label">{lessons.length} short lessons</span>}
    />

    {firstLesson && <section className="collection-start tactile-card" aria-labelledby="start-heading">
      <AppLink href={`/study/?preview=${encodeURIComponent(firstLesson.id)}`} className="collection-start-poster" aria-label={`Watch lesson 1: ${firstLesson.title}`}>
        <Image src={assetPath(firstLesson.media.posterSrc)} width={480} height={853} priority unoptimized alt="" />
        <span className="collection-play"><Play size={18} fill="currentColor" aria-hidden="true" /></span>
      </AppLink>
      <div className="collection-start-copy">
        <p className="eyebrow">Start here · lesson {String(firstLesson.order).padStart(2, "0")}</p>
        <h2 id="start-heading">{firstLesson.title}</h2>
        <p>{firstLesson.description}</p>
        <div className="collection-meta"><span>{formatDuration(firstLesson.media.durationSeconds)} to watch</span><span>{cardCount(firstLesson.id)} phrase cards</span></div>
        <AppLink href={`/study/?preview=${encodeURIComponent(firstLesson.id)}`} className="primary-button">Watch lesson <ArrowRight size={17} /></AppLink>
      </div>
    </section>}

    <section className="library-section lesson-collection" aria-labelledby="collection-heading">
      <div className="section-heading"><div><p className="eyebrow">Your collection</p><h2 id="collection-heading">Keep exploring</h2><p>From everyday building blocks to moments you can use in conversation.</p></div><span>{remainingLessons.length} more lessons</span></div>
      <div className="lesson-collection-grid">{remainingLessons.map((lesson) => <article className="lesson-collection-card tactile-card" key={lesson.id}>
        <AppLink href={`/study/?preview=${encodeURIComponent(lesson.id)}`} className="lesson-poster" aria-label={`Watch lesson ${lesson.order}: ${lesson.title}`}>
          <Image src={assetPath(lesson.media.posterSrc)} width={360} height={640} sizes="(max-width: 700px) 42vw, (max-width: 1100px) 24vw, 210px" unoptimized alt="" />
          <span className="lesson-order">{String(lesson.order).padStart(2, "0")}</span>
          <span className="lesson-duration">{formatDuration(lesson.media.durationSeconds)}</span>
          <span className="lesson-play"><Play size={18} fill="currentColor" aria-hidden="true" /></span>
        </AppLink>
        <div className="lesson-card-copy"><div className="lesson-labels"><span>Watch &amp; notice</span><span>{cardCount(lesson.id)} phrases</span></div><h3>{lesson.title}</h3><p>{lesson.objective.replace(/^Draft plan —\s*/, "")}</p>
          <div className="lesson-card-actions"><AppLink href={`/study/?preview=${encodeURIComponent(lesson.id)}`} className="text-link">Open lesson <ArrowRight size={14} /></AppLink>{lesson.source && <a className="source-note" href={lesson.source.url} target="_blank" rel="noreferrer" aria-label={`Open source attribution for ${lesson.title}`}>Source <ExternalLink size={12} /></a>}</div>
        </div>
      </article>)}</div>
    </section>
    <p className="library-footnote">Lessons are short, self-paced explorations. Watching and phrase cards never change your learning record.</p>
  </div>;
}

function cardCount(lessonId: string) {
  return cueCards.filter((card) => card.lessonId === lessonId).length;
}

function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}
