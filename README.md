# Contract Store

**:warning: The package is quite recent, any contributions, issues or feedbacks are welcome :warning:**

## Get started

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
import { ContractStore } from 'contract-store';

// Store is for Mainnet wich chain ID 1
const store = new ContractStore(1);

const MY_ABI = [...];
// Register the ABI and the deployment at key 'FOO'
store.registerContract('FOO', {
    address: '0xCe6afb858673550635b49F8Ffb855b20334228dF',
    abi: MY_ABI
});

// Register a deployment at key 'BAR' with the default ERC20 ABI
store.registerDeployment('BAR', {
    address: '0x5A22EA0DC6553267bDB273eB55Ccb40EFA78F804',
    // ERC20, ERC721 and ERC1155 abis are by default included in the store
    abiKey: 'ERC20'
});

...
// ABI and deployment address can then be retrieved anywhere
const tokenArtifacts = store.getContract('BAR');
const token = buildContract(tokenArtifacts.address, tokenArtifacts.abi);

const myContractArtifacts = store.getContract('FOO');
const myContract = buildContract(myContractArtifacts.address, myContractArtifacts.abi);
```

## Contributing :rocket:

Contributions are welcome! Please follow the guidelines in the [contributing document](/CONTRIBUTING.md).