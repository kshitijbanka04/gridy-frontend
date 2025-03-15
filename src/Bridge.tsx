import { Contract, Account } from "starknet";

// Replace with actual contract addresses
const BRIDGE_ADDRESS = "0x680c4cd19f9bfece1df9e870fab1cb6d92bd7b68f2f3084d17bf44ac6cea0ad";
const GRIDY_CONTRACT_ADDRESS = "0x268aef2695bb30971776719d3d8b1ba68e0ca0d40ea3008263c0422d7273e80";
const l3Registry = "0x9cdefae7d251d2c5577c4ed6833c7670b1260b13f4c9f78855b77761a175b8";
const gridTokenAddress = "0x37c6b379f0ad38853f6a484ac4c024cbb6ffb4de8197f408e8da8ce4415dfc0";


export async function depositWithMessage(account: Account, playerAddress: string, tileLocation: string) {
  if (!account) {
    throw new Error("No wallet account connected.");
  }

  console.log("Player address:", playerAddress);
  console.log("Tile location:", tileLocation);

  // Convert tileLocation from string to bigint
  const tileLocationBigInt = BigInt(tileLocation);
  console.log("Tile location tileLocationBigInt:", tileLocationBigInt);


  try {
    const bridge_address = BRIDGE_ADDRESS;
    const cls = await account.getClassAt(bridge_address);
    console.log(cls);
    const bridge_contract = new Contract(cls.abi, bridge_address, account);
    const gridCls = await account.getClassAt(gridTokenAddress);
    console.log(gridCls);
    const gridToken = new Contract(gridCls.abi, gridTokenAddress, account);
    
    // Construct the message
    const message = [
      GRIDY_CONTRACT_ADDRESS, 
      "0x01b555c9bb592b0bf0cfe20e8cc50b24434d9e22946d755accc20393cfa40650", // deploy_bot function selector
      playerAddress
    ];

    const approve_call = gridToken.populate('approve', {
      spender: BRIDGE_ADDRESS,
      amount: 12n * 10n ** 18n
    });

    console.log(approve_call)


    const call = bridge_contract.populate('deposit_with_message', {
      token: gridTokenAddress,
      amount: 11n * 10n ** 18n,
      appchain_recipient: l3Registry,
      message: [
        playerAddress, // Player in game
        tileLocationBigInt // Dynamic location to mine based on the tile clicked
      ]
    });

    console.log(call)

    let result = await account.execute([approve_call, call]);

    
    console.log("Transaction sent:", result.transaction_hash);
    return result.transaction_hash;
  } catch (error) {
    console.error("Error deploying bot:", error);
    throw error;
  }
}