'use client';

import { useMemo, useState } from 'react';
import styles from './page.module.css';
import App from '@/utils/App';

export default function Home() {
  const app = useMemo(() => new App(), []);
  const step = app.step.use();
  const party = app.party.use();
  const joiningCode = app.joiningCode.use();
  const progress = app.progress.use();
  const [spinner, setSpinner] = useState(false);
  const [number, setNumber] = useState<number>();
  const [result, setResult] = useState<string>();

  return (
    <div className={styles.app}>
      <div className={styles.header}>MPC Hello</div>

      <div className={styles['step-container']}>
        {step === 1 && (
          <div className={styles.step}>
            <div style={{ textAlign: 'left' }}>
              Welcome to the hello-world of MPC (
              <a
                className={styles.a}
                href="https://github.com/cedoor/mpc-cli/tree/main/packages/template-hello-next"
              >
                view source
              </a>
              ).
            </div>
            <div style={{ textAlign: 'left', marginTop: '1em' }}>
              To start, one party should click host. This will generate a code
              that the other party can use to join. It's an end-to-end encrypted
              P2P connection. There is no server.
            </div>
            <div style={{ textAlign: 'left', marginTop: '1em' }}>
              Once connected, both parties will enter a number. Each party will
              only be informed whether their number is the largest or not, but
              both numbers are kept cryptographically secret.
            </div>
            <div style={{ textAlign: 'left', marginTop: '1em' }}>
              This is just a simple example, but mpc-framework makes it easy to
              do this with any function.
            </div>
            <div>
              <button onClick={() => app.host()} className={styles.button}>
                Host
              </button>
              &nbsp;
              <button onClick={() => app.join()} className={styles.button}>
                Join
              </button>
            </div>
          </div>
        )}

        {step === 2 && party === 'alice' && (
          <div className="step">
            <p>Joining code:</p>
            <div className={styles['code-box']}>{joiningCode}</div>
          </div>
        )}

        {step === 2 && party === 'bob' && (
          <div className="step">
            <div>
              <label>Enter host code:</label>
              <input
                onChange={event => app.joiningCode.set(event.target.value)}
                type="text"
              />
            </div>
            <div>
              <button
                onClick={async () => {
                  setSpinner(true);
                  await app.connect(app.joiningCode.value, 'bob');
                  setSpinner(false);
                }}
                className={styles.button}
              >
                Join
              </button>
            </div>
            {spinner && (
              <div className={styles['spinner-container']}>
                <div className={styles.spinner}></div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="step">
            <div>
              <label>Enter your number:</label>
              <input
                onChange={event => setNumber(parseInt(event.target.value))}
                type="number"
              />
            </div>
            <div>
              <button
                onClick={async () => {
                  const n = Number(number);

                  if (!Number.isFinite(n)) {
                    return;
                  }

                  app.step.set(4);
                  const output = await app.mpcLargest(n);
                  app.step.set(5);
                  setResult(output);
                }}
                className={styles.button}
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step">
            <p>
              {progress < 0.01
                ? 'Waiting...'
                : `${Math.floor(100 * progress)}%`}
            </p>
            <div className={styles['spinner-container']}>
              <div className={styles.spinner}></div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="step">
            <h2>
              <span>Your number is {result}!</span>
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}
