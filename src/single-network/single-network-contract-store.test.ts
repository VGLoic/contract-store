import { SingleNetworkContractStore } from "./single-network-contract-store";
import ERC20 from "../default-abis/erc20.json";
import ERC721 from "../default-abis/erc721.json";
import ERC1155 from "../default-abis/erc1155.json";

describe("Static Single Network Contract Store", () => {
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
  const address = "0x65056df4226b218A79C9473189FC5Ec7D41D8198";

  test("it should successfully initialize according to the given configuration", () => {
    const store = new SingleNetworkContractStore(1, {
      abis: {
        FOO: testAbi,
      },
      deployments: {
        BAR: {
          abiKey: "ERC20",
          address,
        },
      },
    });
    expect(store.getAbi("ERC20")).toEqual(ERC20);
    expect(store.getAbi("ERC721")).toEqual(ERC721);
    expect(store.getAbi("ERC1155")).toEqual(ERC1155);
    expect(store.getAbi("FOO")).toEqual(testAbi);
    expect(store.getContract("BAR")).toEqual({
      address,
      abi: ERC20,
    });
    expect(store.getAddress("BAR")).toEqual(address);
    expect(store.getAddresses()).toEqual([address]);
    expect(() => store.getContract("BAR2" as "BAR")).toThrow();
  });

  test("it should fail to if a deployment is given with an unknown ABI key", () => {
    expect(
      () =>
        new SingleNetworkContractStore(1, {
          abis: {
            FOO: testAbi,
          },
          deployments: {
            BAR: {
              abiKey: "UNKNWON" as "FOO",
              address,
            },
          },
        })
    ).toThrow();
  });

  test("it should contain the default abis if not explictly written in the options", () => {
    const store = new SingleNetworkContractStore(1, {
      abis: {},
      deployments: {},
    });

    expect(store.getAbi("ERC20")).toEqual(ERC20);
    expect(store.getAbi("ERC721")).toEqual(ERC721);
    expect(store.getAbi("ERC1155")).toEqual(ERC1155);
  });

  test("it should not contain the default ABIs if specified in the options", () => {
    const store = new SingleNetworkContractStore(
      1,
      { abis: {}, deployments: {} },
      { withoutDefaultABIs: true }
    );
    expect(() => store.getAbi("ERC20" as never)).toThrow();
    expect(() => store.getAbi("ERC721" as never)).toThrow();
    expect(() => store.getAbi("ERC1155" as never)).toThrow();
  });
});
