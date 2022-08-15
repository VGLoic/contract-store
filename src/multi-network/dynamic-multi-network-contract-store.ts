import EventEmitter from "events";
import { DynamicSingleNetworkContractStore } from "../single-network";
import ERC20 from "../default-abis/erc20.json";
import ERC721 from "../default-abis/erc721.json";
import ERC1155 from "../default-abis/erc1155.json";
import {
  NumericUnion,
  LiteralUnion,
  Deployment,
  ABI,
  Contract,
} from "../helper-types";

type MultiNetworkOptions = {
  withoutDefaultABIs?: boolean;
};

type Network = {
  abis?: Record<string, ABI>;
  deployments?: Record<string, Deployment>;
};
type GenericConfiguration = {
  globalAbis?: Record<string, ABI>;
  networks: Record<number, Network>;
};

type WithoutDefaultABIs<Opts extends MultiNetworkOptions | undefined> =
  Opts extends MultiNetworkOptions
    ? Opts["withoutDefaultABIs"] extends true
      ? true
      : false
    : false;

type OriginalGlobalABIKey<
  Config extends GenericConfiguration,
  Opts extends MultiNetworkOptions | undefined
> = Extract<
  | keyof Config["globalAbis"]
  | (WithoutDefaultABIs<Opts> extends true
      ? keyof {}
      : "ERC20" | "ERC721" | "ERC1155"),
  string
>;
type OriginalChainId<Config extends GenericConfiguration> = Extract<
  keyof Config["networks"],
  number
>;
type OriginalDeploymentKey<
  Config extends GenericConfiguration,
  ChainId extends OriginalChainId<Config>
> = Config["networks"][ChainId] extends Network
  ? Extract<keyof Config["networks"][ChainId]["deployments"], string>
  : never;
type OriginalABIKey<
  Config extends GenericConfiguration,
  ChainId extends OriginalChainId<Config>,
  Opts extends MultiNetworkOptions | undefined
> = Config["networks"][ChainId] extends Network
  ? Extract<
      | keyof Config["networks"][ChainId]["abis"]
      | keyof Config["globalAbis"]
      | (WithoutDefaultABIs<Opts> extends true
          ? keyof {}
          : "ERC20" | "ERC721" | "ERC1155"),
      string
    >
  : never;

/**
 * Contract store for managing ABIs and deployments on multiple networks
 */
export class DynamicContractStore<
  Opts extends MultiNetworkOptions,
  OriginalConfig extends GenericConfiguration
