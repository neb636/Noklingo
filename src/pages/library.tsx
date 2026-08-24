"use client";

import { ArrowRight, Film, LockKeyhole } from "lucide-react";
import { lessons } from "@/domain/seed";
import { PageHeader } from "@/components/PageHeader";
import { useStudyStore } from "@/state/study-store";
import { AppLink } from "@/components/AppLink";

export default function LibraryPage() {
  const progress = useStudyStore((state) => state.lessonProgress);
  return (
    <div className="page">
      <PageHeader eyebrow="Lesson library" title="Short exchanges, kept in order." intro="Replay anything already introduced. New lessons open only after the earlier language has had a chance to settle." side={<span className="count-label">{lessons.length} lessons</span>} />
      <div className="library-list">
        {lessons.map((lesson, index) => {
          const state = progress.find((item) => item.lessonId === lesson.id)?.status ?? "unseen";
          const locked = index > 0;
          return (
            <article className={`lesson-row ${locked ? "locked" : ""}`} key={lesson.id}>
              <div className="lesson-number">{String(lesson.order).padStart(2, "0")}</div>
              <div className="lesson-still"><Film size={24} /><span>{lesson.media.durationSeconds}s</span></div>
              <div className="lesson-copy"><div className="lesson-labels"><span>{locked ? "Planned" : state.replace("-", " ")}</span><span>Language draft</span></div><h2>{lesson.title}</h2><p>{lesson.description}</p><small>{lesson.objective}</small></div>
              {locked ? <div className="locked-label"><LockKeyhole size={17} />Not yet available</div> : <AppLink href="/study/" className="round-link" aria-label={`Open ${lesson.title}`}><ArrowRight /></AppLink>}
            </article>
          );
        })}
      </div>
      <p className="library-footnote">Lesson availability follows editorial readiness and review, not a points threshold.</p>
    </div>
  );
}
