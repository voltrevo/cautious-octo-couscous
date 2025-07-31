# MPC-Hello

This is a template repository designed to be the hello-world of [mpc-framework](https://github.com/voltrevo/mpc-framework). The repository contains three different examples:

1. [**Client-Client**](/client-client): A web application built using [Vite](https://vite.dev/) that demonstrates peer-to-peer (p2p) computation between two clients. Communication is facilitated via [`rtc-pair-socket`](https://github.com/voltrevo/rtc-pair-socket) for direct client-to-client interaction.
  - Looking for NextJS? Take a look at [npm create @mpc-cli](https://github.com/cedoor/mpc-cli)
2. [**Client-Server**](/client-server): A web application, also built with [Vite](https://vite.dev/), that illustrates how a client and a server can collaboratively run a secure computation. Communication is established using WebSockets.
3. [**Server-Server**](/server-server): An example showcasing how two servers can perform a secure MPC computation. This setup uses WebSockets for communication between the servers.
4. [**Deno-Deno**](/deno-deno): An example showcasing how two Deno servers can perform a secure MPC computation. This setup uses WebSockets for communication between the servers.

## Getting Started

After creating your repository based on this template, clone it and navigate to the example you want to run:

```bash
git clone https://github.com/voltrevo/mpc-hello.git
cd mpc-hello/<example-folder>
npm install
```

Read the README file of the example for more instructions on how to run the app.

## License

This is a template repository. You are free to use it as a starting point for your own work without restriction. You may modify it, distribute it, and apply your own licensing terms to your derived work as you see fit. This software is provided "AS IS" without warranty of any kind, as described by the MIT license.
