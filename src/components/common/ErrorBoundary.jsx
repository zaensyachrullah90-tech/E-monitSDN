import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error.toString() };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-red-50 text-center">
          <i className="fa-solid fa-triangle-exclamation text-red-500 text-6xl mb-4 drop-shadow-md"></i>
          <h2 className="text-2xl font-black text-red-700 mb-2">Aplikasi Terhenti</h2>
          <p className="text-xs font-bold text-red-600 mb-6 bg-white p-3 rounded-lg border border-red-200">{this.state.errorMsg}</p>
          <button onClick={() => window.location.reload()} className="bg-red-600 text-white font-bold py-3 px-6 rounded-full shadow-md">Muat Ulang Aplikasi</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;