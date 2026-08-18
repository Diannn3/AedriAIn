import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  appTitle: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[AedriAIn] ${this.props.appTitle} window failed`, error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error-boundary" role="alert">
          <b>{this.props.appTitle} failed</b>
          <span>{this.state.error.message || 'The application window could not be rendered.'}</span>
          <button type="button" onClick={() => window.location.reload()}>Reload workspace</button>
        </div>
      );
    }
    return this.props.children;
  }
}
