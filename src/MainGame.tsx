import React, { useEffect, useState, useRef } from 'react';
import { Button, Card, Popup } from 'pixel-retroui';
import WalletConnector from './WalletConnector';
import { depositWithMessage } from "./Bridge";
import './styles.css';
import { useAccount } from "@starknet-react/core";
import { Account } from "starknet";

const MainGame: React.FC = () => {
  // State management
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
  const [tileStates, setTileStates] = useState<Record<string, string>>({});
  const [transitioning, setTransitioning] = useState(false);
  
  // WebSocket references
  const transactionWSRef = useRef<WebSocket | null>(null);
  const statsWSRef = useRef<WebSocket | null>(null);
  const tilesWSRef = useRef<WebSocket | null>(null);
  
  // Wallet state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletProvider, setWalletProvider] = useState<string | null>(null);
  const [walletAccount, setWalletAccount] = useState<Account | null>(null);
  const { account, address } = useAccount(); // Get the connected Starknet wallet
  const [showErrorPopup, setShowErrorPopup] = useState(false); // State to show error popup

  // Set up WebSocket connections
  useEffect(() => {
    // Transaction WebSocket
    transactionWSRef.current = new WebSocket(import.meta.env.VITE_WS_TRANSACTION_URL);
    transactionWSRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'transactions') {
        setTransactions((prev) => {
          let updatedTransactions = [...data.data, ...prev];
          return updatedTransactions.slice(0, 30); // Keep only most recent 30
        });
      }
    };

    // Stats WebSocket
    statsWSRef.current = new WebSocket(import.meta.env.VITE_WS_STATS_URL);
    statsWSRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'stats') {
        setStats({
          totalPlayers: data.data.totalPlayers,
          deployedBots: data.data.totalBots,
          botsAlive: data.data.botsAlive,
          botsDead: data.data.botsDead,
          diamondsMined: data.data.diamondsMined,
          totalTilesMined: data.data.totalTilesMined ?? 0,
        });
        setLeaderboard(data.data.leaderboard);
      }
    };

    // Tiles WebSocket - connect but handle messages in a separate useEffect
    tilesWSRef.current = new WebSocket(import.meta.env.VITE_WS_TILES_URL || 'ws://localhost:3003');

    // Clean up function
    return () => {
      transactionWSRef.current?.close();
      statsWSRef.current?.close();
      tilesWSRef.current?.close();
    };
  }, []);

  // Handle tile data WebSocket messaging
  useEffect(() => {
    if (!tilesWSRef.current) return;
  
    // Function to convert hex to decimal
    const hexToDecimal = (hex: string): string => {
      if (hex.startsWith('0x')) {
        return parseInt(hex, 16).toString();
      }
      return hex;
    };
  
    // Handle tile data messages
    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'tileData') {
        // Process the tile data
        const newTileStates: Record<string, string> = { ...tileStates };
        
        data.data.forEach((tile: any) => {
          // Convert hex location to decimal for consistent lookups
          const decimalLocation = hexToDecimal(tile.location);
          console.log(`Tile ${tile.location} (decimal: ${decimalLocation}) is ${tile.mine_type.toLowerCase()}`);
          
          // Store tile state with decimal location as the key
          newTileStates[decimalLocation] = tile.mine_type.toLowerCase(); // 'Diamond', 'Bomb', or 'Empty'
        });
  
        console.log("Updated tile states:", newTileStates);
        setTileStates(newTileStates);
      }
    };
  
    // Set up the message handler
    tilesWSRef.current.onmessage = handleMessage;
  
    // Clean up function
    return () => {
      if (tilesWSRef.current) {
        tilesWSRef.current.onmessage = null;
      }
    };
  }, []); // Empty dependency array to avoid re-creating the handler

  // Request tile data when we enter Layer 4
  useEffect(() => {
    console.log(`Tiles WS state: ${tilesWSRef.current?.readyState}`)
    console.log(`WebSocket.OPEN: ${WebSocket.OPEN}`)
    if (currentLayer === 4 && tilesWSRef.current?.readyState === WebSocket.OPEN) {
      const tileRange = calculateTileRangeForCurrentView();
      
      if (tileRange) {
        // Request the data for the current view
        tilesWSRef.current.send(JSON.stringify({
          action: 'viewTiles',
          layer: currentLayer,
          tileRange: tileRange
        }));
        
        console.log(`Requested tile data for range: ${tileRange}`);
      }
    }
  }, [currentLayer, selectedTiles]);

  // Calculate the range of tiles currently visible in Layer 4
  const calculateTileRangeForCurrentView = () => {
    if (currentLayer !== 4 || selectedTiles.length < 3) return null;
  
    let startIndex = 0;
    selectedTiles.forEach((tile, i) => {
      const multiplier = [200000, 2000, 20][i];
      startIndex += tile * multiplier;
    });
    
    const rangeStart = startIndex + 1;
    const rangeEnd = startIndex + 20; // 20 tiles in layer 4
    
    return `${rangeStart}-${rangeEnd}`;
  };

  // Calculate range for hovered tile
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

  // Handle tile click navigation
  const handleTileClick = (index: number) => {
    if (currentLayer < 4) {
      setTransitioning(true);
      setTimeout(() => {
        setSelectedTiles((prev) => [...prev, index]);
        setCurrentLayer((prev) => prev + 1);
        setTransitioning(false);
      }, 500);
    } else if (currentLayer === 4) {
      // Deploy a bot on the tile if it's not already mined
      const tileRange = calculateTileRangeForCurrentView();
      if (!tileRange) return;
      
      const tilePosition = Number(tileRange.split('-')[0]) + index;
      const tileLocation = tilePosition.toString();
      console.log(`Clicked on tile location: ${tileLocation}`);
      
      // Check if the tile has already been mined
      if (tileStates[tileLocation] && tileStates[tileLocation] !== 'unmined') {
        alert('This tile has already been mined!');
        return;
      }
      
      // Handle bot deployment
      handleDeployBot(tileLocation);
    }
  };

  // Handle back navigation
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

  // Handle wallet connection
  const handleWalletConnect = (newAddress: string, provider: string) => {
    console.log("Wallet connected:", newAddress, "Provider:", provider);
  
    setWalletAddress(newAddress);
    setWalletProvider(provider);
    
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
  
  // Handle bot deployment
  const handleDeployBot = async (tileLocation: string) => {
    if (!walletAccount || !walletAddress) {
      setShowErrorPopup(true); // Show popup if wallet is not connected
      return;
    }

    try {
      // Pass the tile location to your depositWithMessage function
      const txHash = await depositWithMessage(walletAccount, walletAddress, tileLocation);
      alert(`Bot deployed to tile ${tileLocation}! Transaction Hash: ${txHash}`);
    } catch (err) {
      alert("Bot deployment failed! Check console for details.");
      console.error(err);
    }
  };

  // Function removed as we only allow deployment on Layer 4 with explicit tile selection
  
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

  // Grid layout parameters
  const effectiveSize = currentLayer === 4 ? 4 : 10;
  const tiles = Array(currentLayer === 4 ? 20 : effectiveSize * effectiveSize).fill(null);
  const tileSizeWidth = currentLayer === 4 ? 110 : 43;
  const tileSizeHeight = currentLayer === 4 ? 95 : 43;
  const getTileBackgroundImage = () => {
    return `/tile_${currentLayer}.png`;
  };
  
  // Transaction event colors
  const eventColors: { [key: string]: string } = {
    BombFound: '#FF4C4C',
    TileAlreadyMined: '#E6B800',
    DiamondFound: '#4CAF50',
    TileMined: '#2196F3',
  };

  // Render the tile content based on its state
  const renderTileContent = (index: number) => {
    if (currentLayer !== 4) return null;
    
    const tileRange = calculateTileRangeForCurrentView();
    if (!tileRange) return null;
    
    const tilePosition = Number(tileRange.split('-')[0]) + index;
    const tileLocation = tilePosition.toString();
    const tileState = tileStates[tileLocation];
    
    if (tileState === 'diamond') {
      return <img src="/diamond.gif" alt="diamond" className="tile-overlay-gif" />;
    } else if (tileState === 'bomb') {
      return <img src="/nuke.gif" alt="nuke" className="tile-overlay-gif" />;
    } else if (tileState === 'empty') {
      return <img src="/hammer.gif" alt="nuke" className="tile-overlay-gif" />;
      // Optional: show something for empty mined tiles
    }
    
    // Default: unmined or unknown state
    return null;
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Gridy</h1>
        <div>
          <Button 
            onClick={async () => {
              if (!walletAccount || !walletAddress) {
                setShowErrorPopup(true);
                return;
              }

              // Only allow deployment on layer 4
              if (currentLayer !== 4) {
                alert("You can only deploy bots on Layer 4. Please navigate to Layer 4 and click on a specific tile.");
                return;
              }
              
              // When on layer 4, instruct to click on a specific tile
              alert("Please click on a specific tile to deploy your bot.");
              return;
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
                {renderTileContent(index)}
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