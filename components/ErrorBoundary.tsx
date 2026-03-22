'use client';

import React, { Component, ReactNode } from 'react';
import { CircleAlert as AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="font-display text-xl text-foreground mb-2">
              {this.props.componentName || 'This section'} is temporarily unavailable
            </h3>
            <p className="font-body text-sm text-muted-foreground mb-4">
              Don't worry, the rest of the site is working normally.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="yarn-button px-6 py-2 bg-primary text-primary-foreground font-body text-xs tracking-[0.15em] uppercase border border-accent/30 hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
