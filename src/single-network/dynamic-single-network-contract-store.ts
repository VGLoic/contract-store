import EventEmitter from "events";
import ERC20 from "../default-abis/erc20.json";
import ERC721 from "../default-abis/erc721.json";
import ERC1155 from "../default-abis/erc1155.json";
import { ABI, Contract, Deployment, LiteralUnion } from "../helper-types";
import { Options } from "./common-types";

type GenericConfiguration = {
  abis?: Record<string, ABI>;
  deployments?: Record<string, Deployment>;
};

type OriginalDeploymentKey<Config extends GenericConfiguration> = Extract<
  keyof Config["deployments"],
  string
>;
type WithoutDefaultABIs<Opts extends Options | undefined> = Opts extends Options
  ? Opts["withoutDefaultABIs"] extends true
    ? true
    : false
  : false;

type OriginalABIKey<
  Config extends GenericConfiguration,
  Opts extends Options | undefined
> = Extract<
  | keyof Config["abis"]
  | (WithoutDefaultABIs<Opts> extends true
      ? keyof {}
      : "ERC20" | "ERC721" | "ERC1155"),
  string
>;

/**
 * Dynamic Contract Store for managing ABIs and deployments on a single network
 */
export class DynamicSingleNetworkContractStore<
  Opts extends Options | undefined,
  OriginalConfig extends GenericConfiguration = {}
