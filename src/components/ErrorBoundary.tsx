import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Catches rendering errors so one broken view can't blank the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('GOLM AI view error:', error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: string }): void {
    // Navigating to another page clears the error.
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-panel" role="alert">
        <h2>Something went wrong on this page</h2>
        <p>Your saved data has not been changed. Try another page, or reload the app.</p>
        <p className="error-panel__detail">{this.state.error.message}</p>
        <button type="button" className="btn btn--primary btn--md" onClick={() => window.location.reload()}>
          Reload GOLM AI
        </button>
      </div>
    );
  }
}
