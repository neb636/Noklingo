export function PageHeader({ eyebrow, title, intro, side }: {
  eyebrow: string;
  title: string;
  intro: string;
  side?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-intro">{intro}</p>
      </div>
      {side && <div className="header-side">{side}</div>}
    </header>
  );
}
