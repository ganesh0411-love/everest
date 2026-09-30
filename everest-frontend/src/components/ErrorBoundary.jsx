import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif', marginTop: '50px' }}>
          <h1 style={{ color: '#e74c3c' }}>Oops, something went wrong.</h1>
          <p style={{ color: '#34495e', marginBottom: '20px' }}>
            We're sorry, but the application encountered an unexpected error.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '10px 20px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            Refresh Application
          </button>
          {this.state.error && (
            <div style={{ marginTop: '30px', textAlign: 'left', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', overflowX: 'auto' }}>
              <h3 style={{ color: '#c0392b', fontSize: '14px', marginBottom: '10px' }}>Error Details:</h3>
              <pre style={{ fontSize: '12px', color: '#555', margin: 0, whiteSpace: 'pre-wrap' }}>
                {this.state.error.toString()}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
