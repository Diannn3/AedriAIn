import { useRef, useState } from 'react';
import type { SpeechRecognitionLike } from '../core/types';
import { dispatchDesktopCommand } from '../commands/commandBus';
import { parseLocalCommand } from '../commands/localParser';
import { useDesktopStore } from '../store/useDesktopStore';

export function CommandBar() {
  const [value, setValue] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const showToast = useDesktopStore((s) => s.showToast);

  const run = (command = value) => {
    if (!command.trim()) return;
    const parsed = parseLocalCommand(command);
    const result = parsed ? dispatchDesktopCommand(parsed).message : 'Command not recognized yet. Try “open map”, “study mode”, or “reset workspace”.';
    showToast(result);
    setValue('');
  };

  const listen = () => {
    const SpeechCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechCtor) { showToast('Speech recognition is not available in this browser.'); return; }
    const recognition = new SpeechCtor();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-PH';
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      setValue(transcript);
      run(transcript);
    };
    recognition.onerror = () => { setListening(false); showToast('Voice input failed.'); };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  return (
    <div className="command-bar">
      <span className="command-mark">⌁</span>
      <input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') run(); }} placeholder="Command the workspace…" aria-label="Workspace command" />
      <button className={listening ? 'voice-button voice-button--active' : 'voice-button'} onClick={listen} aria-label="Voice command">◉</button>
      <button className="run-button" onClick={() => run()}>RUN</button>
    </div>
  );
}
