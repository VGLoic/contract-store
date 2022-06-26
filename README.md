# Contract Store

[![Coverage Status](https://coveralls.io/repos/github/VGLoic/contract-store/badge.svg?branch=alpha)](https://coveralls.io/github/VGLoic/contract-store?branch=alpha)

**:warning: The package is quite recent, any contributions, issues or feedbacks are welcome :warning:**

Minimalist store in order to manage the various ABIs and deployed contract addresses on multiple networks.

## Quick start

The recommended way to use Contract-Store with an application is to install it as a dependency:

Using `npm`
```console
npm install contract-store@alpha --save-dev
```
Or using `yarn`
```console
yarn add contract-store@alpha --dev
```

Then, one can start storing and using the needed **ABIs** or **deployments**
```ts
import { MultiNetworkContractStore } from 'contract-store';

const networks = {
  mainnet: 1,
  goerli: 5,
};
// Store is registered for Mainnet and Goerli
const store = new MultiNetworkContractStore([
    networks.mainnet,
    networks.goerli
]);

const MY_ABI = [...];
// Register the ABI and the deployment at key 'FOO' on Mainnet network
store.registerContract(networks.mainnet, 'FOO', {
    address: '0xCe6afb858673550635b49F8Ffb855b20334228dF',
    abi: MY_ABI
});

...

// ABI and deployment address can then be retrieved anywhere
const myContractArtifacts = store.getContract(networks.mainnet, 'FOO');
// `buildContract` is an arbitrary function used as an example here
const myContract = buildContract(
    myContractArtifacts.address,
    myContractArtifacts.abi
);
```

## Default ABIs

The contract store already comes with registered ABIs `ERC20`, `ERC721` and `ERC1155` standard ABIs. The ABIs have been generated using [Open Zeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts) implementations.

```ts
import { MultiNetworkContractStore } from 'contract-store';

const networks = { goerli: 5 };
const store = new MultiNetworkContractStore([
    networks.goerli
]);

// Register a deployment at key 'BAR' with the default ERC20 ABI on Goerli network
store.registerDeployment(networks.goerli, 'BAR', {
    address: '0x5A22EA0DC6553267bDB273eB55Ccb40EFA78F804',
    // ERC20, ERC721 and ERC1155 abis are by default included in the store
    abiKey: 'ERC20'
});

...

// ABI and deployment address can then be retrieved anywhere
const tokenArtifacts = store.getContract(networks.goerli, 'BAR');
// `buildContract` is an arbitrary function used as an example here
const token = buildContract(tokenArtifacts.address, tokenArtifacts.abi);
```

## API overview

The `MultiNetworkContractStore` methods are organised around two distinct pieces of a contract, the ABI and address.

The ABI is meaningful by itself, while an address is necessarily linked to one ABI underneath. 

For this reason, the `ABIs` and the `deployments` have different methods.


### Key value store

Each data stored is organised by a **string key** defined by the developer at insertion. This key is then used in order to retrieve the data.

### One sub store per network

The networks are decoupled from each other, meaning that registering ABIs or deployments on a network will not make them accessible from another network. For this reason, most methods take the `chain ID` of the network as first argument.

### ABI

ABIs can be registered, added or deleted from any configured network.
```ts
// Register an ABI on Goerli, it will be available only for Goerli
store.registerAbi(network.goerli, "FOO", MY_ABI);
const abi = store.getAbi(networks.goerli, "FOO");
// Retrieving it on another network will throw
const thisWillFail = store.getAbi(networks.mainnet, "FOO");
```

Some ABI deserves to be available on every networks, for this reason, the global ABIs have been introduced. A global ABI is the same on every network and can be registerred, updated or deleted using dedicated methods
```ts
// Register an ABI globally, it will be available for every configured networks in the store
store.registerGlobalAbi("FOO", MY_ABI);
// One can retrieve it without specifying a network
const globalAbi = store.getGlobalAbi("FOO");
// Or by targeting a specific network
const abi = store.getAbi(networks.goerli, "FOO");
// It can then be used for any deploymment
store.registerDeployment(networks.goerli, "BAR", {
    abiKey: "FOO",
    address: "0x1234...5678"
});
```

### Deployment

A deployment is defined as an Ethereum address linked to an ABI string key.

When the ABI is already registered in the contract, one can register a deployment as
```ts
// The ABI with key "FOO" has already been registered on Goerli
store.registerDeployment(networks.goerli, "BAR", {
    abiKey: "FOO"
    address: "0x1234...5678"
});
```

If the ABI has not already been registered, one can register at the same time the ABI and the deployment
```ts
// The ABI and the deployment will be both registered using the same key "BAR"
store.registerContract(networks.goerli, "BAR", {
    abi: MY_ABI,
    address: "0x1234...5678"
});
```

Once a deployment has been registered, one can retrieve the full contract or just the address using the deployment key
```ts
// Only the address is retrieved
const address = store.getAddress(networks.goerli, "BAR");
// Retrieve both the address and the ABI, even if the ABI is using another key than "BAR"
const contract = store.getContract(networks.goerli, "BAR");
```

One can also retrieve all the addresses deployed on a network
```ts
// Array of deployed addresses
const addresses = store.getAddresses(networks.goerli);
```

## Networks

The `MultiNetworkContractStore` is configured for an initial list of networks from an array of chain IDs given in the constructor. It is then possible to manage the networks using the API exposed by the store.

One can add a network
```ts
store.addNetwork(networks.polygon);
```

Or removing one
```ts
store.removeNetwork(networks.polygon);
```

Here is non exhaustive list of networks and their chain IDs
```ts
const networks = {
  mainnet: 1, // 0x1
  // Test nets
  goerli: 5, // 0x5
  ropsten: 3, // 0x3
  rinkeby: 4, // 0x4
  kovan: 42, // 42 0x2a
  mumbai: 80001, // 0x13881
  // Layers 2
  arbitrum: 42161, // 0xa4b1
  optimism: 10, // 0xa
  // Side chains
  polygon: 137, // 0x89
  gnosisChain: 100, // 0x64
  // Alt layer 1
  binanceSmartChain: 56, // 0x38
  avalanche: 43114, // 0xa86a
  cronos: 25, // 0x19
  fantom: 250 // 0xfa
}
```

## Contributing :rocket:

Contributions are welcome! Please follow the guidelines in the [contributing document](/CONTRIBUTING.md).