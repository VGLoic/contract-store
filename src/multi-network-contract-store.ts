import EventEmitter from "events";
import { ABI, Contract, ContractStore, Deployment } from "./contract-store";
import ERC20 from "./default-abis/erc20.json";
import ERC721 from "./default-abis/erc721.json";
import ERC1155 from "./default-abis/erc1155.json";

type MultiNetworkOptions = {
  withoutDefaultABIs?: boolean;
};

/**
 * Contract store for managing ABIs and deployments on multiple networks
 */
export class MultiNetworkContractStore extends EventEmitter {
  private stores: Record<number, ContractStore>;
  private globalAbis: Record<string, ABI> = {};

  constructor(chainIds: number[], opts?: MultiNetworkOptions) {
    super();
    const stores = Array.from(new Set(chainIds)).reduce(
      (acc, chainId) => ({
        ...acc,
        [chainId]: new ContractStore(chainId, { withoutDefaultABIs: true }),
      }),
      {} as Record<number, ContractStore>
    );
    this.stores = stores;
    if (!opts?.withoutDefaultABIs) {
      this.registerGlobalAbi("ERC20", ERC20);
      this.registerGlobalAbi("ERC721", ERC721);
      this.registerGlobalAbi("ERC1155", ERC1155);
    }
  }

  /**
   * Get the configured chain IDs
   * @returns The array of configured chain IDs
   */
  public getChainIds() {
    return Object.keys(this.stores).map(Number);
  }

  /**
   * Add a network
   * @param chainId Chain ID of the network
   */
  public addNetwork(chainId: number) {
    if (this.stores[chainId]) {
      throw new Error(`Chain ID ${chainId} is already configured.`);
    }
    const store = new ContractStore(chainId, { withoutDefaultABIs: true });
    Object.entries(this.globalAbis).forEach(([key, abi]) => {
      store.registerAbi(key, abi);
    });
    this.stores[chainId] = store;

    this.emit("network/added", { chainId });
    return this;
  }

  /**
   * Remove a network
   * @param chainId Chain ID of the network
   */
  public removeNetwork(chainId: number) {
    if (!this.stores[chainId]) {
      throw new Error(`Chain ID ${chainId} is not configured.`);
    }
    delete this.stores[chainId];

    this.emit("network/deleted", { chainId });
    return this;
  }

  /**
   * Register a global ABI, replicating in every networks
   * @param key String key of the ABI
   * @param abi ABI
   */
  public registerGlobalAbi(key: string, abi: ABI) {
    if (this.globalAbis[key]) {
      throw new Error(`A global ABI for key ${key} already exists`);
    }
    this.globalAbis[key] = abi;
    Object.values(this.stores).forEach((store) => {
      store.registerAbi(key, abi);
    });
    return this;
  }

  /**
   * Update a global ABI, replicate the updates in every networks
   * @param key String key of the ABI
   * @param abi ABI
   */
  public updateGlobalAbi(key: string, abi: ABI) {
    if (!this.globalAbis[key]) {
      throw new Error(`No global ABI for key ${key} has been found.`);
    }
    this.globalAbis[key] = abi;
    Object.values(this.stores).forEach((store) => {
      store.updateAbi(key, abi);
    });
    return this;
  }

  /**
   * Delete a global ABI, replicating the delete in every networks
   * @param key String key of the ABI
   */
  public deleteGlobalAbi(key: string) {
    if (!this.globalAbis[key]) {
      throw new Error(`No global ABI for key ${key} has been found.`);
    }
    const isAbiUsed = Object.values(this.stores)
      .map((store) => store.isAbiUsed(key))
      .some((isUsed) => isUsed);
    if (isAbiUsed) {
      throw new Error(
        `Unable to delete the global abi for key ${key} as it is used in at least one deployment`
      );
    }
    Object.values(this.stores).forEach((store) => {
      store.deleteAbi(key);
    });
    delete this.globalAbis[key];
    return this;
  }

