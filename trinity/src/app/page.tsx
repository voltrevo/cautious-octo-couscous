'use client';

import {
  AsyncQueue,
  CommitmentMessage,
  Message,
  SetupMessage,
} from '@/utils/AsyncQueue';
import generateJoiningCode from '@/utils/generateJoiningCode';
import { useCallback, useRef, useState } from 'react';
import { RtcPairSocket } from 'rtc-pair-socket';
import styles from './page.module.css';
import generateProtocol from '@/utils/generateProtocol';
import {
  CircuitWrapper,
  TrinityEvaluator,
  TrinityGarbler,
  TrinityModule,
  TrinityWasmSetup,
  intToUint8Array2,
} from '@trinity-2pc/core';

// Helper function to convert an integer to a Uint8Array
function booleanArrayToInteger(boolArray: Uint8Array): number {
  return boolArray.reduce((acc, bit, index) => {
    return acc + (bit ? 1 : 0) * Math.pow(2, index);
  }, 0);
}

export default function Home() {
  const evaluatorRef = useRef<TrinityEvaluator | null>(null);
  const protocolRef = useRef<{
    trinityModule: TrinityModule;
    circuit_parsed: CircuitWrapper;
  } | null>(null);

  const [msgQueue] = useState(new AsyncQueue<Message>());
  const [step, setStep] = useState<number>(1);
  const [joiningCode, setJoiningCode] = useState<string>();
  const [spinner, setSpinner] = useState<boolean>(false);
  const [party, setParty] = useState<string>();
  const [socket, setSocket] = useState<RtcPairSocket>();
  const [number, setNumber] = useState<number>();
  const [result, setResult] = useState<string>();
  const [commitmentValue, setCommitmentValue] = useState<string>();
  const [setupObjValue, setSetupObjValue] = useState<Uint8Array>();
  const [protocol, setProtocol] = useState<{
    trinityModule: TrinityModule;
    circuit_parsed: CircuitWrapper;
  } | null>(null);

  const handleCommit = useCallback(async () => {
    if (!number) {
      alert('Number must be set');
      return;
    }

    const protocol = await generateProtocol();
    setProtocol(protocol);
    protocolRef.current = protocol;

    const trinitySetup = protocol.trinityModule.TrinityWasmSetup('Plain');

    const evaluator = protocol.trinityModule.TrinityEvaluator(
      trinitySetup,
      intToUint8Array2(number),
    );

    evaluatorRef.current = evaluator;

    const code = generateJoiningCode();
    setJoiningCode(code);

    setStep(2.1);

    const newSocket = await connect(code, 'alice');

    newSocket?.send(
      JSON.stringify({
        type: 'setup',
        setupObj: Array.from(
          trinitySetup.to_sender_setup() || new Uint8Array(),
        ),
      }),
    );

    newSocket?.send(
      JSON.stringify({
        type: 'commitment',
        commitment: evaluator.commitment_serialized,
      }),
    );

    setStep(4);
  }, [number]);

  const handleJoin = useCallback(() => {
    setStep(2.2);
  }, []);

  const handleJoinSubmit = useCallback(async () => {
    setParty('bob');

    if (joiningCode) {
      setSpinner(true);

      const protocol = await generateProtocol();
      setProtocol(protocol);

      await connect(joiningCode, 'bob');

      const setupMessage = (await msgQueue.shift()) as SetupMessage;

      if (setupMessage.type !== 'setup' || !('setupObj' in setupMessage)) {
        throw new Error('Invalid setup message');
      }
      const setupObj = new Uint8Array(setupMessage.setupObj);

      const commitmentMessage = (await msgQueue.shift()) as CommitmentMessage;

      if (
        commitmentMessage.type !== 'commitment' ||
        !('commitment' in commitmentMessage)
      ) {
        throw new Error('Invalid commitment message');
      }
      const commitment = commitmentMessage.commitment;

      setCommitmentValue(commitment);
      setSetupObjValue(setupObj);
      setSpinner(false);

      setStep(3);
    }
  }, [joiningCode, msgQueue]);

  const handleBobComputation = useCallback(() => {
    if (!number) {
      alert('Please enter a number first');
      return;
    }

    if (!setupObjValue) {
      throw new Error('Setup object is missing');
    }

    if (!commitmentValue) {
      throw new Error('Commitment value is missing');
    }

    let garblerSetup = TrinityWasmSetup.from_sender_setup(setupObjValue);
    let garblerBundle = protocol?.trinityModule.TrinityGarbler(
      commitmentValue,
      garblerSetup,
      intToUint8Array2(number),
      protocol.circuit_parsed,
    );

    const serializedBundle = Array.from(
      new Uint8Array(garblerBundle?.bundle || []),
    );

    socket?.send(
      JSON.stringify({
        type: 'garblerBundle',
        garblerBundle: serializedBundle,
      }),
    );

    setStep(4);
  }, [number, socket, protocol, setupObjValue, commitmentValue]);

  const connect = useCallback(
    async (code: string, party: 'alice' | 'bob') => {
      const socket = new RtcPairSocket(code, party);

      socket.on('message', (msg: unknown) => {
        try {
          const parsedMsg = JSON.parse(msg as string) as Message;

          if (parsedMsg.type === 'garblerBundle' && party === 'alice') {
            const currentProtocol = protocolRef.current;
            const currentEvaluator = evaluatorRef.current;

            if (!currentEvaluator) {
              console.error('Alice: Evaluator not initialized');
              return;
            }

            try {
              const bundleArray = new Uint8Array(parsedMsg.garblerBundle);
              let bundle = TrinityGarbler.from_bundle(bundleArray);

              if (!currentProtocol?.circuit_parsed) {
                throw new Error('Failed to create garbler bundle');
              }

              const resultBytes = currentEvaluator.evaluate(
                bundle,
                currentProtocol?.circuit_parsed,
              );

              let result = booleanArrayToInteger(resultBytes);

              socket.send(
                JSON.stringify({
                  type: 'result',
                  result: result,
                }),
              );

              setResult(result.toString());
              setStep(5);
            } catch (error) {
              console.error('Alice: Error evaluating circuit:', error);
            }

            return;
          }

          if (parsedMsg.type === 'result' && party === 'bob') {
            const result = parsedMsg.result;
            setResult(result);
            setStep(5);
            return;
          }

          msgQueue.push(parsedMsg);
        } catch (err) {
          console.error(`${party}: ❌ Invalid message received:`, msg, err);
        }
      });

      setSocket(socket);

      await new Promise<void>((resolve, reject) => {
        const openHandler = () => {
          socket.off('open', openHandler);
          resolve();
        };
        socket.on('open', openHandler);
        socket.on('error', reject);
      });

      await new Promise<void>(resolve => {
        setTimeout(() => {
          resolve();
        }, 500);
      });

      return socket;
    },
    [msgQueue],
  );

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
              Once connected, both parties will enter a number. The protocol
              will securely compute the sum of both numbers without either party
              revealing their input to the other. Both numbers are kept
              cryptographically secret throughout the process.
            </div>
            <div style={{ textAlign: 'left', marginTop: '1em' }}>
              This is just a simple example, Trinity as engine with
              mpc-framework makes it easy to do this with any function.
            </div>
            <div>
              <button
                onClick={() => {
                  setParty('alice');
                  setStep(2);
                }}
                className={styles.button}
              >
                Host
              </button>
              &nbsp;
              <button onClick={handleJoin} className={styles.button}>
                Join
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step">
            <p>Enter your number first:</p>
            <div>
              <label>Your number:</label>
              <input
                onChange={event => setNumber(parseInt(event.target.value))}
                type="number"
              />
            </div>
            <div>
              <button onClick={handleCommit} className={styles.button}>
                Submit
              </button>
            </div>
          </div>
        )}

        {step === 2.1 && (
          <div className="step">
            <p>Joining code:</p>
            <div className={styles['code-box']}>{joiningCode}</div>
            <p>Share this code with Bob to connect.</p>
            <div className={styles['spinner-container']}>
              <div className={styles.spinner}></div>
            </div>
          </div>
        )}

        {step === 2.2 && (
          <div className="step">
            <div>
              <label>Enter host code:</label>
              <input
                onChange={event => setJoiningCode(event.target.value)}
                type="text"
              />
            </div>
            <div>
              <button onClick={handleJoinSubmit} className={styles.button}>
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
            {party === 'alice' ? (
              <div>
                <button onClick={handleCommit} className={styles.button}>
                  Submit
                </button>
              </div>
            ) : (
              <div>
                <button
                  onClick={handleBobComputation}
                  className={styles.button}
                >
                  Submit
                </button>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="step">
            <p>Waiting...</p>
            <div className={styles['spinner-container']}>
              <div className={styles.spinner}></div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="step">
            <h2>
              <span>The sum of both numbers is {result}!</span>
            </h2>
          </div>
        )}
      </div>
    </div>
  );
}
