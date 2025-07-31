# mpc-hello with NextJS (client <> client)

This is a template repository designed to be the hello-world of
[trinity](https://github.com/privacy-scaling-explorations/Trinity).

It uses [summon](https://github.com/voltrevo/summon) for circuit generation
and [Trinity](https://github.com/privacy-scaling-explorations/Trinity) for
secure 2PC.

It's a minimal web app where users can make 1-to-1 connections with each other
and compute the larger of two numbers, built with Next.js.

- Simple frontend
- P2P end-to-end encrypted communication
- Circuit code included via ordinary project files
- Can be run into `Plain` or `Halo2` mode, by switching up the following line.

```js
type mode = 'Plain' | 'Halo2'
const trinitySetup = protocol.trinityModule.TrinityWasmSetup(mode);
```

Below are other examples of mpc-hello applications you may want to explore:

- [**Client-Client**](../client-client)
- [**Client-Server**](../client-server)
- [**Server-Server**](../server-server)

## Running Locally

```sh
npm install
npm run dev
```

## License

This is a template repository. You are free to use it as a starting point for
your own work without restriction. You may modify it, distribute it, and apply
your own licensing terms to your derived work as you see fit. This software is
provided "AS IS" without warranty of any kind, as described by the MIT license.
