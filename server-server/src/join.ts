import assert from 'assert';
import inquirer from 'inquirer';
import { WebSocket } from 'ws';
import { PORT } from './utils/constants';
import generateProtocol from './utils/generateProtocol';

// This script is the client server and it is supposed to impersonate Alice in the MPC.

// Create a WebSocket connection with the host server.
const ws = new WebSocket(`ws://localhost:${PORT}`);

ws.on('error', console.error);

ws.on('open', async () => {
  // Generate the protocol with mpc-framework.
  const protocol = await generateProtocol('./src/circuit/main.ts');

  // Prompt the user for input to provide Alice's circuit input.
  const { number } = await inquirer.prompt({
    type: 'input',
    name: 'number',
    message: 'Enter your number:',
  });

  // Set the session variable to manage the MPC between two
  // parties: Alice (this server) and Bob.
  const session = protocol.join('alice', { a: Number(number) }, (to, msg) => {
    assert(to === 'bob', 'Unexpected party');

    // Send the MPC message to Bob.
    ws.send(msg);
  });

  ws.on('message', (msg: Buffer) => {
    // Process incoming MPC messages for the session, assuming they are from Bob.
    session.handleMessage('bob', msg);
  });

  // Return the MPC output to log the result.
  const { main } = await session.output();

  console.log(
    `Your number is ${main === 0 ? 'equal' : main === 1 ? 'larger' : 'smaller'}`,
  );

  ws.close();
});
