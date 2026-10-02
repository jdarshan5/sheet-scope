import { Component, type ReactNode } from 'react';

type Props = {
  onError: (error: unknown) => void;
  children?: ReactNode;
};

type State = { failed: boolean };

/**
 * Keeps one sheet's render error from taking down the screen or other sheets.
 * It's a class because React only supports error boundaries as classes.
 */
export class SheetErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