> extends EventEmitter {
  private stores: Record<number, DynamicSingleNetworkContractStore<Opts>>;
  private globalAbis: Record<string, ABI> = {};

  constructor(originalConfig: OriginalConfig, opts?: Opts) {
    super();
    const chainIds = Object.keys(originalConfig.networks);
    const stores = chainIds.reduce((acc, chainId) => {
      return {
        ...acc,
        [chainId]: new DynamicSingleNetworkContractStore(
          Number(chainId),
          {},
          { withoutDefaultABIs: true }
        ),
      };
    }, {} as Record<OriginalChainId<OriginalConfig>, DynamicSingleNetworkContractStore<Opts>>);
    this.stores = stores;
    if (!opts?.withoutDefaultABIs) {
      this.registerGlobalAbi("ERC20", ERC20);
      this.registerGlobalAbi("ERC721", ERC721);
      this.registerGlobalAbi("ERC1155", ERC1155);
    }
    if (originalConfig.globalAbis) {
      Object.entries(originalConfig.globalAbis).forEach(([key, abi]) => {
        this.registerGlobalAbi(key, abi);
      });
    }
    chainIds.forEach((chainId) => {
      const formattedChainId = Number(chainId);
      const networkConfig = originalConfig.networks[formattedChainId];
      if (networkConfig.abis) {
        Object.entries(networkConfig.abis).forEach(([key, abi]) => {
          this.registerAbi(formattedChainId, key, abi);
        });
      }
      if (networkConfig.deployments) {
        Object.entries(networkConfig.deployments).forEach(
          ([key, deployment]) => {
            this.registerDeployment(formattedChainId, key, deployment);
          }
        );
      }
    });
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
    const store = new DynamicSingleNetworkContractStore(
      chainId,
      {},
      { withoutDefaultABIs: true }
    );
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
  public removeNetwork<ChainId extends OriginalChainId<OriginalConfig>>(
    chainId: NumericUnion<ChainId>
  ) {
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
  public updateGlobalAbi<
    KeyType extends OriginalGlobalABIKey<OriginalConfig, Opts>
  >(key: LiteralUnion<KeyType>, abi: ABI) {
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
  public deleteGlobalAbi<
    KeyType extends OriginalGlobalABIKey<OriginalConfig, Opts>
  >(key: LiteralUnion<KeyType>) {
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
  public registerAbi<ChainId extends OriginalChainId<OriginalConfig>>(
    chainId: NumericUnion<ChainId>,
    key: string,
    abi: ABI
  ) {
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
  public registerDeployment<ChainId extends OriginalChainId<OriginalConfig>>(
    chainId: NumericUnion<ChainId>,
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
  public registerContract<ChainId extends OriginalChainId<OriginalConfig>>(
    chainId: NumericUnion<ChainId>,
    key: string,
    contract: Contract
  ) {
    this.getStore(chainId).registerContract(key, contract);
    return this;
  }

  /**
   * Update an ABI
   * @param chainId Chain ID of the network
   * @param key String key of the ABI
   * @param abi New ABI
   */
  public updateAbi<
    ChainId extends OriginalChainId<OriginalConfig>,
    ABIKey extends OriginalABIKey<OriginalConfig, ChainId, Opts>
  >(chainId: NumericUnion<ChainId>, key: LiteralUnion<ABIKey>, abi: ABI) {
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
  public updateDeployment<
    ChainId extends OriginalChainId<OriginalConfig>,
    DeploymentKey extends OriginalDeploymentKey<OriginalConfig, ChainId>,
    ABIKey extends OriginalABIKey<OriginalConfig, ChainId, Opts>
  >(
    chainId: NumericUnion<ChainId>,
    key: LiteralUnion<DeploymentKey>,
    abiKey: LiteralUnion<ABIKey>
  ) {
    this.getStore(chainId).updateDeployment(key, abiKey);
    return this;
  }

  /**
   * Delete a deployment
   * @param chainId Chain ID of the network
   * @param key String key of the deployment
   */
  public deleteDeployment<
    ChainId extends OriginalChainId<OriginalConfig>,
    DeploymentKey extends OriginalDeploymentKey<OriginalConfig, ChainId>
  >(chainId: NumericUnion<ChainId>, key: LiteralUnion<DeploymentKey>) {
    this.getStore(chainId).deleteDeployment(key);
    return this;
  }

  /**
   * Delete an ABI, the ABI can not be currently used in a deployment
   * @param chainId Chain ID of the network
   * @param key String key of the ABI
   */
  public deleteAbi<
    ChainId extends OriginalChainId<OriginalConfig>,
    ABIKey extends OriginalABIKey<OriginalConfig, ChainId, Opts>
  >(chainId: NumericUnion<ChainId>, key: LiteralUnion<ABIKey>) {
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
  public getGlobalAbi<
    GlobalABIKey extends OriginalGlobalABIKey<OriginalConfig, Opts>
  >(key: LiteralUnion<GlobalABIKey>) {
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
  public getAbi<
    ChainId extends OriginalChainId<OriginalConfig>,
    ABIKey extends OriginalABIKey<OriginalConfig, ChainId, Opts>
  >(chainId: NumericUnion<ChainId>, key: LiteralUnion<ABIKey>) {
    return this.getStore(chainId).getAbi(key);
  }

  /**
   * Get a contract by finding the address and ABI
   * @param chainId Chain ID of the network
   * @param key String key of the deployment of the contract
   * @returns The address and ABI of the contract
   */
  public getContract<
    ChainId extends OriginalChainId<OriginalConfig>,
    DeploymentKey extends OriginalDeploymentKey<OriginalConfig, ChainId>
  >(chainId: NumericUnion<ChainId>, key: LiteralUnion<DeploymentKey>) {
    return this.getStore(chainId).getContract(key);
  }

  /**
   * Get an address
   * @param chainId Chain ID of the network
   * @param key String key of the deployment
   * @returns The address of the deployment
   */
  public getAddress<
    ChainId extends OriginalChainId<OriginalConfig>,
    DeploymentKey extends OriginalDeploymentKey<OriginalConfig, ChainId>
  >(chainId: NumericUnion<ChainId>, key: LiteralUnion<DeploymentKey>) {
    return this.getStore(chainId).getAddress(key);
  }

  /**
   * Get all the addresses
   * @param chainId Chain ID of the network
   * @returns The array of addresses
   */
  public getAddresses<ChainId extends OriginalChainId<OriginalConfig>>(
    chainId: NumericUnion<ChainId>
  ) {
    return this.getStore(chainId).getAddresses();
  }

  /**
   * Convert the store to an object
   * @returns The store abis and deployments by networks with the global abis
   */
  public toObject() {
    const chainIds = this.getChainIds();
    return {
      globalAbis: this.globalAbis,
      networks: chainIds.reduce((acc, chainId) => {
        acc[chainId] = this.getStore(chainId).toObject();
        return acc;
      }, {} as Record<number, Network>),
    };
  }

  private getStore<ChainId extends OriginalChainId<OriginalConfig>>(
    chainId: NumericUnion<ChainId>
  ) {
    const store = this.stores[chainId];
    if (!store) {
      throw new Error(`Chain ID ${chainId} is not configured.`);
    }
    return store;
  }
}
