import { ContractStore } from "..";
import ERC20 from "../default-abis/erc20.json";
import ERC721 from "../default-abis/erc721.json";
import ERC1155 from "../default-abis/erc1155.json";

describe("Contract Store", () => {
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

  test("it should contain the default abis if not explictly written in the options", () => {
    const store = new ContractStore(1);

    expect(store.getAbi("ERC20")).toEqual(ERC20);
    expect(store.getAbi("ERC721")).toEqual(ERC721);
    expect(store.getAbi("ERC1155")).toEqual(ERC1155);
  });

  test("it should not contain the default ABIs if specified in the options", () => {
    const store = new ContractStore(1, { withoutDefaultABIs: true });
    expect(() => store.getAbi("ERC20")).toThrow();
    expect(() => store.getAbi("ERC721")).toThrow();
    expect(() => store.getAbi("ERC1155")).toThrow();
  });

  describe("ABI management", () => {
    test("it should allow to register, update and delete an ABI", () => {
      const store = new ContractStore(1);

      store.registerAbi("FOO", testAbi);
      expect(store.getAbi("FOO")).toEqual(testAbi);

      store.updateAbi("FOO", otherTestAbi);

      expect(store.getAbi("FOO")).toEqual(otherTestAbi);

      store.deleteAbi("FOO");

      expect(() => store.getAbi("FOO")).toThrow();
    });

    test("it should not allow to register an ABI under an already used key", () => {
      const store = new ContractStore(1);
      store.registerAbi("FOO", testAbi);
      expect(store.getAbi("FOO")).toEqual(testAbi);

      expect(() => store.registerAbi("FOO", otherTestAbi)).toThrow();
    });

    test("it should not allow to update an ABI if it is not registered", () => {
      const store = new ContractStore(1);
      expect(() => store.updateAbi("FOO", otherTestAbi)).toThrow();
    });

    test("it should not allow to delete an ABI if it is used in a deployment", () => {
      const store = new ContractStore(1);
      store.registerContract("FOO", {
        abi: testAbi,
        address,
      });
      expect(() => store.deleteAbi("FOO")).toThrow();
    });
  });

  describe("deployment management", () => {
    test("it should allow to register, update, and delete a deployment using an existing ABI", () => {
      const store = new ContractStore(1);

      store.registerDeployment("FOO", {
        address,
        abiKey: "ERC20",
      });
      expect(store.getAddress("FOO")).toEqual(address);
      expect(store.getContract("FOO")).toEqual({
        address,
        abi: ERC20,
      });

      store.updateDeployment("FOO", "ERC721");
      expect(store.getAddress("FOO")).toEqual(address);
      expect(store.getContract("FOO")).toEqual({
        address,
        abi: ERC721,
      });

      store.deleteDeployment("FOO");
      expect(() => store.getAddress("FOO")).toThrow();
      expect(() => store.getContract("FOO")).toThrow();
    });

    test("it should allow to register an ABI and a deployment at once", () => {
      const store = new ContractStore(1);

      store.registerContract("FOO", {
        address,
        abi: testAbi,
      });
      expect(store.getAddress("FOO")).toEqual(address);
      expect(store.getAbi("FOO")).toEqual(testAbi);
      expect(store.getContract("FOO")).toEqual({
        address,
        abi: testAbi,
      });
    });

    test("it should not allow to register a deployment with an already used key", () => {
      const store = new ContractStore(1);

      store.registerDeployment("FOO", {
        address,
        abiKey: "ERC20",
      });
      expect(() =>
        store.registerDeployment("FOO", {
          address,
          abiKey: "ERC721",
        })
      ).toThrow();
    });

    test("it should not allow to register a deployment with an unknown ABI key", () => {
      const store = new ContractStore(1);

      expect(() =>
        store.registerDeployment("FOO", {
          address,
          abiKey: "unknown",
        })
      ).toThrow();
    });

    test("it should not allow to update a deployment with an unknown ABI key", () => {
      const store = new ContractStore(1);

      store.registerDeployment("FOO", {
        address,
        abiKey: "ERC20",
      });

      expect(() => store.updateDeployment("FOO", "unknown")).toThrow();
    });

    test("it should not allow to update an unknown deployment", () => {
      const store = new ContractStore(1);

      expect(() => store.updateDeployment("FOO", "ERC20")).toThrow();
    });

    test("it should allow to retrieve the deployments addresses", () => {
      const store = new ContractStore(1);

      store.registerDeployment("FOO", {
        address,
        abiKey: "ERC20",
      });

      expect(store.getAddresses()).toEqual([address]);
    });
  });
});
