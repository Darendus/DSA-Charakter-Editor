export function StubTab({ name, hint }: { name: string; hint: string }) {
  return (
    <div className="stub">
      <h2>{name}</h2>
      <p className="muted">
        Dieser Bereich ({hint}) ist im Backbone vorbereitet, aber noch nicht ausgebaut. Die
        Regeldaten sind bereits gescrapt und über den Reiter „Regeldaten" einsehbar.
      </p>
    </div>
  );
}
