"use client";

import { ArrowRight, Clock3, Headphones, RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { firstLesson } from "@/domain/seed";
import { PageHeader } from "@/components/PageHeader";
import { useStudyStore } from "@/state/study-store";
import { AppLink } from "@/components/AppLink";

export default function TodayPage() {
  const progress = useStudyStore((state) => state.lessonProgress.find((item) => item.lessonId === firstLesson.id));
  const reviewStates = useStudyStore((state) => state.reviewStates);
  const reduce = useReducedMotion();
  const due = reviewStates.filter((item) => new Date(item.dueAt) <= new Date()).length;
  const returning = progress?.status && progress.status !== "unseen";

  return (
    <div className="page page-today">
      <PageHeader
        eyebrow="Monday · a short session"
        title="Listen for what people actually say."
        intro="One clip, a handful of useful phrases, and a first attempt from memory. About eight quiet minutes."
        side={<span className="draft-pill">Draft lesson content</span>}
      />

      <motion.section
        className="today-action tactile-card"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
      >
        <div className="action-number">01</div>
        <div className="action-copy">
          <p className="eyebrow">{returning ? "Continue the first pass" : "Your next study action"}</p>
          <h2>{firstLesson.title}</h2>
          <p>{firstLesson.objective}</p>
          <div className="meta-row">
            <span><Clock3 size={16} /> 8 minutes</span>
            <span><Headphones size={16} /> Audio optional</span>
            <span><RotateCcw size={16} /> {due ? `${due} due` : "Recall begins tomorrow"}</span>
          </div>
        </div>
        <AppLink href="/study/" className="primary-button">
          {returning ? "Continue study" : "Begin first pass"}<ArrowRight size={18} />
        </AppLink>
      </motion.section>

      <section className="method-strip" aria-label="Learning method">
        <div><span>Watch</span><p>Meet the language in a real exchange.</p></div>
        <div><span>Notice</span><p>Keep only phrases worth carrying.</p></div>
        <div><span>Retrieve</span><p>Try tomorrow, before looking.</p></div>
        <div><span>Return</span><p>Review at widening intervals.</p></div>
      </section>

      <aside className="editorial-note">
        <span className="note-rule" />
        <p>“The useful moment is not recognition. It is the small pause before a phrase comes back.”</p>
        <span>Study note</span>
      </aside>
    </div>
  );
}
