import { DynamicContractStore } from "./dynamic-multi-network-contract-store";
import ERC20 from "../default-abis/erc20.json";
import ERC721 from "../default-abis/erc721.json";
import ERC1155 from "../default-abis/erc1155.json";

describe("Multi network contract store", () => {
  const testAbi = [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "spender",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "value",
          type: "uint256",
        },
      ],
      name: "Approval",
      type: "event",
    },
  ];

  const otherTestAbi = [
    ...testAbi,
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "owner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "operator",
          type: "address",
        },
        {
          indexed: false,
          internalType: "bool",
          name: "approved",
          type: "bool",
        },
      ],
      name: "ApprovalForAll",
      type: "event",
    },
  ];
  const address = "0x65056df4226b218A79C9473189FC5Ec7D41D8198";

  const chainIds = [1, 2];

  describe("initialization", () => {
    test("it should initialize according to the given configuration", () => {
      const store = new DynamicContractStore({
        globalAbis: {
          GLOB: testAbi,
        },
        networks: {
          1: {
            abis: {
              FOO: testAbi,
            },
            deployments: {
              BAR: {
                abiKey: "ERC20",
                address,
              },
            },
          },
          2: {
            abis: {
              FOO2: otherTestAbi,
            },
            deployments: {
              BAR2: {
                abiKey: "FOO2",
                address,
              },
            },
          },
        },
      });
      for (const chainId of chainIds) {
        expect(store.getAbi(chainId, "ERC20")).toEqual(ERC20);
        expect(store.getAbi(chainId, "ERC721")).toEqual(ERC721);
        expect(store.getAbi(chainId, "ERC1155")).toEqual(ERC1155);
      }

      expect(store.getGlobalAbi("ERC20")).toEqual(ERC20);
      expect(store.getGlobalAbi("ERC721")).toEqual(ERC721);
      expect(store.getGlobalAbi("ERC1155")).toEqual(ERC1155);
      expect(store.getGlobalAbi("GLOB")).toEqual(testAbi);

      expect(store.getAbi(1, "FOO")).toEqual(testAbi);
      expect(store.getContract(1, "BAR")).toEqual({
        address,
        abi: ERC20,
      });
      expect(store.getAbi(2, "FOO2")).toEqual(otherTestAbi);
      expect(store.getContract(2, "BAR2")).toEqual({
        address,
        abi: otherTestAbi,
      });
      expect(store.toObject()).toEqual({
        globalAbis: {
          GLOB: testAbi,
          ERC20,
          ERC721,
          ERC1155,
        },
        networks: {
          1: {
            abis: {
              FOO: testAbi,
              GLOB: testAbi,
              ERC20,
              ERC721,
              ERC1155,
            },
            deployments: {
              BAR: {
                abiKey: "ERC20",
                address,
              },
            },
          },
          2: {
            abis: {
              FOO2: otherTestAbi,
              GLOB: testAbi,
              ERC20,
              ERC721,
              ERC1155,
            },
            deployments: {
              BAR2: {
                abiKey: "FOO2",
                address,
              },
            },
          },
        },
      });
    });
  });

  describe("network management", () => {
    test("it should contain the default abis as global ABI if not explictly written in the options", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });

      for (const chainId of chainIds) {
        expect(store.getAbi(chainId, "ERC20")).toEqual(ERC20);
        expect(store.getAbi(chainId, "ERC721")).toEqual(ERC721);
        expect(store.getAbi(chainId, "ERC1155")).toEqual(ERC1155);
      }

      expect(store.getGlobalAbi("ERC20")).toEqual(ERC20);
      expect(store.getGlobalAbi("ERC721")).toEqual(ERC721);
      expect(store.getGlobalAbi("ERC1155")).toEqual(ERC1155);
    });

    test("it should not contain the default ABIs if specified in the options", () => {
      const store = new DynamicContractStore(
        { networks: { 1: {}, 2: {} } },
        {
          withoutDefaultABIs: true,
        }
      );
      for (const chainId of chainIds) {
        expect(() => store.getAbi(chainId, "ERC20")).toThrow();
        expect(() => store.getAbi(chainId, "ERC721")).toThrow();
        expect(() => store.getAbi(chainId, "ERC1155")).toThrow();
      }
      expect(() => store.getGlobalAbi("ERC20")).toThrow();
      expect(() => store.getGlobalAbi("ERC721")).toThrow();
      expect(() => store.getGlobalAbi("ERC1155")).toThrow();
    });

    test("`gerChainIds` should return the list of chain IDs", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      expect(store.getChainIds()).toEqual(chainIds);
    });

    test("`addNetwork` should add the chain ID with the global ABIs", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });

      store.addNetwork(3);
      expect(store.getAbi(3, "ERC20")).toEqual(ERC20);
      expect(store.getAbi(3, "ERC721")).toEqual(ERC721);
      expect(store.getAbi(3, "ERC1155")).toEqual(ERC1155);
    });

    test("`addNetwork` should throw if the network is already configured", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      expect(() => store.addNetwork(2)).toThrow();
    });

    test("`removeNetwork` should delete the store associated to the chain ID", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      store.removeNetwork(1);
      expect(() => store.getAbi(1, "ERC20")).toThrow();
      expect(store.getChainIds()).toEqual([2]);
    });

    test("`removeNetwork` should throw if the network is not registered", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      expect(() => store.removeNetwork(24324234)).toThrow();
    });
  });

  describe("ABI management", () => {
    test("`registerGlobalAbi` should register the ABI on every networks", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      store.registerGlobalAbi("FOO", testAbi);

      expect(store.getGlobalAbi("FOO")).toEqual(testAbi);
      chainIds.forEach((chainId) => {
        expect(store.getAbi(chainId, "FOO")).toEqual(testAbi);
      });
    });

    test("`registerGlobalAbi` should throw if a global ABI with the same key exist", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      store.registerGlobalAbi("FOO", testAbi);

      expect(() => store.registerGlobalAbi("FOO", otherTestAbi)).toThrow();
    });

    test("`registerGlobalAbi` should throw if an ABI with the same key exist on a network", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      store.registerAbi(chainIds[0], "FOO", testAbi);

      expect(() => store.registerGlobalAbi("FOO", otherTestAbi)).toThrow();
    });

    test("`updateGlobalABI` should update the ABI on every networks", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      store.registerGlobalAbi("FOO", testAbi);

      store.updateGlobalAbi("FOO", otherTestAbi);

      expect(store.getGlobalAbi("FOO")).toEqual(otherTestAbi);
      chainIds.forEach((chainId) => {
        expect(store.getAbi(chainId, "FOO")).toEqual(otherTestAbi);
      });
    });

    test("`updateGlobalABI` should throw if the key is not a global ABI", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      expect(() => store.updateGlobalAbi("FOO", otherTestAbi)).toThrow();
    });

    test("`deleteGlobalAbi` should delete the ABI on every network", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      store.registerGlobalAbi("FOO", testAbi);
      store.deleteGlobalAbi("FOO");

      expect(() => store.getGlobalAbi("FOO")).toThrow();
      chainIds.forEach((chainId) => {
        expect(() => store.getAbi(chainId, "FOO")).toThrow();
      });
    });

    test("`deleteGlobalABI` should throw if the key is not one of a global ABI", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      expect(() => store.deleteGlobalAbi("FOO")).toThrow();
    });

    test("`deleteGlobalABI` should throw if the ABI is used in a deployment", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      store.registerGlobalAbi("FOO", testAbi);
      store.registerDeployment(chainIds[0], "MY_FOO", {
        abiKey: "FOO",
        address,
      });

      expect(() => store.deleteGlobalAbi("FOO")).toThrow();
    });

    test("`registerAbi` should register the ABI on the proper network", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      store.registerAbi(chainIds[0], "FOO", testAbi);
      expect(store.getAbi(chainIds[0], "FOO")).toEqual(testAbi);
    });

    test("`registerAbi` should throw if the key already exists as global", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      store.registerGlobalAbi("FOO", testAbi);

      expect(() =>
        store.registerAbi(chainIds[0], "FOO", otherTestAbi)
      ).toThrow();
    });

    test("`updateAbi` should update the ABI on the proper network", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      store.registerAbi(chainIds[0], "FOO", testAbi);
      store.updateAbi(chainIds[0], "FOO", otherTestAbi);
      expect(store.getAbi(chainIds[0], "FOO")).toEqual(otherTestAbi);
    });

    test("`updateAbi` should throw if the key is associated to a global ABI", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      store.registerGlobalAbi("FOO", testAbi);

      expect(() => store.updateAbi(chainIds[0], "FOO", otherTestAbi)).toThrow();
    });

    test("`deleteAbi` should delete the ABI on the proper network", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      store.registerAbi(chainIds[0], "FOO", testAbi);
      store.deleteAbi(chainIds[0], "FOO");

      expect(() => store.getAbi(chainIds[0], "FOO")).toThrow();
    });

    test("`deleteAbi` should throw if the key is associated to a global ABI", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });
      store.registerGlobalAbi("FOO", testAbi);

      expect(() => store.deleteAbi(chainIds[0], "FOO")).toThrow();
    });
  });

  describe("Deployment management", () => {
    test("`registerDeployment` should register a deployment on the proper network", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });

      store.registerDeployment(chainIds[0], "BAR", {
        abiKey: "ERC20",
        address,
      });

      expect(store.getAddress(chainIds[0], "BAR")).toEqual(address);
      expect(store.getContract(chainIds[0], "BAR")).toEqual({
        address,
        abi: store.getGlobalAbi("ERC20"),
      });
    });

    test("`registerContract` should register a deployment and an ABI on the proper network", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });

      store.registerContract(chainIds[0], "BAR", {
        abi: testAbi,
        address,
      });

      expect(store.getAddress(chainIds[0], "BAR")).toEqual(address);
      expect(store.getAbi(chainIds[0], "BAR")).toEqual(testAbi);
      expect(store.getContract(chainIds[0], "BAR")).toEqual({
        address,
        abi: testAbi,
      });
    });

    test("`updateDeployment` should update the deployment on the proper network", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });

      store.registerDeployment(chainIds[0], "BAR", {
        abiKey: "ERC20",
        address,
      });

      store.updateDeployment(chainIds[0], "BAR", "ERC721");

      expect(store.getAddress(chainIds[0], "BAR")).toEqual(address);
      expect(store.getContract(chainIds[0], "BAR")).toEqual({
        address,
        abi: store.getGlobalAbi("ERC721"),
      });
    });

    test("`deleteDeployment` should delete the deployment on the proper network", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });

      store.registerDeployment(chainIds[0], "BAR", {
        abiKey: "ERC20",
        address,
      });

      store.deleteDeployment(chainIds[0], "BAR");

      expect(() => store.getAddress(chainIds[0], "BAR")).toThrow();
      expect(() => store.getContract(chainIds[0], "BAR")).toThrow();
    });

    test("`getAddresses` should get the deployments addresses on the proper network", () => {
      const store = new DynamicContractStore({
        networks: { 1: {}, 2: {} },
      });

      store.registerDeployment(chainIds[0], "FOO", {
        abiKey: "ERC20",
        address,
      });

      const otherAddress = "0xf1d1F31983ffd497519C17f081CFf3B35B2A04b2";
      store.registerDeployment(chainIds[0], "BAR", {
        abiKey: "ERC20",
        address: otherAddress,
      });
      expect(store.getAddresses(chainIds[0])).toEqual([address, otherAddress]);
    });
  });
});
