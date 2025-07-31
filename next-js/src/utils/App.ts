import { RtcPairSocket } from 'rtc-pair-socket';
import AsyncQueue from './AsyncQueue';
import assert from './assert';
import generateProtocol from './generateProtocol';
import UsableField from './UsableField';

export default class App {
  step = new UsableField(1);
  party = new UsableField<'alice' | 'bob' | undefined>(undefined);
  progress = new UsableField(0);
  joiningCode = new UsableField('');

  socket?: RtcPairSocket;
  msgQueue = new AsyncQueue<unknown>();

  static generateJoiningCode() {
    // 128 bits of entropy
    return [
      Math.random().toString(36).substring(2, 12),
      Math.random().toString(36).substring(2, 12),
      Math.random().toString(36).substring(2, 7),
    ].join('');
  }

  host() {
    const joiningCode = App.generateJoiningCode();
    this.joiningCode.set(joiningCode);
    this.step.set(2);

    this.connect(joiningCode, 'alice');
  }

  join() {
    this.step.set(2);
    this.party.set('bob');
  }

  async connect(code: string, party: 'alice' | 'bob') {
    this.party.set(party);
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

    this.step.set(3);
  }

  async mpcLargest(value: number): Promise<string> {
    const { socket } = this;
    const party = this.party.value;

    assert(party !== undefined, 'Party must be set');
    assert(socket !== undefined, 'Socket must be set');

    const TOTAL_BYTES = 247331;
    let currentBytes = 0;

    const input = party === 'alice' ? { a: value } : { b: value };
    const otherParty = party === 'alice' ? 'bob' : 'alice';

    const protocol = await generateProtocol();

    const session = protocol.join(party, input, (to, msg) => {
      assert(to === otherParty, 'Unexpected party');
      socket.send(msg);

      currentBytes += msg.byteLength;
      this.progress.set(currentBytes / TOTAL_BYTES);
    });

    this.msgQueue.stream((msg: unknown) => {
      if (!(msg instanceof Uint8Array)) {
        throw new Error('Unexpected message type');
      }

      session.handleMessage(otherParty, msg);

      currentBytes += msg.byteLength;

      this.progress.set(currentBytes / TOTAL_BYTES);
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
      typeof output.main !== 'number'
    ) {
      throw new Error('Unexpected output');
    }

    return output.main === 0
      ? 'equal'
      : (output.main === 1 && party === 'alice') ||
          (output.main === 2 && party === 'bob')
        ? 'larger'
        : 'smaller';
  }
}
