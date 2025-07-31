import { RtcPairSocket } from 'rtc-pair-socket';
import AsyncQueue from './AsyncQueue';
import assert from './assert';
import generateProtocol from './generateProtocol';

export default class App {
  socket?: RtcPairSocket;
  party?: 'alice' | 'bob';
  msgQueue = new AsyncQueue<unknown>();

  generateJoiningCode() {
    // 128 bits of entropy
    return [
      Math.random().toString(36).substring(2, 12),
      Math.random().toString(36).substring(2, 12),
      Math.random().toString(36).substring(2, 7),
    ].join('');
  }

  async connect(code: string, party: 'alice' | 'bob') {
    this.party = party;
    const socket = new RtcPairSocket(code, party);
    this.socket = socket;

    socket.on('message', (msg: unknown) => {
      // Using a message queue instead of passing messages directly to the MPC
      // protocol ensures that we don't miss anything sent before we begin.
      this.msgQueue.push(msg);
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('open', resolve);
      socket.on('error', reject);
    });
  }

  async mpcLargest(
    prefs: boolean[],
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    const { party, socket } = this;

    assert(party !== undefined, 'Party must be set');
    assert(socket !== undefined, 'Socket must be set');

    const TOTAL_BYTES = 247331;
    let currentBytes = 0;

    const input: Record<string, boolean> = {};

    for (let i = 0; i < 7; i++) {
      input[`${party}Weekday${i}`] = prefs[i];
    }

    // const input = party === 'alice' ? { a: value } : { b: value };
    const otherParty = party === 'alice' ? 'bob' : 'alice';

    const protocol = await generateProtocol();

    const session = protocol.join(party, input, (to, msg) => {
      assert(to === otherParty, 'Unexpected party');
      socket.send(msg);

      currentBytes += msg.byteLength;

      if (onProgress) {
        onProgress(currentBytes / TOTAL_BYTES);
      }
    });

    this.msgQueue.stream((msg: unknown) => {
      if (!(msg instanceof Uint8Array)) {
        throw new Error('Unexpected message type');
      }

      session.handleMessage(otherParty, msg);

      currentBytes += msg.byteLength;

      if (onProgress) {
        onProgress(currentBytes / TOTAL_BYTES);
      }
    });

    const output = await session.output();

    if (currentBytes !== TOTAL_BYTES) {
      console.error(
        [
          'Bytes sent & received was not equal to TOTAL_BYTES.',
          ' This causes incorrect progress calculations.',
          ` To fix, updated TOTAL_BYTES to ${currentBytes}.`,
        ].join(''),
      );
    }

    if (
      output === null ||
      typeof output !== 'object' ||
      typeof output.result !== 'number'
    ) {
      throw new Error('Unexpected output');
    }

    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayResult = weekdays[output.result];

    if (weekdayResult === undefined) {
      return 'No match 🥲';
    }

    return `${weekdayResult}!`;
  }
}