> extends EventEmitter {
  public readonly chainId: number;

  private abis: Record<string, ABI> = {};
  private deployments: Record<string, Deployment> = {};

  constructor(chainId: number, originalConfig: OriginalConfig, opts?: Opts) {
    super();
    this.chainId = chainId;
    if (!opts?.withoutDefaultABIs) {
      this.registerAbi("ERC20", ERC20);
      this.registerAbi("ERC721", ERC721);
      this.registerAbi("ERC1155", ERC1155);
    }
    if (originalConfig.abis) {
      Object.entries(originalConfig.abis).forEach(([key, abi]) => {
        this.registerAbi(key, abi);
      });
    }
    if (originalConfig.deployments) {
      Object.entries(originalConfig.deployments).forEach(
        ([key, deployment]) => {
          this.registerDeployment(key, deployment);
        }
      );
    }
  }

  /**
   * Register an ABI
   * @param key String key of the ABI
   * @param abi ABI
   */
  public registerAbi(key: string, abi: ABI) {
    if (this.abis[key]) {
      throw new Error(
        `An ABI already exists for key ${key} and chain ID ${this.chainId}`
      );
    }
    this.abis[key] = abi;
    this.emit("abi/registered", { key, abi, chainId: this.chainId });
    return this;
  }

  /**
   * Register a deployment
   * @param key String key of the deployment
   * @param deployment.address Address of the contract
   * @param deployment.abiKey String key of the already registered ABI
   */
  public registerDeployment(key: string, deployment: Deployment) {
    if (this.deployments[key]) {
      throw new Error(
        `A deployment already exists for key ${key} and chain ID ${this.chainId}`
      );
    }
    if (!this.abis[deployment.abiKey]) {
      throw new Error(
        `No ABI for key ${key} and chain ID ${this.chainId} has been found.`
      );
    }
    this.deployments[key] = deployment;
    this.emit("deployment/registered", {
      key,
      deployment: {
        address: deployment.address,
        abiKey: deployment.abiKey,
        chainId: this.chainId,
      },
    });
    return this;
  }

  /**
   * Register a contract, the ABI and address are stored under the provided key
   * @param key Strink key for the address and ABI
   * @param contract.address Address of the contract
   * @param contract.abi ABI of the contract
   */
  public registerContract(key: string, contract: Contract) {
    this.registerAbi(key, contract.abi);
    this.registerDeployment(key, {
      address: contract.address,
      abiKey: key,
    });
    return this;
  }

  /**
   * Update an ABI
   * @param key String key of the ABI
   * @param abi New ABI
   */
  public updateAbi<ABIKey extends OriginalABIKey<OriginalConfig, Opts>>(
    key: LiteralUnion<ABIKey>,
    abi: ABI
  ) {
    if (!this.abis[key]) {
      throw new Error(
        `No ABI for key ${key} and chain ID ${this.chainId} has been found.`
      );
    }
    this.abis[key] = abi;
    this.emit("abi/updated", { key, abi, chainId: this.chainId });
    return this;
  }

  /**
   * Update a deployment, only the ABI key can be updated
   * @param key String key of the deployment
   * @param abiKey The new ABI key of the deployment
   */
  public updateDeployment<
    DeploymentKey extends OriginalDeploymentKey<OriginalConfig>,
    ABIKey extends OriginalABIKey<OriginalConfig, Opts>
  >(key: LiteralUnion<DeploymentKey>, abiKey: LiteralUnion<ABIKey>) {
    if (!this.deployments[key]) {
      throw new Error(
        `No deployment for key ${key} and chain ID ${this.chainId} has been found.`
      );
    }
    if (!this.abis[abiKey]) {
      throw new Error(
        `No ABI for key ${key} and chain ID ${this.chainId} has been found.`
      );
    }
    this.deployments[key].abiKey = abiKey;
    this.emit("deployment/updated", { key, abiKey, chainId: this.chainId });
    return this;
  }

  /**
   * Delete a deployment
   * @param key String key of the deployment
   */
  public deleteDeployment<
    DeploymentKey extends OriginalDeploymentKey<OriginalConfig>
  >(key: LiteralUnion<DeploymentKey>) {
    const deployment = this.getDeployment(key);
    delete this.deployments[key];
    this.emit("deployment/deleted", { key, deployment, chainId: this.chainId });
    return this;
  }

  /**
   * Delete an ABI, the ABI can not be currently used in a deployment
   * @param key String key of the ABI
   */
  public deleteAbi<ABIKey extends OriginalABIKey<OriginalConfig, Opts>>(
    key: LiteralUnion<ABIKey>
  ) {
    const abi = this.getAbi(key);
    if (this.isAbiUsed(key)) {
      throw new Error(
        `Unable to delete the abi for key ${key} on chain ID ${this.chainId} as it is used in at least one deployment.`
      );
    }
    delete this.abis[key];
    this.emit("abi/deleted", { key, abi, chainId: this.chainId });
    return this;
  }

  /**
   * Check if an ABI is used in a deployment
   * @param key String key of the ABI
   * @returns True if the ABI is used in a deployment, false otherwise
   */
  public isAbiUsed<ABIKey extends OriginalABIKey<OriginalConfig, Opts>>(
    key: LiteralUnion<ABIKey>
  ) {
    return Object.values(this.deployments).some(
      (deployment) => deployment.abiKey === key
    );
  }

  /**
   * Get an ABI
   * @param key String key of the ABI
   * @returns The ABI
   */
  public getAbi<ABIKey extends OriginalABIKey<OriginalConfig, Opts>>(
    key: LiteralUnion<ABIKey>
  ) {
    const abi = this.abis[key];
    if (!abi) {
      throw new Error(
        `No ABI for key ${key} and chain ID ${this.chainId} has been found.`
      );
    }
    return abi;
  }

  /**
   * Get a contract by finding the address and ABI
   * @param key String key of the deployment of the contract
   * @returns The address and ABI of the contract
   */
  public getContract<
    DeploymentKey extends OriginalDeploymentKey<OriginalConfig>
  >(key: LiteralUnion<DeploymentKey>): Contract {
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
  public getAddress<
    DeploymentKey extends OriginalDeploymentKey<OriginalConfig>
  >(key: LiteralUnion<DeploymentKey>) {
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
  private getDeployment<
    DeploymentKey extends OriginalDeploymentKey<OriginalConfig>
  >(key: LiteralUnion<DeploymentKey>) {
    const deployment = this.deployments[key];
    if (!deployment) {
      throw new Error(
        `No deployment for key ${key} and chain ID ${this.chainId} has been found.`
      );
    }
    return deployment;
  }
}
