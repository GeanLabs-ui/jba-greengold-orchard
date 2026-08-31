import { Component } from 'react';

const recoveryStorageKey = 'jba-deployment-recovery-path';
const preloadErrorPattern = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

export const isDeploymentPreloadError = (error) => preloadErrorPattern.test(
  String(error?.message || error || ''),
);

export const shouldResetDeploymentRecovery = (previousKey, nextKey) => (
  previousKey !== nextKey
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

  componentDidUpdate(previousProps) {
    if (this.state.error && shouldResetDeploymentRecovery(previousProps.resetKey, this.props.resetKey)) {
      this.setState({ error: null });
    }
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

  retryPage = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const preloadFailure = isDeploymentPreloadError(this.state.error);

    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-950" role="alert">
        <h1 className="font-heading text-lg font-semibold">
          {preloadFailure ? 'This page needs the latest update' : 'This page could not be displayed'}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-amber-900/80">
          {preloadFailure
            ? 'The page stopped while loading an updated application file. Reload to continue with the newest deployed version.'
            : 'A page component stopped unexpectedly. You can try this page again or use the navigation above to continue elsewhere.'}
        </p>
        <button
          type="button"
          onClick={preloadFailure ? this.reloadLatest : this.retryPage}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          {preloadFailure ? 'Reload latest version' : 'Try this page again'}
        </button>
      </section>
    );
  }
}
