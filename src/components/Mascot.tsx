type MascotProps = {
  size?: "small" | "medium" | "large";
  mood?: "happy" | "proud" | "curious";
};

export function Mascot({ size = "medium", mood = "happy" }: MascotProps) {
  return (
    <div
      className={`mascot mascot-${size} mascot-${mood}`}
      role="img"
      aria-label={`Nok the bird looks ${mood}`}
    >
      <span className="mascot-tail" />
      <span className="mascot-body">
        <span className="mascot-belly" />
        <span className="mascot-wing mascot-wing-left" />
        <span className="mascot-wing mascot-wing-right" />
      </span>
      <span className="mascot-head">
        <span className="mascot-crest" />
        <span className="mascot-eye mascot-eye-left" />
        <span className="mascot-eye mascot-eye-right" />
        <span className="mascot-beak" />
        <span className="mascot-cheek mascot-cheek-left" />
        <span className="mascot-cheek mascot-cheek-right" />
      </span>
      <span className="mascot-feet" />
    </div>
  );
}

export function NokLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Noklingo">
      <Mascot size="small" />
      {!compact && <span className="brand-word">noklingo</span>}
    </div>
  );
}
