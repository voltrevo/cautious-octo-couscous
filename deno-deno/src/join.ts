import { assert } from "@std/assert";
import { PORT } from "./utils/constants.ts";
import generateProtocol from "./utils/generateProtocol.ts";

// This script is the client and it is supposed to impersonate Alice in the MPC.

const ws = new WebSocket(`ws://127.0.0.1:${PORT}`);

ws.onerror = (err) => console.error("WebSocket error:", err);

ws.onopen = async () => {
  // Generate the protocol with mpc-framework.
  const protocol = await generateProtocol("./src/circuit/main.ts");

  // Prompt the user for input to provide Alice's circuit input.
  const a = Number(prompt("Enter your number:"));

  // Set the session variable to manage the MPC between two
  // parties: Alice (this client) and Bob.
  const session = protocol.join("alice", { a }, (to, msg) => {
    assert(to === "bob", "Unexpected party");

    // Send the MPC message to Bob.
    ws.send(msg);
  });

  ws.onmessage = async (event) => {
    let msg: Uint8Array;

    if (event.data instanceof Blob) {
      msg = new Uint8Array(await event.data.arrayBuffer());
    } else if (event.data instanceof ArrayBuffer) {
      msg = new Uint8Array(event.data);
    } else {
      console.error("Unexpected event.data", event.data);
      return;
    }

    // Process incoming MPC messages for the session, assuming they are from Bob.
    session.handleMessage("bob", msg);
  };

  // Return the MPC output to log the result.
  const { main } = await session.output();

  console.log(
    `Your number is ${
      main === 0 ? "equal" : main === 1 ? "larger" : "smaller"
    }`,
  );

  ws.close();
};
