import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LatticeLedger ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] h-full w-full p-6 bg-zinc-950 text-zinc-100 select-none">
          <div className="max-w-md w-full bg-zinc-900/90 border border-red-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-md text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-zinc-100">
                {this.props.fallbackTitle || 'Something went wrong in this view'}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                The application encountered an unexpected error, but your notes in SQLite are safe.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 text-[11px] font-mono text-red-300/90 overflow-x-auto max-h-32">
                {this.state.error.message || 'Unknown error'}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-lg shadow-emerald-900/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recover & Reload</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Restart App</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
