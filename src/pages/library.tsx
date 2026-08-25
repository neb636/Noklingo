"use client";

import { ArrowRight, ExternalLink, Film, LockKeyhole, RotateCcw } from "lucide-react";
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

  return <div className="page">
    <PageHeader eyebrow="Lesson library" title="Short exchanges, kept in order." intro="Replay mastered material without changing its record. Future lessons stay quiet until the earlier language is mastered and their content is ready." side={<span className="count-label">{lessons.length} lessons</span>} />
    <div className="library-list">{lessons.map((lesson) => {
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
    <p className="library-footnote">Locked lessons do not create video elements, fetch posters, or preload media.</p>
  </div>;
}
