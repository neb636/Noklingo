"use client";

import { ArrowRight, ExternalLink, FileWarning, Film, LockKeyhole, Play, RotateCcw } from "lucide-react";
import Image from "next/image";
import { AppLink } from "@/components/AppLink";
import { PageHeader } from "@/components/PageHeader";
import { lessons, studyLessons } from "@/domain/seed";
import { assetPath } from "@/lib/asset-path";
import { useStudyStore } from "@/state/study-store";

export default function LibraryPage() {
  const progress = useStudyStore((state) => state.lessonProgress);
  const session = useStudyStore((state) => state.activeSession);
  const mastered = new Set(progress.filter((item) => item.status === "mastered").map((item) => item.lessonId));
  const firstUnmastered = studyLessons.find((lesson) => !mastered.has(lesson.id));
  const draftLessons = lessons.filter((lesson) => lesson.contentStatus === "draft");

  return <div className="page">
    <PageHeader eyebrow="Lesson library" title="Short exchanges, kept in order." intro="Published lessons unlock in sequence. Supplied Reel media stays in a separate editorial shelf until its language, audio, captions, and question bank pass review." side={<span className="count-label">{studyLessons.length} published · {draftLessons.length} drafts</span>} />

    <section className="library-section" aria-labelledby="published-heading">
      <div className="section-heading"><div><p className="eyebrow">Scored curriculum</p><h2 id="published-heading">Published lessons</h2></div><span>{studyLessons.length} ready</span></div>
      {studyLessons.length === 0 ? <div className="curriculum-hold tactile-card"><FileWarning size={22} aria-hidden="true" /><div><h3>Editorial review comes first</h3><p>No Reel has the verified transcript, phrase audio, cue-card coverage, and quiz variants required for scored study. Draft previews remain available below without affecting progress.</p></div></div> : null}
      <div className="library-list">{studyLessons.map((lesson) => {
      const lessonState = progress.find((item) => item.lessonId === lesson.id)?.status ?? "unseen";
      const isMastered = lessonState === "mastered";
      const isActive = firstUnmastered?.id === lesson.id && studyLessons.some((item) => item.id === lesson.id);
      const resumable = session?.lessonId === lesson.id;
      const locked = !isMastered && !isActive;
      return <article className={`lesson-row ${locked ? "locked" : ""}`} key={lesson.id}>
        <div className="lesson-number">{String(lesson.order).padStart(2, "0")}</div>
        <div className="lesson-still">{!locked && lesson.media.availability === "available" ? <Image src={assetPath(lesson.media.posterSrc)} width={320} height={180} unoptimized alt="" /> : <Film size={24} />}<span>{lesson.media.durationSeconds}s</span></div>
        <div className="lesson-copy"><div className="lesson-labels"><span>{resumable ? "session in progress" : isMastered ? "mastered" : isActive ? lessonState.replace("-", " ") : "locked"}</span><span>{lesson.contentStatus} content</span></div><h2>{lesson.title}</h2><p>{lesson.description}</p><small>{lesson.objective}</small>{lesson.source && <a className="source-note" href={lesson.source.url} target="_blank" rel="noreferrer">Content source note <ExternalLink size={12} /></a>}</div>
        {resumable ? <AppLink href="/study/" className="round-link" aria-label={`Resume ${lesson.title}`}><ArrowRight /></AppLink>
          : isMastered ? <AppLink href={`/study/?replay=${encodeURIComponent(lesson.id)}`} className="round-link replay-link" aria-label={`Replay ${lesson.title}`}><RotateCcw /></AppLink>
          : isActive ? <AppLink href="/today/" className="round-link" aria-label={`Open ${lesson.title}`}><ArrowRight /></AppLink>
          : <div className="locked-label"><LockKeyhole size={17} />Not yet available</div>}
      </article>;
      })}</div>
    </section>

    <section className="library-section draft-library" aria-labelledby="draft-heading">
      <div className="section-heading"><div><p className="eyebrow">Local media intake</p><h2 id="draft-heading">Draft lesson plans</h2><p>Ordered from foundational vocabulary toward everyday situations and more colloquial language.</p></div><span>{draftLessons.length} local clips</span></div>
      <div className="draft-lesson-grid">{draftLessons.map((lesson) => <article className="draft-lesson-card tactile-card" key={lesson.id}>
        <AppLink href={`/study/?preview=${encodeURIComponent(lesson.id)}`} className="draft-poster" aria-label={`Preview draft clip: ${lesson.title}`}>
          <Image src={assetPath(lesson.media.posterSrc)} width={360} height={640} sizes="(max-width: 700px) 42vw, (max-width: 1100px) 24vw, 210px" unoptimized alt="" />
          <span className="draft-order">{String(lesson.order).padStart(2, "0")}</span>
          <span className="draft-duration">{formatDuration(lesson.media.durationSeconds)}</span>
          <span className="draft-play"><Play size={18} fill="currentColor" aria-hidden="true" /></span>
        </AppLink>
        <div className="draft-card-copy"><div className="lesson-labels"><span>draft plan</span><span>{lesson.media.captionsStatus === "machine-draft" ? "machine notes" : "video only"}</span></div><h3>{lesson.title}</h3><p>{lesson.objective.replace(/^Draft plan —\s*/, "")}</p>
          <div className="draft-card-actions"><AppLink href={`/study/?preview=${encodeURIComponent(lesson.id)}`} className="text-link">Preview local clip <ArrowRight size={14} /></AppLink>{lesson.source && <a className="source-note" href={lesson.source.url} target="_blank" rel="noreferrer" aria-label={`Open source attribution for ${lesson.title}`}>Attribution <ExternalLink size={12} /></a>}</div>
        </div>
      </article>)}</div>
    </section>
    <p className="library-footnote">Locked published lessons do not create video elements or preload media. Draft previews are explicit, unscored editorial views.</p>
  </div>;
}

function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}
