import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  details?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let message = error.message || 'An unexpected application error occurred.';
    let details: string | undefined;

    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed && parsed.error) {
        message = parsed.error;
        details = `Operation: ${parsed.operationType ?? 'unknown'} · Path: ${parsed.path ?? 'n/a'}`;
      }
    } catch {
      // Plain error message
    }

    return { hasError: true, message, details };
  }

  componentDidCatch(error: Error) {
    console.error('Tower 3 Portal ErrorBoundary caught:', error);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '', details: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-8">
            <div className="flex items-center gap-3 text-[#C81E1E] mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h1 className="text-xl font-bold text-slate-900">
                Unable to Complete Request
              </h1>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              {this.state.message}
            </p>
            {this.state.details && (
              <p className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6">
                {this.state.details}
              </p>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Return to Portal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
