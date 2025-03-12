import React from "react";
import { sepolia, mainnet } from "@starknet-react/chains";
import {
  StarknetConfig,
  publicProvider,
} from "@starknet-react/core";

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  return (
    <StarknetConfig 
      chains={[mainnet, sepolia]} 
      provider={publicProvider()}
      autoConnect={true}
    >
      {children}
    </StarknetConfig>
  );
}