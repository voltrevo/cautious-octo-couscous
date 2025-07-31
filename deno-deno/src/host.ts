import { assert } from "@std/assert";
import { Session } from "mpc-framework";
import { PORT } from "./utils/constants.ts";
import generateProtocol from "./utils/generateProtocol.ts";

console.info(`Listening on port ${PORT}...\n`);

const server = Deno.serve(
  { port: PORT, hostname: "127.0.0.1" },
  async (req) => {
    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onerror = (err) => console.error("WebSocket error:", err);

    // Generate the protocol with mpc-framework.
    const protocol = await generateProtocol("./src/circuit/main.ts");

    // Set the session variable to manage the MPC between two
    // parties: Bob (this server) and Alice.
    let session: Session;

    // Handle incoming messages from Alice.

    socket.onmessage = async (event) => {
      let msg: Uint8Array;

      if (event.data instanceof Blob) {
        msg = new Uint8Array(await event.data.arrayBuffer());
      } else if (event.data instanceof ArrayBuffer) {
        msg = new Uint8Array(event.data);
      } else {
        console.error("Unexpected event.data", event.data);
        return;
      }

      if (!session) {
        // Prompt the user for input to provide Bob's circuit input.

        const b = Number(prompt("Enter your number:"));

        session = protocol.join("bob", { b }, (to, msg) => {
          assert(to === "alice", "Unexpected party");

          // Send the MPC message to Alice.
          socket.send(msg);
        });

        // Handle the MPC output to log the result.
        session.output().then(({ main }) => {
          console.log(
            `Your number is ${
              main === 0 ? "equal" : main === 1 ? "smaller" : "larger"
            }`,
          );

          server.shutdown();
        });
      }

      // Process incoming MPC messages for the session, assuming they are from Alice.
      session.handleMessage("alice", new Uint8Array(msg));
    };

    return response;
  },
);
