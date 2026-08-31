import { Component } from 'react';

const recoveryStorageKey = 'jba-deployment-recovery-path';
const preloadErrorPattern = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|use(?:Memo|Callback|Effect|State|Ref|Context|Reducer|LayoutEffect) is not defined|Cannot access ['"][^'"]+['"] before initialization/i;

export const isDeploymentPreloadError = (error) => preloadErrorPattern.test(
  String(error?.message || error || ''),
);

const currentPath = () => `${window.location.pathname}${window.location.search}`;

export default class DeploymentRecoveryBoundary extends Component {
  state = { error: null };

  componentDidMount() {
    window.addEventListener('vite:preloadError', this.handlePreloadError);
  }

  componentDidCatch(error) {
    this.recoverOnce(error);
  }

  componentWillUnmount() {
    window.removeEventListener('vite:preloadError', this.handlePreloadError);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  handlePreloadError = (event) => {
    event.preventDefault();
    this.recoverOnce(event.payload || event.error || new Error('A deployed page module could not be loaded.'));
  };

  recoverOnce = (error) => {
    const path = currentPath();
    if (isDeploymentPreloadError(error) && window.sessionStorage.getItem(recoveryStorageKey) !== path) {
      window.sessionStorage.setItem(recoveryStorageKey, path);
      window.location.reload();
    }
  };

  reloadLatest = () => {
    window.sessionStorage.removeItem(recoveryStorageKey);
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-950" role="alert">
        <h1 className="font-heading text-lg font-semibold">This page needs the latest update</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-amber-900/80">
          The page stopped while loading an updated application file. Reload to continue with the newest deployed version.
        </p>
        <button
          type="button"
          onClick={this.reloadLatest}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          Reload latest version
        </button>
      </section>
    );
  }
}
