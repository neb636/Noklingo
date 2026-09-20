"use client";

import Image from "next/image";
import { Clock3, Layers3, Play } from "lucide-react";
import { AppLink } from "@/components/AppLink";
import { PageHeader } from "@/components/PageHeader";
import { cueCards, lessons } from "@/domain/seed";
import { assetPath } from "@/lib/asset-path";
import { useClientReady } from "@/lib/use-client-ready";
import { orderKidsLessonsForSession } from "@/lib/kids-session";
import { filterLessonsForKidsMode, lessonPosterSrc } from "@/lib/lesson-audience";
import { useStudyStore } from "@/state/study-store";

export default function Library2Page() {
  const kidsMode = useStudyStore((state) => state.settings.kidsMode);
  const clientReady = useClientReady();
  const filteredLessons = filterLessonsForKidsMode(lessons, kidsMode);
  const visibleLessons = kidsMode && clientReady ? orderKidsLessonsForSession(filteredLessons) : filteredLessons;

  return <div className="page library-2-page">
    <PageHeader
      eyebrow={kidsMode ? "Pick a lesson" : "Library 2"}
      title={kidsMode ? "What do you want to watch?" : "Watch Thai in the moment."}
      intro={kidsMode ? "Choose any picture to start." : "A mobile reel experiment: watch the whole clip, then open the phrases worth keeping."}
      side={<span className="count-label">{visibleLessons.length} {kidsMode ? "kids " : ""}reels</span>}
    />
    <section className="reel-library" aria-labelledby="reel-library-heading">
      <div className="reel-library-heading">
        <div><p className="eyebrow">{kidsMode ? "Choose one" : "Pick a reel"}</p><h2 id="reel-library-heading">{kidsMode ? "Lessons" : "Start with a real moment"}</h2></div>
        {!kidsMode && <span>Swipe between lessons after you open one.</span>}
      </div>
      <div className="reel-library-grid">
        {visibleLessons.map((lesson) => {
          const cards = cueCards.filter((card) => card.lessonId === lesson.id).length;
          const videoOnly = lesson.activityMode === "video-only";
          const posterSrc = lessonPosterSrc(lesson, kidsMode);
          return <AppLink key={lesson.id} href={`/library-2/${encodeURIComponent(lesson.id)}/`} className="reel-library-card" aria-label={kidsMode ? `Watch ${lesson.title}` : `Watch lesson ${lesson.order}: ${lesson.title}`}>
            <Image src={assetPath(posterSrc)} fill sizes="(max-width: 767px) 50vw, 260px" unoptimized alt="" className="reel-library-poster" />
            <span className="reel-library-shade" aria-hidden="true" />
            <span className="reel-library-play" aria-hidden="true"><Play size={17} fill="currentColor" /></span>
            {!kidsMode && <span className="reel-library-order">Lesson {String(lesson.order).padStart(2, "0")}</span>}
            <span className="reel-library-title">{lesson.topicEmoji} {lesson.title}</span>
            <span className="reel-library-meta"><Clock3 size={12} /> {formatDuration(lesson.media.durationSeconds)} <i /> {videoOnly ? "Video only" : <><Layers3 size={12} /> {cards}</>}</span>
          </AppLink>;
        })}
      </div>
    </section>
  </div>;
}

function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}
