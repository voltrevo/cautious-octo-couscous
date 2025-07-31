# mpc-hello (server <> server)

This is a template repository designed to be the hello-world of
[mpc-framework](https://github.com/voltrevo/mpc-framework).

It uses [summon](https://github.com/voltrevo/summon) for circuit generation
and [emp-wasm-backend](https://github.com/voltrevo/emp-wasm-backend) for
secure 2PC.

It's a computation between two servers to find the larger of two numbers.

- ~100 sloc
- Communication with WebSocket
- Circuit code included via ordinary project files

Below are other examples of mpc-hello applications you may want to explore:

- [**Client-Client**](../client-client)
- [**Client-Server**](../client-server)
- [**MPC-Hello with Next.js**](../next-js)

## Running Locally

```sh
npm install
npm run host
npm run join
```

The two input numbers are entered interactively for the sake of the example, and the computation's output will be displayed immediately.

## License

This is a template repository. You are free to use it as a starting point for
your own work without restriction. You may modify it, distribute it, and apply
your own licensing terms to your derived work as you see fit. This software is
provided "AS IS" without warranty of any kind, as described by the MIT license.
