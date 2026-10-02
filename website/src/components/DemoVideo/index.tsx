import useBaseUrl from '@docusaurus/useBaseUrl';
import TabItem from '@theme/TabItem';
import Tabs from '@theme/Tabs';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import styles from './styles.module.css';

type Platform = 'ios' | 'android';

type Props = {
  /** The clip's name: static/video holds `<name>.ios.mp4` and `<name>.android.mp4`. */
  name: string;
  /** What the clip shows. Shown under the phone and read out as the video's label. */
  caption: string;
};

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
];

/**
 * One recording, framed as a phone. Nothing is downloaded until the reader
 * presses play: until then it shows the poster, which is the clip's first frame.
 */
function Phone({ name, platform, caption }: Props & { platform: Platform }) {
  const src = useBaseUrl(`/video/${name}.${platform}.mp4`);
  const poster = useBaseUrl(`/video/${name}.${platform}.jpg`);

  return (
    <div className={styles.phone}>
      <video
        className={clsx(styles.video, styles[platform])}
        aria-label={caption}
        controls
        muted
        playsInline
        preload="none"
        poster={poster}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}

/**
 * A screen recording of the example app on iOS and on Android. The platform
 * tabs share one group, so choosing a platform switches every clip on the site.
 */
export default function DemoVideo({ name, caption }: Props): ReactNode {
  return (
    <figure className={styles.figure}>
      <Tabs groupId="demo-platform" className={styles.tabs} lazy>
        {PLATFORMS.map(({ value, label }) => (
          <TabItem key={value} value={value} label={label}>
            <Phone name={name} platform={value} caption={caption} />
          </TabItem>
        ))}
      </Tabs>
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
}
