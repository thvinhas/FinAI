"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
          <div className="max-w-sm text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-yellow-500" />
            <h1 className="mb-2 text-xl font-bold text-white">
              Algo deu errado
            </h1>
            <p className="mb-6 text-sm text-zinc-400">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              <RefreshCw size={16} />
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
