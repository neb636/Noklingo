"use client";

import { useRef, useState } from "react";
import { Download, HardDrive, Languages, Moon, RotateCcw, SunMedium, Upload, Volume2 } from "lucide-react";
import { AppSnapshotSchema } from "@/domain/schemas";
import { clearLocalData, writeSnapshot } from "@/data/db";
import { PageHeader } from "@/components/PageHeader";
import { snapshotFromState, useStudyStore } from "@/state/study-store";

export default function SettingsPage() {
  const settings = useStudyStore((state) => state.settings);
  const updateSettings = useStudyStore((state) => state.updateSettings);
  const replaceSnapshot = useStudyStore((state) => state.replaceSnapshot);
  const reset = useStudyStore((state) => state.reset);
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  function exportData() {
    const data = JSON.stringify(snapshotFromState(useStudyStore.getState()), null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `thai-study-v2-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Local study data exported.");
  }

  async function importData(file?: File) {
    if (!file) return;
    try {
      const parsed = AppSnapshotSchema.parse(JSON.parse(await file.text()));
      await writeSnapshot(parsed);
      replaceSnapshot(parsed);
      setMessage("Import complete. Your local record has been replaced.");
    } catch {
      setMessage("That file is not a current Thai Study v2 export. Nothing was changed.");
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function resetData() {
    await clearLocalData();
    reset();
    setConfirmReset(false);
    setMessage("Local study history and preferences were reset.");
  }

  return (
    <div className="page settings-page">
      <PageHeader eyebrow="Preferences" title="Make the notebook comfortable." intro="Adjust listening, reading, movement, and local storage. These choices stay with this browser." />
      {message && <div className="toast" role="status">{message}<button onClick={() => setMessage("")} aria-label="Dismiss message">×</button></div>}

      <div className="settings-layout">
        <section className="settings-section">
          <div className="settings-title"><Volume2 size={20} /><div><p className="eyebrow">Audio</p><h2>Listening</h2></div></div>
          <SettingRow title="Phrase audio" description="Play local recordings when available, with browser speech as a fallback.">
            <Switch checked={settings.audioEnabled} onChange={(value) => updateSettings({ audioEnabled: value })} label="Phrase audio" />
          </SettingRow>
          <SettingRow title="Volume" description={`${Math.round(settings.volume * 100)}% for phrase audio and speech fallback`}>
            <input aria-label="Phrase audio volume" type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(event) => updateSettings({ volume: Number(event.target.value) })} />
          </SettingRow>
          <SettingRow title="Speech fallback speed" description={`${settings.speechRate.toFixed(2)}× playback rate`}>
            <input aria-label="Speech fallback speed" type="range" min="0.5" max="1.25" step="0.05" value={settings.speechRate} onChange={(event) => updateSettings({ speechRate: Number(event.target.value) })} />
          </SettingRow>
          <SettingRow title="Captions on first watch" description="Show the lesson caption track when video begins.">
            <Switch checked={settings.captionsByDefault} onChange={(value) => updateSettings({ captionsByDefault: value })} label="Captions on first watch" />
          </SettingRow>
        </section>

        <section className="settings-section">
          <div className="settings-title"><Languages size={20} /><div><p className="eyebrow">Language display</p><h2>Reading support</h2></div></div>
          <SettingRow title="Thai script" description="Show Thai text in transcripts, cards, and answer choices.">
            <Switch checked={settings.showThaiScript} onChange={(value) => updateSettings({ showThaiScript: value })} label="Thai script" />
          </SettingRow>
          <SettingRow title="Romanization" description="Show tone-marked romanization alongside Thai.">
            <Switch checked={settings.showRomanization} onChange={(value) => updateSettings({ showRomanization: value })} label="Romanization" />
          </SettingRow>
          <SettingRow title="Preferred polite particle" description="Use your preferred ending in practice prompts where a choice is possible.">
            <div className="segmented" aria-label="Preferred polite particle">
              <button className={settings.politeParticle === "khráp" ? "selected" : ""} onClick={() => updateSettings({ politeParticle: "khráp" })}>ครับ</button>
              <button className={settings.politeParticle === "khâ" ? "selected" : ""} onClick={() => updateSettings({ politeParticle: "khâ" })}>ค่ะ</button>
              <button className={settings.politeParticle === "both" ? "selected" : ""} onClick={() => updateSettings({ politeParticle: "both" })}>Both</button>
            </div>
          </SettingRow>
          <p className="setting-footnote">At least Thai script or romanization remains visible so study prompts never become blank.</p>
        </section>

        <section className="settings-section">
          <div className="settings-title"><SunMedium size={20} /><div><p className="eyebrow">Display</p><h2>Reading</h2></div></div>
          <SettingRow title="Appearance" description="Use the device setting or choose directly.">
            <div className="segmented" aria-label="Appearance">
              {(["system", "light", "dark"] as const).map((theme) => <button key={theme} className={settings.theme === theme ? "selected" : ""} onClick={() => updateSettings({ theme })}>{theme === "dark" && <Moon size={14} />}{theme}</button>)}
            </div>
          </SettingRow>
          <SettingRow title="Thai text size" description="Increase Thai independently from interface copy.">
            <div className="segmented"><button className={settings.thaiSize === "standard" ? "selected" : ""} onClick={() => updateSettings({ thaiSize: "standard" })}>Standard</button><button className={settings.thaiSize === "large" ? "selected" : ""} onClick={() => updateSettings({ thaiSize: "large" })}>Large</button></div>
          </SettingRow>
          <SettingRow title="Reduce motion" description="Remove non-essential interface transitions.">
            <Switch checked={settings.reduceMotion} onChange={(value) => updateSettings({ reduceMotion: value })} label="Reduce motion" />
          </SettingRow>
        </section>

        <section className="settings-section data-section">
          <div className="settings-title"><HardDrive size={20} /><div><p className="eyebrow">Local data</p><h2>Keep your own record</h2></div></div>
          <p className="data-intro">No account is required. Export a portable JSON copy before clearing browser storage or moving devices.</p>
          <div className="data-actions">
            <button className="secondary-button" onClick={exportData}><Download size={17} />Export data</button>
            <button className="secondary-button" onClick={() => inputRef.current?.click()}><Upload size={17} />Import data</button>
            <input ref={inputRef} className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} />
          </div>
          <div className="danger-zone">
            <div><b>Reset local data</b><p>Remove study history, scheduled reviews, and preferences from this browser.</p></div>
            {!confirmReset ? <button onClick={() => setConfirmReset(true)}><RotateCcw size={16} />Reset…</button> : <div className="confirm-actions"><button onClick={() => setConfirmReset(false)}>Cancel</button><button className="danger-button" onClick={() => void resetData()}>Confirm reset</button></div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="setting-row"><div><h3>{title}</h3><p>{description}</p></div><div>{children}</div></div>;
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}><span /></button>;
}
