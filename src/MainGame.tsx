import React, { useEffect, useState } from 'react';
import { Button, Card, Popup } from 'pixel-retroui';
import WalletConnector from './WalletConnector';
import { depositWithMessage } from "./Bridge";
import './styles.css';
import { useAccount } from "@starknet-react/core";
import { Account } from "starknet";

  // Import the bridge function


const MainGame: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalPlayers: 0,
    deployedBots: 0,
    botsAlive: 0,
    diamondsMined: 0,
    botsDead: 0,
    totalTilesMined: 0,
  });
  
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentLayer, setCurrentLayer] = useState(1);
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const [tileStates, setTileStates] = useState<string[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  
  // Wallet state
  const [walletAddress, setWalletAddress] = useState<any | null>(null);
  const [walletProvider, setWalletProvider] = useState<string | null>(null);
  const [walletAccount, setWalletAccount] = useState<Account | null>(null);
  const { account, address } = useAccount(); // Get the connected Starknet wallet
  const [showErrorPopup, setShowErrorPopup] = useState(false); // State to show error popup

  
  useEffect(() => {
    console.log("Account:", account);
    console.log("Wallet Address:", address);
  }, [account, address]);

  useEffect(() => {
    const transactionWS = new WebSocket(import.meta.env.VITE_WS_TRANSACTION_URL);
    const statsWS = new WebSocket(import.meta.env.VITE_WS_STATS_URL);

    transactionWS.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setTransactions((prev) => {
        let updatedTransactions = [...data.data, ...prev];
        return updatedTransactions.slice(0, 30);
      });
    };

    statsWS.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStats({
        totalPlayers: data.data.totalPlayers,
        deployedBots: data.data.totalBots,
        botsAlive: data.data.botsAlive,
        botsDead: data.data.botsDead,
        diamondsMined: data.data.diamondsMined,
        totalTilesMined: data.data.totalTilesMined ?? 0,
      });
      setLeaderboard(data.data.leaderboard);
    };

    return () => {
      transactionWS.close();
      statsWS.close();
    };
  }, []);

  useEffect(() => {
    if (currentLayer === 4) {
      const states = Array(20)
        .fill(null)
        .map(() => {
          const rand = Math.random();
          if (rand < 0.1) return 'diamond';
          if (rand < 0.3) return 'bomb';
          return 'empty';
        });
      setTileStates(states);
    }
  }, [currentLayer]);

  const handleTileClick = (index: number) => {
    if (currentLayer < 4) {
      setTransitioning(true);
      setTimeout(() => {
        setSelectedTiles((prev) => [...prev, index]);
        setCurrentLayer((prev) => prev + 1);
        setTransitioning(false);
      }, 500);
    }
  };

  const handleBack = () => {
    if (currentLayer > 1) {
      setTransitioning(true);
      setTimeout(() => {
        setSelectedTiles((prev) => prev.slice(0, -1));
        setCurrentLayer((prev) => prev - 1);
        setTransitioning(false);
      }, 500);
    }
  };

  const calculateTileRange = () => {
    if (hoveredTile === null) return null;
  
    const baseRange = [200000, 2000, 20, 1][currentLayer - 1];
  
    let startIndex = 0;
    if (selectedTiles.length > 0) {
      selectedTiles.forEach((tile, i) => {
        const multiplier = [200000, 2000, 20, 1][i];
        startIndex += tile * multiplier;
      });
    }
  
    const rangeStart = startIndex + hoveredTile * baseRange + 1;
    const rangeEnd = rangeStart + baseRange - 1;
  
    return `${rangeStart}-${rangeEnd}`;
  };

  // Handle wallet connection
  const handleWalletConnect = (newAddress: string, provider: string) => {
    console.log("Wallet connected:", newAddress, "Provider:", provider);
  
    setWalletAddress(newAddress);
    setWalletProvider(provider)
    
    // Try getting the account directly from window.starknet if useAccount() isn't updating
    setWalletAccount(window.starknet?.account || account);
  
    console.log("WalletAccount State Updated:", window.starknet?.account);
  };
  
  // Function to handle wallet disconnection
  const handleWalletDisconnect = () => {
    console.log("Wallet disconnected");
    setWalletAddress(null);
    setWalletAccount(null);
  };
  
  
  // Get the appropriate GIF for each stat type
  const getGifForStat = (statKey: string): string => {
    switch (statKey) {
      case 'totalPlayers':
        return '/mario.gif';
      case 'deployedBots':
        return '/hammer.gif';
      case 'botsAlive':
        return '/heart.gif';
      case 'botsDead':
        return '/skull.gif';
      case 'diamondsMined':
        return '/diamond.gif';
      case 'totalTilesMined':
        return '/mining.gif';
      default:
        return '';
    }
  };
  
  // Render stat card with GIF on the left side only
  const renderStatCard = (label: string, value: number) => {
    const formattedLabel = label.replace(/([A-Z])/g, ' $1').trim();
    const gifSrc = getGifForStat(label);
    
    return (
      <Card key={label} className="stats-card">
        <div className="stats-container">
          <div className="gif-container">
            <img src={gifSrc} alt={formattedLabel} className="stat-gif" />
          </div>
          <div className="stats-content">
            <span className="stats-label">{formattedLabel}</span>
            <div className="stats-value">{value}</div>
          </div>
        </div>
      </Card>
    );
  };

  const effectiveSize = currentLayer === 4 ? 4 : 10;
  const tiles = Array(currentLayer === 4 ? 20 : effectiveSize * effectiveSize).fill(null);
  const tileSizeWidth = currentLayer === 4 ? 110 : 43;
  const tileSizeHeight = currentLayer === 4 ? 95 : 43;
  const getTileBackgroundImage = () => {
    return `/tile_${currentLayer}.png`;
  };
  
  const eventColors: { [key: string]: string } = {
    BombFound: '#FF4C4C',
    TileAlreadyMined: '#E6B800',
    DiamondFound: '#4CAF50',
    TileMined: '#2196F3',
  };

  

  return (
    <div className="app-container">
      <div className="header">
        <h1>Gridy</h1>
        <div>

        <Button 
          onClick={async () => {
            if (!walletAccount || !walletAddress) {
              setShowErrorPopup(true); // Show popup if wallet is not connected
              return;
            }

            try {
              const txHash = await depositWithMessage(walletAccount, walletAddress);
              alert(`Bot deployed! Transaction Hash: ${txHash}`);
            } catch (err) {
              alert("Bot deployment failed! Check console for details.");
              console.error(err);
            }
          }}
          bg="#4CAF50"
          textColor="#ffffff"
          borderColor="#000000"
          shadow="#ffffff"
        >
          Deploy Bot
        </Button>

        {showErrorPopup && (
          <Popup
            title="Wallet Not Connected"
            onClose={() => setShowErrorPopup(false)}
            isOpen={showErrorPopup}
          >
            <p style={{ color: "red" }}>
              ⚠️ Please connect your wallet before deploying a bot.
            </p>
          </Popup>
        )}
          <Button 
            bg="#ffffff"
            textColor="#000000"
            borderColor="#000000"
            shadow="#ffffff"
          >
            RULES
          </Button>
          
          <WalletConnector 
            onConnect={handleWalletConnect}
            onDisconnect={handleWalletDisconnect}
            isConnected={!!walletAddress}
            connectedAddress={walletAddress || undefined}
            connectedProvider={walletProvider || undefined}
          />
        </div>

      </div>

      <div className="stats-container">
        {Object.entries(stats).map(([label, value]) => renderStatCard(label, value as number))}
      </div>

      <div className="main-content">
        <Card className="sidebar">
          <h3 className="sidebar-title">Transactions</h3>
          <ul className="transaction-list">
            {transactions.map((tx, index) => {
              const botAddress = tx.data[0] ? `${tx.data[0].slice(0, 6)}...${tx.data[0].slice(-4)}` : "Unknown";
              let message = `${tx.event_name} - ${botAddress}`;

              if (tx.event_name === "TileMined") {
                message += " - 10 Points";
              } else if (tx.event_name === "DiamondFound") {
                message += " - 5000 Points";
              }

              return (
                <li key={index} style={{ color: eventColors[tx.event_name] || "#FFFFFF" }}>
                  {message}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className={`grid-section ${transitioning ? 'fade-out' : 'fade-in'}`}>
          {currentLayer > 1 && (
            <Button onClick={handleBack}>← Back to Layer {currentLayer - 1}</Button>
          )}

          <div className="grid-container" style={{ gridTemplateColumns: `repeat(${effectiveSize}, 0.5fr)` }}>
            {tiles.map((_, index) => (
              <div
                key={index}
                className="tile"
                style={{
                  backgroundImage: `url('${getTileBackgroundImage()}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  height: tileSizeHeight,
                  width: tileSizeWidth,
                  border: '3px dashed black',
                  position: 'relative',
                }}
                onMouseEnter={() => setHoveredTile(index)}
                onMouseLeave={() => setHoveredTile(null)}
                onClick={() => handleTileClick(index)}
              >
                {currentLayer === 4 && tileStates[index] === 'diamond' && (
                  <img src="/diamond.gif" alt="diamond" className="tile-overlay-gif" />
                )}
                {currentLayer === 4 && tileStates[index] === 'bomb' && (
                  <img src="/nuke.gif" alt="nuke" className="tile-overlay-gif" />
                )}
              </div>
            ))}
          </div>

          <div className="hover-info">
            {hoveredTile !== null && (
              <>
                Layer {currentLayer} . {tiles.length} tiles visible . Tile {hoveredTile + 1} represents tiles from ({calculateTileRange()})
              </>
            )}
          </div>
        </div>

        <Card className="sidebar">
          <h3 className="sidebar-title">Leaderboard</h3>
          <ul className="leaderboard-list">
            {leaderboard.map((player, index) => (
              <li key={index}>
                {index + 1}. {player.total_score} points - {player._id.slice(0, 14)}...{player._id.slice(-14)}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default MainGame;