import React, { useState, useEffect } from "react";
import { Button, Card, Popup } from 'pixel-retroui';
import { connect, disconnect } from "get-starknet";

// Define wallet options
type WalletOption = {
  id: string;
  name: string;
  icon?: string;
  windowKey?: string; // Window object key for direct access
};

const walletOptions: WalletOption[] = [
  {
    id: "argentX",
    name: "Argent X",
    icon: "/argent.png",
    windowKey: "starknet_argentX"
  },
  {
    id: "braavos",
    name: "Braavos",
    icon: "/braavos.jpeg",
    windowKey: "starknet_braavos"
  }
];

type WalletConnectorProps = {
  onConnect: (address: string, provider: string) => void;
  onDisconnect: () => void;
  isConnected: boolean;
  connectedAddress?: string;
  connectedProvider?: string;
};

const WalletConnector: React.FC<WalletConnectorProps> = ({ 
  onConnect, 
  onDisconnect, 
  isConnected, 
  connectedAddress, 
  connectedProvider 
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentWallet, setCurrentWallet] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletOption[]>([]);

  // Detect available wallets
  useEffect(() => {
    const checkWallets = () => {
      const detected = walletOptions.filter(wallet => {
        return wallet.windowKey && (window as any)[wallet.windowKey];
      });
      
      setAvailableWallets(detected.length > 0 ? detected : walletOptions);
    };
    
    checkWallets();
  }, []);

  const handleConnectClick = () => {
    setShowModal(true);
    setError(null);
  };

  const connectDirectWallet = async (wallet: WalletOption) => {
    setIsConnecting(true);
    setCurrentWallet(wallet.id);
    setError(null);
    
    try {
      console.log(`Attempting to connect ${wallet.name}...`);
      
      if (wallet.windowKey && (window as any)[wallet.windowKey]) {
        try {
          const directProvider = (window as any)[wallet.windowKey];
          
          await directProvider.enable({ showModal: true });
          console.log(`${wallet.name} wallet enabled:`, directProvider);
          
          // Get address - the method name might be different depending on wallet provider
          let address;
          try {
            // First try starknet_accounts method
            const accounts = await directProvider.request({ method: 'starknet_accounts' });
            if (accounts && accounts.length > 0) {
              address = accounts[0];
            }
          } catch (methodErr) {
            console.log(`Method starknet_accounts failed, trying to get account from provider directly`);
            
            // Fallback to accessing the selectedAddress property (used by some wallet providers)
            if (directProvider.selectedAddress) {
              address = directProvider.selectedAddress;
            } else if (directProvider.account && directProvider.account.address) {
              address = directProvider.account.address;
            } else {
              console.error(`Could not get address from provider:`, directProvider);
              throw new Error(`Could not get address from ${wallet.name}`);
            }
          }
          
          if (address) {
            console.log(`Connected to ${wallet.name} directly:`, address);
            onConnect(address, wallet.name);
            setShowModal(false);
            setIsConnecting(false);
            return;
          }
        } catch (directErr) {
          console.error(`Direct connection to ${wallet.name} failed:`, directErr);
          
          // Special handling for Braavos wallet - don't use fallback
          if (wallet.id === "braavos") {
            throw new Error(`${wallet.name} connection failed: ${directErr instanceof Error ? directErr.message : String(directErr)}`);
          }
          
          // For other wallets, continue to fallback
        }
      }
      
      // Skip fallback for Braavos
      if (wallet.id === "braavos") {
        throw new Error(`${wallet.name} wallet not detected or connection failed. Please ensure the extension is installed correctly.`);
      }
      
      // Fallback: Use standard connect method only for non-Braavos wallets
      console.log(`Using fallback connection method for ${wallet.name}...`);
      const starknet = await connect();
      
      if (!starknet) {
        throw new Error(`Failed to connect to ${wallet.name}`);
      }
      
      // Enable the wallet
      await starknet.enable();
      
      // Get the wallet address
      const walletAddress = starknet.selectedAddress;
      
      if (!walletAddress) {
        throw new Error("No wallet address available");
      }
      
      console.log(`Connected to wallet:`, walletAddress);
      onConnect(walletAddress, wallet.name);
      setShowModal(false);
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError(`Failed to connect: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsConnecting(false);
      setCurrentWallet(null);
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect();
      onDisconnect();
      setShowModal(false);
    } catch (err) {
      console.error("Wallet disconnection error:", err);
      setError(`Failed to disconnect: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <>
      <Button
        bg="#ffffff"
        textColor="#000000"
        borderColor="#000000"
        shadow="#ffffff"
        onClick={handleConnectClick}
      >
        {isConnected 
          ? `${connectedProvider || 'Wallet'} (${connectedAddress?.slice(0, 6)}...${connectedAddress?.slice(-4)})` 
          : 'Connect Wallet'}
      </Button>
      
      {showModal && (
        <Popup
          title="Wallet Management"
          onClose={() => setShowModal(false)}
          isOpen={showModal}
        >
          <div className="wallet-management">
            {error && (
              <div className="error-message" style={{ color: "red", margin: "10px 0", padding: "10px", backgroundColor: "#ffeeee", borderRadius: "4px" }}>
                {error}
              </div>
            )}
            
            {isConnected ? (
              <div className="connected-wallet">
                <h4>Connected Wallet</h4>
                <Card className="wallet-info-card" style={{ margin: "10px 0", padding: "15px" }}>
                  <div><strong>Provider:</strong> {connectedProvider || 'Unknown'}</div>
                  <div><strong>Address:</strong> {connectedAddress}</div>
                  <div style={{ marginTop: "15px" }}>
                    <Button
                      onClick={disconnectWallet}
                      bg="#ff5555"
                      textColor="#ffffff"
                      borderColor="#000000"
                      shadow="#ffffff"
                    >
                      Disconnect Wallet
                    </Button>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="connect-wallet-section">
                <h4>Connect a Wallet</h4>
                <p>Select a wallet provider to connect:</p>
                <div className="wallet-options" style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "15px 0" }}>
                  {availableWallets.map(wallet => (
                    <Button
                      key={wallet.id}
                      onClick={() => connectDirectWallet(wallet)}
                      bg="#ffffff"
                      textColor="#000000"
                      borderColor="#000000"
                      shadow="#ffffff"
                      className="wallet-option-button"
                      disabled={isConnecting && currentWallet === wallet.id}
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}
                    >
                      {wallet.icon && (
                        <img 
                          src={wallet.icon} 
                          alt={wallet.name} 
                          style={{ width: "20px", height: "20px" }} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      Connect {wallet.name} {isConnecting && currentWallet === wallet.id && "..."}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <Button
                onClick={() => setShowModal(false)}
                bg="#444444"
                textColor="#ffffff"
                borderColor="#000000"
                shadow="#ffffff"
                disabled={isConnecting}
              >
                Close
              </Button>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
};

export default WalletConnector;