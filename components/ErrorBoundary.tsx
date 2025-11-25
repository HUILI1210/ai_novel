import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h1 className="text-4xl text-red-400 font-bold mb-4">出错了</h1>
            <p className="text-slate-300 mb-2">应用程序遇到了意外错误。</p>
            <p className="text-slate-500 text-sm mb-6 font-mono bg-slate-800 p-3 rounded">
              {this.state.error?.message || '未知错误'}
            </p>
            <button
              onClick={this.handleReset}
              className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition-colors"
            >
              重新加载游戏
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
