import { MultiNetworkContractStore } from "../multi-network-contract-store";
import ERC20 from "../default-abis/erc20.json";
import ERC721 from "../default-abis/erc721.json";
import ERC1155 from "../default-abis/erc1155.json";

describe("Multi network contract store", () => {
  // const testAbi = [
  //     {
  //       anonymous: false,
  //       inputs: [
  //         {
  //           indexed: true,
  //           internalType: "address",
  //           name: "owner",
  //           type: "address",
  //         },
  //         {
  //           indexed: true,
  //           internalType: "address",
  //           name: "spender",
  //           type: "address",
  //         },
  //         {
  //           indexed: false,
  //           internalType: "uint256",
  //           name: "value",
  //           type: "uint256",
  //         },
  //       ],
  //       name: "Approval",
  //       type: "event",
  //     },
  //   ];

  // const otherTestAbi = [
  //   ...testAbi,
  //   {
  //     anonymous: false,
  //     inputs: [
  //       {
  //         indexed: true,
  //         internalType: "address",
  //         name: "owner",
  //         type: "address",
  //       },
  //       {
  //         indexed: true,
  //         internalType: "address",
  //         name: "operator",
  //         type: "address",
  //       },
  //       {
  //         indexed: false,
  //         internalType: "bool",
  //         name: "approved",
  //         type: "bool",
  //       },
  //     ],
  //     name: "ApprovalForAll",
  //     type: "event",
  //   },
  // ];
  // const address = "0x65056df4226b218A79C9473189FC5Ec7D41D8198";

  const chainIds = [1, 2];

  test("it should contain the default abis as global ABI if not explictly written in the options", () => {
    const store = new MultiNetworkContractStore(chainIds);

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
    const store = new MultiNetworkContractStore(chainIds, {
      withoutDefaultABIs: true,
    });
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
    const store = new MultiNetworkContractStore(chainIds);
    expect(store.getChainIds()).toEqual(chainIds);
  });

  test("`addNetwork` should add the chain ID with the global ABIs", () => {
    const store = new MultiNetworkContractStore(chainIds);

    store.addNetwork(3);
    expect(store.getAbi(3, "ERC20")).toEqual(ERC20);
    expect(store.getAbi(3, "ERC721")).toEqual(ERC721);
    expect(store.getAbi(3, "ERC1155")).toEqual(ERC1155);
  });

  test("`addNetwork` should throw if the network is already configured", () => {
    const store = new MultiNetworkContractStore(chainIds);
    expect(() => store.addNetwork(2)).toThrow();
  });

  test("`removeNetwork` should delete the store associated to the chain ID", () => {
    const store = new MultiNetworkContractStore(chainIds);
    store.removeNetwork(1);
    expect(() => store.getAbi(1, "ERC20")).toThrow();
    expect(store.getChainIds()).toEqual([2]);
  });
});
