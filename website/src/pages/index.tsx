import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Hero from '@site/src/components/Hero';
import CodeBlock from '@theme/CodeBlock';
import Layout from '@theme/Layout';
import type { ReactNode } from 'react';
import styles from './index.module.css';

const withGorhom = `function ItemScreen() {
  const confirmRef = useRef<BottomSheetModal>(null);

  const onDone = (confirmed: boolean) => {
    confirmRef.current?.dismiss();
    if (confirmed) deleteItem();
  };

  return (
    <>
      <Button
        title="Delete"
        onPress={() => confirmRef.current?.present()}
      />
      {/* One of these, and a ref, per sheet */}
      <BottomSheetModal ref={confirmRef}>
        <ConfirmContent
          title="Delete this item?"
          onDone={onDone}
        />
      </BottomSheetModal>
    </>
  );
}`;

const withSheetScope = `function ItemScreen() {
  const sheets = useSheets();

  const onDelete = async () => {
    const confirmed = await sheets.show('confirm', {
      title: 'Delete this item?',
    });
    if (confirmed) deleteItem();
  };

  return <Button title="Delete" onPress={onDelete} />;
}`;

const description =
  'sheet-scope is a scoped, lazily-mounted, typed bottom sheet manager for React Native. Open @gorhom/bottom-sheet modals with one call and await the result.';

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const siteUrl = siteConfig.url + siteConfig.baseUrl;

  // Tells search engines what the site is about: its name, and the library it
  // documents.
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        'name': siteConfig.title,
        'url': siteUrl,
      },
      {
        '@type': 'SoftwareSourceCode',
        'name': siteConfig.title,
        'description': description,
        'url': siteUrl,
        'codeRepository': `https://github.com/${siteConfig.organizationName}/${siteConfig.projectName}`,
        'programmingLanguage': 'TypeScript',
        'runtimePlatform': 'React Native',
        'license': 'https://opensource.org/licenses/MIT',
        'author': {
          '@type': 'Person',
          'name': 'Darshan Javiya',
          'url': 'https://github.com/jdarshan5',
        },
      },
    ],
  };

  return (
    <Layout
      title="Bottom sheets you can await in React Native"
      description={description}
    >
      <Head>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Head>
      <Hero />
      <main>
        <section className={styles.section}>
          <p className={styles.label}>Why it exists</p>
          <h2 className={styles.heading}>
            gorhom draws the sheet. Something still has to manage it.
          </h2>
          <p className={styles.lede}>
            @gorhom/bottom-sheet handles the hard part: gestures, animation and
            the keyboard. It leaves the bookkeeping to you: where each sheet is
            rendered, how a screen opens it, how the answer gets back, and what
            happens to the sheet when its screen goes away. sheet-scope is that
            bookkeeping.
          </p>

          <div className={styles.cards}>
            <div className={styles.card}>
              <p className={styles.label}>Scoped</p>
              <h3>A sheet closes with the screen that owns it</h3>
              <p>
                A global sheet manager lets you open a sheet from anywhere, but
                then the sheet belongs to the whole app. If the screen that
                opened it goes away, the sheet stays up over whatever comes
                next.
              </p>
              <p className={styles.does}>
                Here, every sheet belongs to a <code>&lt;SheetScope&gt;</code>.
                When the scope unmounts, for example because its screen was
                popped, its sheets close.
              </p>
            </div>
            <div className={styles.card}>
              <p className={styles.label}>Lazily mounted</p>
              <h3>A sheet costs nothing until it opens</h3>
              <p>
                The usual pattern adds a <code>&lt;BottomSheetModal&gt;</code>{' '}
                and a ref to the screen for every sheet it might show, and loads
                each sheet&apos;s code along with the screen.
              </p>
              <p className={styles.does}>
                Here, a sheet isn&apos;t rendered, and its module isn&apos;t
                evaluated, until you call <code>show()</code> or{' '}
                <code>preload()</code>. Once it has closed, it unmounts.
              </p>
            </div>
            <div className={styles.card}>
              <p className={styles.label}>Typed</p>
              <h3>Names, props and results are checked</h3>
              <p>
                Sheet names passed as strings, loosely typed props, and results
                handed back through callbacks are all easy to get wrong.
              </p>
              <p className={styles.does}>
                Here, all three are inferred from your sheet components.{' '}
                <code>show(&apos;confirm&apos;, {'{ title }'})</code> checks{' '}
                <code>title</code> at compile time and resolves with the
                sheet&apos;s result.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.label}>Before and after</p>
          <h2 className={styles.heading}>
            The same delete confirmation, both ways
          </h2>
          <div className={styles.compare}>
            <CodeBlock language="tsx" title="With gorhom alone">
              {withGorhom}
            </CodeBlock>
            <CodeBlock language="tsx" title="With sheet-scope">
              {withSheetScope}
            </CodeBlock>
          </div>
          <p className={styles.lede}>
            The sheet itself is still a gorhom sheet. Its root element,{' '}
            <code>&lt;SheetModal&gt;</code>, takes <code>BottomSheetModal</code>
            &apos;s props, apart from two the library controls, so snap points,
            backdrops and gestures work the way you already know.
          </p>
          <div className={styles.next}>
            <Link
              className="button button--primary button--lg"
              to="/docs/getting-started"
            >
              Get started
            </Link>
            <Link
              className="button button--secondary button--lg"
              to="/docs/api"
            >
              API reference
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
