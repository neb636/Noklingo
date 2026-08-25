"use client";

import { ArrowRight, BookOpen, CheckCircle2, Clock3, FileCheck2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { AppLink } from "@/components/AppLink";
import { writeSnapshot } from "@/data/db";
import { selectTodayAction } from "@/engine/learning-engine";
import { formatLocalDate, localDateKey } from "@/engine/local-date";
import { assetPath } from "@/lib/asset-path";
import { useClientReady } from "@/lib/use-client-ready";
import { snapshotFromState, useStudyStore } from "@/state/study-store";

export default function TodayPage() {
  const state = useStudyStore();
  const clientReady = useClientReady();
  const today = localDateKey();
  const action = state.hydrated ? selectTodayAction(snapshotFromState(state), today) : undefined;
  const dateLabel = clientReady
    ? new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).format(new Date())
    : "Today";

  async function start(kind: "introduction" | "mastery" | "standalone-review", lessonId?: string) {
    if (kind === "introduction" && lessonId) useStudyStore.getState().startIntroduction(lessonId);
    if (kind === "mastery" && lessonId) useStudyStore.getState().startMastery(lessonId);
    if (kind === "standalone-review") useStudyStore.getState().startStandaloneReview();
    await writeSnapshot(snapshotFromState(useStudyStore.getState()));
    window.location.assign(assetPath("/study/"));
  }

  const copy = actionCopy(action);

  return (
    <div className="page page-today">
      <PageHeader
        eyebrow={`${dateLabel} · one clear next step`}
        title="Listen for what people actually say."
        intro="A quiet sequence of watching, noticing, and retrieving—paced by what memory is ready to do today."
      />

      <motion.section className="today-action tactile-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
        <div className="action-number">{copy.number}</div>
        <div className="action-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
          <div className="meta-row">
            <span><Clock3 size={16} /> {copy.time}</span>
            <span><RotateCcw size={16} /> {copy.detail}</span>
          </div>
        </div>
        {!action ? <span className="secondary-button">Opening your notebook…</span>
          : action.kind === "resume" ? <AppLink href="/study/" className="primary-button">Resume session <ArrowRight size={18} /></AppLink>
          : action.kind === "introduction" ? <button className="primary-button" onClick={() => void start("introduction", action.lesson.id)}>Begin lesson <ArrowRight size={18} /></button>
          : action.kind === "mastery" ? <button className="primary-button" onClick={() => void start("mastery", action.lesson.id)}>Begin mastery check <ArrowRight size={18} /></button>
          : action.kind === "standalone-review" ? <button className="primary-button" onClick={() => void start("standalone-review")}>Begin due review <ArrowRight size={18} /></button>
          : action.kind === "wait" ? <AppLink href="/library/" className="secondary-button">Revisit the lesson <BookOpen size={18} /></AppLink>
          : action.kind === "editorial-hold" ? <AppLink href="/library/" className="primary-button">Review draft library <FileCheck2 size={18} /></AppLink>
          : <AppLink href="/progress/" className="primary-button">View curriculum <CheckCircle2 size={18} /></AppLink>}
      </motion.section>

      <section className="method-strip" aria-label="Learning method">
        <div><span>Watch</span><p>Meet the language in a real exchange.</p></div>
        <div><span>Notice</span><p>Keep only phrases worth carrying.</p></div>
        <div><span>Retrieve</span><p>Try after a night has passed.</p></div>
        <div><span>Return</span><p>Review at widening intervals.</p></div>
      </section>

      <aside className="editorial-note"><span className="note-rule" /><p>“The useful moment is the small pause before a phrase comes back.”</p><span>Study note</span></aside>
    </div>
  );
}

function actionCopy(action: ReturnType<typeof selectTodayAction> | undefined) {
  if (!action) return { number: "··", eyebrow: "Local record", title: "Opening your notebook", description: "Reading the study state stored in this browser.", time: "A moment", detail: "Stored locally" };
  if (action.kind === "resume") return { number: "↳", eyebrow: "Unfinished session", title: action.session.mode === "standalone-review" ? "Continue due review" : `Continue ${action.session.mode}`, description: "Your exact stage, fixed queue, and answers are waiting where you left them.", time: "Resume", detail: `${action.session.stage.replace("-", " ")}` };
  if (action.kind === "introduction") return { number: String(action.lesson.order).padStart(2, "0"), eyebrow: "New lesson", title: action.lesson.title, description: action.lesson.objective, time: "About 8 minutes", detail: "Mastery begins tomorrow" };
  if (action.kind === "mastery") return { number: String(action.lesson.order).padStart(2, "0"), eyebrow: "Delayed mastery is due", title: action.lesson.title, description: "Bring the Thai back before looking, then complete a fixed ten-question check.", time: "About 7 minutes", detail: "9 of 10 to master" };
  if (action.kind === "wait") return { number: "⌁", eyebrow: "Let memory settle", title: `Return ${formatLocalDate(action.eligibleDate)}`, description: "The first pass is complete. The next useful action is delayed retrieval after a local calendar day has passed.", time: "No study due", detail: "Replay is optional" };
  if (action.kind === "standalone-review") return { number: "↻", eyebrow: "Spaced review is due", title: `${Math.min(10, action.dueCount)} older phrase${action.dueCount === 1 ? "" : "s"}`, description: "A fixed queue from mastered lessons is ready. Results appear only at the end.", time: "About 5 minutes", detail: `${action.dueCount} due item${action.dueCount === 1 ? "" : "s"}` };
  if (action.kind === "editorial-hold") return { number: "⌁", eyebrow: "Curriculum in review", title: `${action.draftCount} local clips are staged`, description: "Every supplied Reel is available as an explicit draft preview with screenshot-derived cue cards. Scored study stays closed until a lesson passes audio, cue-card, and quiz review.", time: "Preview anytime", detail: "No draft affects progress" };
  return { number: "✓", eyebrow: "Curriculum complete", title: "Everything published is mastered", description: "There is no review due today. Your library and learning record remain available.", time: "Nothing due", detail: "Return when review is ready" };
}