  /**
   * Register an ABI
   * @param chainId Chain ID of the network
   * @param key String key of the ABI
   * @param abi ABI
   */
  public registerAbi(chainId: number, key: string, abi: ABI) {
    if (this.globalAbis[key]) {
      throw new Error(`Key ${key} is already used for a global ABI.`);
    }
    this.getStore(chainId).registerAbi(key, abi);
    return this;
  }

  /**
   * Register a deployment
   * @param chainId Chain ID of the network
   * @param key String key of the deployment
   * @param deployment.address Address of the contract
   * @param deployment.abiKey String key of the already registered ABI
   */
  public registerDeployement(
    chainId: number,
    key: string,
    deployment: Deployment
  ) {
    this.getStore(chainId).registerDeployment(key, deployment);
    return this;
  }

  /**
   * Register a contract, the ABI and address are stored under the provided key
   * @param chainId Chain ID of the network
   * @param key Strink key for the address and ABI
   * @param contract.address Address of the contract
   * @param contract.abi ABI of the contract
   */
  public registerContract(chainId: number, key: string, contract: Contract) {
    this.getStore(chainId).registerContract(key, contract);
    return this;
  }

  /**
   * Update an ABI
   * @param chainId Chain ID of the network
   * @param key String key of the ABI
   * @param abi New ABI
   */
  public updateAbi(chainId: number, key: string, abi: ABI) {
    if (this.globalAbis[key]) {
      throw new Error(
        `Key ${key} is associated to a global ABI. Please, use 'updateGlobalABI' in order to update it.`
      );
    }
    this.getStore(chainId).updateAbi(key, abi);
    return this;
  }

  /**
   * Update a deployment, only the ABI key can be updated
   * @param chainId Chain ID of the network
   * @param key String key of the deployment
   * @param abiKey The new ABI key of the deployment
   */
  public updateDeployment(chainId: number, key: string, abiKey: string) {
    this.getStore(chainId).updateDeployment(key, abiKey);
    return this;
  }

  /**
   * Delete a deployment
   * @param chainId Chain ID of the network
   * @param key String key of the deployment
   */
  public deleteDeployment(chainId: number, key: string) {
    this.getStore(chainId).deleteDeployment(key);
    return this;
  }

  /**
   * Delete an ABI, the ABI can not be currently used in a deployment
   * @param chainId Chain ID of the network
   * @param key String key of the ABI
   */
  public deleteAbi(chainId: number, key: string) {
    if (this.globalAbis[key]) {
      throw new Error(
        `Key ${key} is associated to a global ABI. Please, use 'deleteGlobalABI' in order to delete it.`
      );
    }
    this.getStore(chainId).deleteAbi(key);
    return this;
  }

  /**
   * Get a global ABI
   * @param key String key of the ABI
   * @returns The ABI
   */
  public getGlobalAbi(key: string) {
    if (!this.globalAbis[key]) {
      throw new Error(`Key ${key} is not associated to a global ABI.`);
    }
    return this.globalAbis[key];
  }

  /**
   * Get an ABI
   * @param chainId Chain ID of the network
   * @param key String key of the ABI
   * @returns The ABI
   */
  public getAbi(chainId: number, key: string) {
    return this.getStore(chainId).getAbi(key);
  }

  /**
   * Get a contract by finding the address and ABI
   * @param chainId Chain ID of the network
   * @param key String key of the deployment of the contract
   * @returns The address and ABI of the contract
   */
  public getContract(chainId: number, key: string) {
    return this.getStore(chainId).getContract(key);
  }

  /**
   * Get an address
   * @param chainId Chain ID of the network
   * @param key String key of the deployment
   * @returns The address of the deployment
   */
  public getAddress(chainId: number, key: string) {
    return this.getStore(chainId).getAddress(key);
  }

  /**
   * Get all the addresses
   * @param chainId Chain ID of the network
   * @returns The array of addresses
   */
  public getAddresses(chainId: number) {
    return this.getStore(chainId).getAddresses();
  }

  private getStore(chainId: number) {
    const store = this.stores[chainId];
    if (!store) {
      throw new Error(`Chain ID ${chainId} is not configured.`);
    }
    return store;
  }
}
