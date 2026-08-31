"use client";

import Image from "next/image";
import { Clock3, Layers3, Play } from "lucide-react";
import { AppLink } from "@/components/AppLink";
import { PageHeader } from "@/components/PageHeader";
import { cueCards, lessons } from "@/domain/seed";
import { assetPath } from "@/lib/asset-path";

export default function Library2Page() {
  return <div className="page library-2-page">
    <PageHeader
      eyebrow="Library 2"
      title="Watch Thai in the moment."
      intro="A mobile reel experiment: watch the whole clip, then open the phrases worth keeping."
      side={<span className="count-label">{lessons.length} reels</span>}
    />
    <section className="reel-library" aria-labelledby="reel-library-heading">
      <div className="reel-library-heading">
        <div><p className="eyebrow">Pick a reel</p><h2 id="reel-library-heading">Start with a real moment</h2></div>
        <span>Swipe between lessons after you open one.</span>
      </div>
      <div className="reel-library-grid">
        {lessons.map((lesson) => {
          const cards = cueCards.filter((card) => card.lessonId === lesson.id).length;
          const videoOnly = lesson.activityMode === "video-only";
          return <AppLink key={lesson.id} href={`/library-2/${encodeURIComponent(lesson.id)}/`} className="reel-library-card" aria-label={`Watch lesson ${lesson.order}: ${lesson.title}`}>
            <Image src={assetPath(lesson.media.posterSrc)} fill sizes="(max-width: 767px) 50vw, 260px" unoptimized alt="" className="reel-library-poster" />
            <span className="reel-library-shade" aria-hidden="true" />
            <span className="reel-library-play" aria-hidden="true"><Play size={17} fill="currentColor" /></span>
            <span className="reel-library-order">Lesson {String(lesson.order).padStart(2, "0")}</span>
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
