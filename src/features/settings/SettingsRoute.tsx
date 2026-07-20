import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileDown,
  FileUp,
  Moon,
  RotateCcw,
  Smartphone,
  Speaker,
  Type,
  Volume2,
} from "lucide-react";
import { NokLogo } from "@/src/components/Mascot";
import { Button } from "@/src/components/ui";
import { exportAppData, importAppData } from "@/src/lib/db";
import { useAppStore } from "@/src/store/useAppStore";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export function SettingsRoute() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const replaceData = useAppStore((state) => state.replaceData);
  const reset = useAppStore((state) => state.reset);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const exportProgress = async () => {
    const raw = await exportAppData();
    const blob = new Blob([raw], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `noklingo-progress-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setMessage("Progress exported. Keep that file somewhere safe.");
  };

  const importProgress = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = await importAppData(await file.text());
      replaceData(data);
      setMessage("Progress imported successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not import that file.",
      );
    }
  };

  const resetAll = async () => {
    if (
      window.confirm(
        "Reset Noklingo? This permanently removes all local progress and settings.",
      )
    )
      await reset();
  };

  return (
    <div className="page-shell settings-page">
      <header className="mobile-brand">
        <NokLogo />
      </header>
      <div className="page-title">
        <span className="eyebrow">Settings</span>
        <h1>Make Noklingo feel like yours.</h1>
        <p>
          Your settings and progress live on this device — no account required.
        </p>
      </div>
      {message && (
        <div className="settings-message" role="status">
          {message}
          <button onClick={() => setMessage(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <div className="settings-layout">
        <section className="settings-section">
          <div className="settings-heading">
            <span>
              <Volume2 size={23} />
            </span>
            <div>
              <h2>Sound & display</h2>
              <p>Adjust how lessons look and sound.</p>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <Speaker size={21} />
              <span>
                <strong>Lesson audio</strong>
                <small>Play Thai phrases and feedback</small>
              </span>
            </div>
            <button
              className={`switch ${settings.audioEnabled ? "on" : ""}`}
              role="switch"
              aria-label="Lesson audio"
              aria-checked={settings.audioEnabled}
              onClick={() =>
                updateSettings({ audioEnabled: !settings.audioEnabled })
              }
            >
              <i />
            </button>
          </div>
          <label className="setting-row setting-slider">
            <div>
              <Volume2 size={21} />
              <span>
                <strong>Volume</strong>
                <small>{Math.round(settings.volume * 100)}%</small>
              </span>
            </div>
            <input
              aria-label="Lesson audio volume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={(event) =>
                updateSettings({ volume: Number(event.target.value) })
              }
              disabled={!settings.audioEnabled}
            />
          </label>
          <label className="setting-row setting-select">
            <div>
              <Type size={21} />
              <span>
                <strong>Pronunciation guidance</strong>
                <small>Romanization remains the exercise language</small>
              </span>
            </div>
            <select
              value={settings.romanization}
              onChange={(event) =>
                updateSettings({
                  romanization: event.target
                    .value as typeof settings.romanization,
                })
              }
            >
              <option value="always">Always show</option>
              <option value="learning">Keep detail concise</option>
            </select>
          </label>
          <div className="setting-row">
            <div>
              <Type size={21} />
              <span>
                <strong>Thai script details</strong>
                <small>Optional source-accuracy view; never required</small>
              </span>
            </div>
            <button
              className={`switch ${settings.showThaiScript ? "on" : ""}`}
              role="switch"
              aria-label="Show optional Thai script details"
              aria-checked={settings.showThaiScript}
              onClick={() =>
                updateSettings({ showThaiScript: !settings.showThaiScript })
              }
            >
              <i />
            </button>
          </div>
          <div className="setting-row">
            <div>
              <Moon size={21} />
              <span>
                <strong>Dark mode</strong>
                <small>Easier on your eyes at night</small>
              </span>
            </div>
            <button
              className={`switch ${settings.darkMode ? "on" : ""}`}
              role="switch"
              aria-label="Dark mode"
              aria-checked={settings.darkMode}
              onClick={() => updateSettings({ darkMode: !settings.darkMode })}
            >
              <i />
            </button>
          </div>
          <div className="setting-row">
            <div>
              <Smartphone size={21} />
              <span>
                <strong>Reduced motion</strong>
                <small>Limit celebrations and transitions</small>
              </span>
            </div>
            <button
              className={`switch ${settings.reducedMotion ? "on" : ""}`}
              role="switch"
              aria-label="Reduced motion"
              aria-checked={settings.reducedMotion}
              onClick={() =>
                updateSettings({ reducedMotion: !settings.reducedMotion })
              }
            >
              <i />
            </button>
          </div>
        </section>

        <div>
          <section className="settings-section install-section">
            <div className="settings-heading">
              <span>
                <Download size={23} />
              </span>
              <div>
                <h2>Install Noklingo</h2>
                <p>Keep it on your home screen and learn offline.</p>
              </div>
            </div>
            {installPrompt ? (
              <Button
                full
                onClick={async () => {
                  await installPrompt.prompt();
                  setInstallPrompt(null);
                }}
              >
                Install app
              </Button>
            ) : (
              <p className="install-help">
                On iPhone or iPad, choose{" "}
                <strong>Share → Add to Home Screen</strong>. On desktop, look
                for the install icon in your browser’s address bar.
              </p>
            )}
          </section>

          <section className="settings-section data-section">
            <div className="settings-heading">
              <span>
                <FileDown size={23} />
              </span>
              <div>
                <h2>Your local data</h2>
                <p>Back up, restore, or start fresh.</p>
              </div>
            </div>
            <div className="data-actions">
              <Button tone="secondary" onClick={exportProgress}>
                <FileDown size={18} /> Export progress
              </Button>
              <Button tone="secondary" onClick={() => fileRef.current?.click()}>
                <FileUp size={18} /> Import progress
              </Button>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept="application/json"
                onChange={(event) => importProgress(event.target.files?.[0])}
              />
            </div>
            <div className="danger-zone">
              <div>
                <strong>Reset all progress</strong>
                <small>This cannot be undone unless you export first.</small>
              </div>
              <Button tone="danger" onClick={resetAll}>
                <RotateCcw size={18} /> Reset
              </Button>
            </div>
          </section>
        </div>
      </div>
      <footer className="settings-footer">
        Noklingo · Offline-first conversational Thai · Made with care
      </footer>
    </div>
  );
}
