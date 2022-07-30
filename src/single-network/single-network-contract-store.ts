import ERC20 from "../default-abis/erc20.json";
import ERC721 from "../default-abis/erc721.json";
import ERC1155 from "../default-abis/erc1155.json";
import { ABI, Contract, Deployment } from "../helper-types";
import { Options } from "./common-types";

type WithoutDefaultABIs<Opts extends Options | undefined> = Opts extends Options
  ? Opts["withoutDefaultABIs"] extends true
    ? true
    : false
  : false;

type ABIKey<
  ABIs extends Record<string, ABI>,
  Opts extends Options | undefined
> = Extract<
  | keyof ABIs
  | (WithoutDefaultABIs<Opts> extends true
      ? keyof {}
      : "ERC20" | "ERC721" | "ERC1155"),
  string
>;

type DeploymentKey<
  ABIs extends Record<string, ABI>,
  Opts extends Options | undefined,
  Deployments extends Record<string, Deployment<ABIKey<ABIs, Opts>>>
> = Extract<keyof Deployments, string>;

type Configuration<
  ABIs extends Record<string, ABI>,
  Opts extends Options | undefined,
  Deployments extends Record<string, Deployment<ABIKey<ABIs, Opts>>>
> = {
  abis: ABIs;
  deployments: Deployments;
};

/**
 * Static Contract Store for managing ABIs and deployments on a single network
 */
export class SingleNetworkContractStore<
  ABIs extends Record<string, ABI> = {},
  Opts extends Options | undefined = undefined,
  Deployments extends Record<string, Deployment<ABIKey<ABIs, Opts>>> = {}
> {
  public readonly chainId: number;

  private abis: ABIs;
  private deployments: Record<string, Deployment<ABIKey<ABIs, Opts>>>;

  constructor(
    chainId: number,
    config: Configuration<ABIs, Opts, Deployments>,
    opts?: Opts
  ) {
    this.chainId = chainId;

    const abis = {} as Record<string, ABI>;
    if (!opts?.withoutDefaultABIs) {
      abis["ERC20"] = ERC20;
      abis["ERC721"] = ERC721;
      abis["ERC1155"] = ERC1155;
    }
    if (config.abis) {
      Object.entries(config.abis).forEach(([key, abi]) => {
        abis[key] = abi;
      });
    }
    this.abis = abis as ABIs;

    const deployments = {} as Record<string, Deployment<ABIKey<ABIs, Opts>>>;
    if (config.deployments) {
      Object.entries(config.deployments).forEach(([key, deployment]) => {
        if (!this.abis[deployment.abiKey]) {
          throw new Error(
            `No ABI for key ${deployment.abiKey} and chain ID ${this.chainId} has been found.`
          );
        }
        deployments[key] = deployment;
      });
    }
    this.deployments = deployments;
  }

  /**
   * Get an ABI
   * @param key String key of the ABI
   * @returns The ABI
   */
  public getAbi(key: ABIKey<ABIs, Opts>) {
    const abi = this.abis[key];
    if (!abi) {
      throw new Error(
        `No ABI for key ${String(key)} and chain ID ${
          this.chainId
        } has been found.`
      );
    }
    return abi;
  }

  /**
   * Get a contract by finding the address and ABI
   * @param key String key of the deployment of the contract
   * @returns The address and ABI of the contract
   */
  public getContract(key: DeploymentKey<ABIs, Opts, Deployments>): Contract {
    const deployment = this.getDeployment(key);
    const abi = this.getAbi(deployment.abiKey);
    return {
      address: deployment.address,
      abi,
    };
  }

  /**
   * Get an address
   * @param key String key of the deployment
   * @returns The address of the deployment
   */
  public getAddress(key: DeploymentKey<ABIs, Opts, Deployments>) {
    const deployment = this.getDeployment(key);
    return deployment.address;
  }

  /**
   * Get all the addresses
   * @returns The array of addresses
   */
  public getAddresses() {
    return Object.values(this.deployments).map(
      (deployment) => deployment.address
    );
  }

  /**
   * Convert the store to an object
   * @returns The store abis and deployments
   */
  public toObject() {
    return {
      abis: this.abis,
      deployments: this.deployments,
    };
  }

  /**
   * Get a deployment
   * @param key String key of the deployment
   * @returns The deployment
   */
  private getDeployment(key: DeploymentKey<ABIs, Opts, Deployments>) {
    const deployment = this.deployments[key];
    if (!deployment) {
      throw new Error(
        `No deployment for key ${String(key)} and chain ID ${
          this.chainId
        } has been found.`
      );
    }
    return deployment;
  }
}
