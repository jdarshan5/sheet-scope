import Link from '@docusaurus/Link';
import clsx from 'clsx';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import styles from './styles.module.css';

type Result = 'true' | 'false' | 'undefined';

type LogEntry = { key: number; value: Result; why: string };

// Matches the sheet's CSS transition: show() resolves after the close animation.
const CLOSE_MS = 280;

function Headphones() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 14v-2a8 8 0 0 1 16 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="3" y="13" width="4" height="7" rx="1.5" fill="currentColor" />
      <rect x="17" y="13" width="4" height="7" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * The landing page's hero. Its phone imitates what the library does: `show()`
 * resolves after the close animation, and popping the screen closes the sheet
 * its scope owns.
 */
export default function Hero(): ReactNode {
  const [open, setOpen] = useState(false);
  const [onItem, setOnItem] = useState(true);
  const [mounted, setMounted] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nextKey = useRef(0);
  const restoreFocus = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const showRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus({ preventScroll: true });
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      showRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  const show = () => {
    if (open) {
      return;
    }
    setOpen(true);
    setMounted((count) => count + 1);
  };

  const close = (value: Result, why: string, wait = CLOSE_MS) => {
    if (!open) {
      return;
    }
    restoreFocus.current =
      sheetRef.current?.contains(document.activeElement) ?? false;
    setOpen(false);

    const key = nextKey.current++;
    const settle = () => {
      setMounted((count) => count - 1);
      setLog((entries) => [{ key, value, why }, ...entries].slice(0, 4));
    };
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (wait === 0 || reducedMotion) {
      settle();
    } else {
      timers.current.push(setTimeout(settle, wait));
    }
  };

  const pop = () => {
    if (!onItem) {
      return;
    }
    setOnItem(false);
    close('undefined', 'screen popped, so its scope closed the sheet', 0);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      close('undefined', 'dismissed with Escape');
    }
  };

  return (
    <header className={styles.hero}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>For @gorhom/bottom-sheet</p>
        <h1 className={styles.title}>
          Bottom sheets you can <code>await</code>.
        </h1>
        <p className={styles.sub}>
          sheet-scope manages gorhom&apos;s bottom-sheet modals in React Native.
          You open a sheet with one typed call and get its result back as a
          promise. The sheet is mounted only while it&apos;s open, and it closes
          when the screen that owns it unmounts.
        </p>
        <div className={styles.cta}>
          <Link
            className="button button--primary button--lg"
            to="/docs/getting-started"
          >
            Get started
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/why">
            Why it exists
          </Link>
        </div>
        <ul className={styles.facts}>
          <li>JavaScript only</li>
          <li>About 7.5 KB minified</li>
          <li>Built on @gorhom/bottom-sheet v5</li>
        </ul>
      </div>

      <div className={styles.stage} onKeyDown={onKeyDown}>
        <div
          className={clsx(
            styles.phone,
            open && styles.sheetOpen,
            !onItem && styles.popped
          )}
        >
          <div className={styles.viewport}>
            <div className={styles.screen} inert={open || onItem}>
              <div className={styles.bar}>
                <span className={styles.barTitle}>Cart</span>
              </div>
              <div className={styles.body}>
                <button
                  type="button"
                  className={styles.row}
                  onClick={() => setOnItem(true)}
                >
                  <span className={styles.thumb}>
                    <Headphones />
                  </span>
                  <span className={styles.rowText}>
                    <b>Wireless headphones</b>
                    <small>Open the item</small>
                  </span>
                  <span className={styles.chevron} aria-hidden="true">
                    ›
                  </span>
                </button>
              </div>
            </div>

            <div
              className={clsx(styles.screen, styles.item)}
              inert={open || !onItem}
            >
              <div className={styles.bar}>
                <button type="button" className={styles.back} onClick={pop}>
                  ‹ Cart
                </button>
                <span className={styles.barTitle}>Item</span>
              </div>
              <div className={styles.body}>
                <div className={styles.art}>
                  <Headphones />
                </div>
                <b>Wireless headphones</b>
                <small>In your cart</small>
                <button
                  ref={showRef}
                  type="button"
                  className={styles.deleteItem}
                  onClick={show}
                >
                  Delete item
                </button>
              </div>
            </div>

            <div
              className={styles.backdrop}
              onClick={() => close('undefined', 'dismissed by tapping outside')}
            />

            <div
              ref={sheetRef}
              className={styles.sheet}
              role="dialog"
              aria-label="Delete this item?"
              inert={!open}
            >
              <span className={styles.grip} />
              <b>Delete this item?</b>
              <small>It will be removed from your cart.</small>
              <div className={styles.sheetActions}>
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={() => close('false', 'Cancel tapped')}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.danger}
                  onClick={() => close('true', 'Delete tapped')}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="button button--secondary"
          disabled={!onItem}
          onClick={pop}
        >
          Pop the screen
        </button>
        <p className={styles.caption}>
          Open the sheet, then pop the screen: the sheet closes with it. This
          phone imitates the behaviour in the browser. It isn&apos;t the library
          running.
        </p>
      </div>

      <div className={styles.console}>
        <pre>
          <span className={styles.keyword}>const</span> confirmed ={' '}
          <span className={styles.keyword}>await</span> sheets.show(
          <span className={styles.string}>&apos;confirm&apos;</span>, {'{\n'}
          {'  '}title:{' '}
          <span className={styles.string}>&apos;Delete this item?&apos;</span>
          {',\n});'}
        </pre>
        <ol className={styles.log} aria-live="polite">
          {log.length === 0 ? (
            <li className={styles.hint}>
              Tap Delete item on the phone to see what the promise resolves
              with.
            </li>
          ) : (
            log.map((entry) => (
              <li key={entry.key}>
                <span className={styles.arrow}>→</span>
                <span className={styles[entry.value]}>{entry.value}</span>
                <span className={styles.why}>{entry.why}</span>
              </li>
            ))
          )}
        </ol>
        <p className={styles.mounted}>
          sheets mounted: <b>{mounted}</b>
        </p>
      </div>
    </header>
  );
}
