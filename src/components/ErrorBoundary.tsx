import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('MetaPase crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#050814', color: '#e2e8f0', fontFamily: 'Sora, system-ui, sans-serif' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>The deal compass hit an error</p>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '8px 0 20px' }}>{this.state.error.message}</p>
          <button type="button" onClick={() => this.setState({ error: null })} style={{ border: 0, borderRadius: 999, padding: '10px 18px', background: '#34d399', color: '#050814', fontWeight: 700, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </div>
    );
  }
}
