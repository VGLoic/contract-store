import ERC20 from "../default-abis/erc20.json";
import ERC721 from "../default-abis/erc721.json";
import ERC1155 from "../default-abis/erc1155.json";
import { SingleNetworkContractStore } from "../single-network";
import { Deployment, ABI, Contract } from "../helper-types";
import { MultiNetworkOptions } from "./common-types";

type Network = {
  abis: Record<string, ABI>;
  deployments: Record<string, Deployment>;
};

type WithoutDefaultABIs<Opts extends MultiNetworkOptions | undefined> =
  Opts extends MultiNetworkOptions
    ? Opts["withoutDefaultABIs"] extends true
      ? true
      : false
    : false;

type GlobalABIKey<
  GlobalABIs extends Record<string, ABI>,
  Opts extends MultiNetworkOptions
> = Extract<
  | keyof GlobalABIs
  | (WithoutDefaultABIs<Opts> extends true
      ? keyof {}
      : "ERC20" | "ERC721" | "ERC1155"),
  string
>;

type AllowedChainId<Networks extends Record<number, Network>> = Extract<
  keyof Networks,
  number
>;

type DeploymentKey<
  Networks extends Record<number, Network>,
  ChainId extends AllowedChainId<Networks>
> = Networks[ChainId] extends Network
  ? Extract<keyof Networks[ChainId]["deployments"], string>
  : never;

type ABIKey<
  GlobalABIs extends Record<string, ABI>,
  Networks extends Record<number, Network>,
  ChainId extends AllowedChainId<Networks>,
  Opts extends MultiNetworkOptions
> = Networks[ChainId] extends Network
  ? Extract<
      | keyof Networks[ChainId]["abis"]
      | keyof GlobalABIs
      | (WithoutDefaultABIs<Opts> extends true
          ? keyof {}
          : "ERC20" | "ERC721" | "ERC1155"),
      string
    >
  : never;

type Configuration<
  GlobalABIs extends Record<string, ABI>,
  Networks extends Record<number, Network>
> = {
  globalAbis: GlobalABIs;
  networks: Networks;
};

/**
 * Static Contract store for managing ABIs and deployments on multiple networks
 */
export class ContractStore<
  GlobalABIs extends Record<string, ABI>,
  Networks extends Record<number, Network>,
  Opts extends MultiNetworkOptions
> {
  private stores;
  private globalAbis: GlobalABIs;

  constructor(config: Configuration<GlobalABIs, Networks>, opts?: Opts) {
    const chainIds = Object.keys(config.networks);

    this.globalAbis = config.globalAbis;

    const stores = chainIds.reduce((acc, chainId) => {
      const formattedChainId = Number(chainId);
      const networkConfig = config.networks[formattedChainId];
      const abis: Record<string, ABI> = config.globalAbis || {};
      if (!opts?.withoutDefaultABIs) {
        abis["ERC20"] = ERC20;
        abis["ERC721"] = ERC721;
        abis["ERC1155"] = ERC1155;
      }
      Object.entries(networkConfig.abis).forEach(([key, abi]) => {
        if (abis[key]) {
          throw new Error(
            `An ABI already exists for key ${key} and chain ID ${chainId}`
          );
        }
        abis[key] = abi;
      });
      return {
        ...acc,
        [formattedChainId]: new SingleNetworkContractStore(
          formattedChainId,
          {
            abis,
            deployments: networkConfig.deployments,
          },
          { withoutDefaultABIs: true }
        ),
      };
    }, {} as Record<AllowedChainId<Networks>, SingleNetworkContractStore>);
    this.stores = stores;
  }

  /**
   * Get the configured chain IDs
   * @returns The array of configured chain IDs
   */
  public getChainIds() {
    return Object.keys(this.stores).map(Number);
  }

  /**
   * Get a global ABI
   * @param key String key of the ABI
   * @returns The ABI
   */
  public getGlobalAbi(key: GlobalABIKey<GlobalABIs, Opts>) {
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
  public getAbi<ChainId extends AllowedChainId<Networks>>(
    chainId: ChainId,
    key: ABIKey<GlobalABIs, Networks, ChainId, Opts>
  ) {
    return this.getStore(chainId).getAbi(key as never);
  }

  /**
   * Get a contract by finding the address and ABI
   * @param chainId Chain ID of the network
   * @param key String key of the deployment of the contract
   * @returns The address and ABI of the contract
   */
  public getContract<ChainId extends AllowedChainId<Networks>>(
    chainId: ChainId,
    key: DeploymentKey<Networks, ChainId>
  ): Contract {
    return this.getStore(chainId).getContract(key as never);
  }

  /**
   * Get an address
   * @param chainId Chain ID of the network
   * @param key String key of the deployment
   * @returns The address of the deployment
   */
  public getAddress<ChainId extends AllowedChainId<Networks>>(
    chainId: ChainId,
    key: DeploymentKey<Networks, ChainId>
  ) {
    return this.getStore(chainId).getAddress(key as never);
  }

  /**
   * Get all the addresses
   * @param chainId Chain ID of the network
   * @returns The array of addresses
   */
  public getAddresses(chainId: AllowedChainId<Networks>) {
    return this.getStore(chainId).getAddresses();
  }

  private getStore(chainId: AllowedChainId<Networks>) {
    const store = this.stores[chainId];
    if (!store) {
      throw new Error(`Chain ID ${chainId} is not configured.`);
    }
    return store;
  }
}
