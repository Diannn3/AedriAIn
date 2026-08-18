export function AssistantApp() {
  return (
    <div className="assistant-panel">
      <div className="assistant-status"><span />Command bus online</div>
      <p>AedriAIn currently uses deterministic typed commands. The AI layer will emit the same permission-checked command types instead of receiving arbitrary shell access.</p>
      <code>open maps</code><code>study mode</code><code>close notes</code><code>reset workspace</code>
    </div>
  );
}
