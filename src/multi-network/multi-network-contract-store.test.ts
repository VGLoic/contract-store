import { ContractStore } from "./multi-network-contract-store";
import ERC20 from "../default-abis/erc20.json";
import ERC721 from "../default-abis/erc721.json";
import ERC1155 from "../default-abis/erc1155.json";

describe("Dynamic Multi network contract store", () => {
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

  const chainIds: [1, 2] = [1, 2];

  describe("initialization", () => {
    test("it should initialize according to the given configuration", () => {
      const store = new ContractStore({
        globalAbis: {},
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
    });
  });
});
