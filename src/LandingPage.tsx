import React, { useState, useEffect } from 'react';
import { Button, Bubble } from 'pixel-retroui';
import './landingPage.css';

const GRID_ROWS = 30;
const GRID_COLS = 40;

const LandingPage = ({ onStartGame }: { onStartGame: () => void }) => {
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [tileStates, setTileStates] = useState<string[]>([]);
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const [stickyNote, setStickyNote] = useState<{ message: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const initialTileStates = Array.from({ length: GRID_ROWS * GRID_COLS }).map(() => {
      const random = Math.random();
      if (random < 0.1) return 'bomb';
      if (random < 0.25) return 'diamond';
      return 'empty';
    });
    setTileStates(initialTileStates);

    const initialRevealed = new Set<number>();
    while (initialRevealed.size < 15) {
      initialRevealed.add(Math.floor(Math.random() * GRID_ROWS * GRID_COLS));
    }
    setRevealedTiles([...initialRevealed]);
  }, []);

  const isValidPosition = (row: number, col: number) =>
    row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;

  const handleTileClick = (index: number, e: React.MouseEvent) => {
    const clickedRow = Math.floor(index / GRID_COLS);
    const clickedCol = index % GRID_COLS;

    const tilesToReveal = new Set([index]);
    const burstRadius = Math.random() < 0.4 ? 1 : Math.random() < 0.5 ? 2 : 3;

    for (let dx = -burstRadius; dx <= burstRadius; dx++) {
      for (let dy = -burstRadius; dy <= burstRadius; dy++) {
        if (Math.random() < 0.7) {
          const newRow = clickedRow + dx;
          const newCol = clickedCol + dy;
          if (isValidPosition(newRow, newCol)) {
            tilesToReveal.add(newRow * GRID_COLS + newCol);
          }
        }
      }
    }

    setRevealedTiles((prev) => Array.from(new Set([...prev, ...tilesToReveal])));

    setStickyNote({
      message: getRandomHint(),
      x: e.clientX,
      y: e.clientY,
    });
  };

  const getRandomHint = () => {
    const hints = [
      'Watch out for bombs!',
      'Diamonds are hidden deep!',
      'Click tiles to reveal.',
      'Go deeper for more rewards!',
      'Gridy is full of surprises!',
    ];
    return hints[Math.floor(Math.random() * hints.length)];
  };

  const isPartOfTitle = (row: number, col: number) => {
    const gridyCoords = new Set([
      '10,10', '10,11', '10,12', '10,13', '11,10', '12,10', '13,10', '14,10', '15,10', '15,11', '15,12', '15,13', '14,13', '13,13', '13,12',
      '10,15', '11,15', '12,15', '13,15', '14,15', '15,15', '14,16', '15,17', '10,16', '11,17', '12,17', '13,16',
      '10,19', '11,19', '12,19', '13,19', '14,19', '15,19',
      '10,21', '11,21', '12,21', '13,21', '14,21', '15,21', '10,22', '10,23', '11,24', '12,24', '13,24', '14,24', '15,23', '15,22',
      '13,28', '14,27', '15,26', '12,28', '11,28', '10,28', '10,26', '11,26', '12,26', '12,27',
    ]);
    return gridyCoords.has(`${row},${col}`);
  };

  return (
    <div className="landing-page">
      <div className="pixel-grid">
        {tileStates.map((tileState, index) => {
          const row = Math.floor(index / GRID_COLS);
          const col = index % GRID_COLS;
          const isRevealed = revealedTiles.includes(index);
          const isHovered = hoveredTile === index;
          const isTitleTile = isPartOfTitle(row, col);

          let cellColor = '';
          if (isRevealed) {
            if (tileState === 'diamond') cellColor = 'diamond';
            if (tileState === 'bomb') cellColor = 'bomb';
            if (tileState === 'empty') cellColor = 'empty';
          }

          return (
            <div
              key={index}
              className={`pixel-tile ${isRevealed ? cellColor : ''} ${
                isHovered && !isRevealed ? 'hovered' : ''
              } ${isTitleTile ? 'title-tile' : ''}`}
              onMouseEnter={() => setHoveredTile(index)}
              onMouseLeave={() => setHoveredTile(null)}
              onClick={(e) => handleTileClick(index, e)}
            >
              {isRevealed && tileState === 'diamond' && (
                <img src="/diamond.gif" alt="diamond" className="tile-icon-gif" />
                )}
                {isRevealed && tileState === 'bomb' && (
                <img src="/nuke.gif" alt="nuke" className="tile-icon-gif" />
                )}
            </div>
          );
        })}
      </div>

      {stickyNote && (
        <div style={{ position: 'absolute', left: stickyNote.x + 10, top: stickyNote.y - 20 }}>
          <Bubble direction="left"
          bg="#ffffff"
          textColor="#000000"
          borderColor="#4dfffc"
          >{stickyNote.message}</Bubble>
        </div>
      )}

      <div className="landing-overlay-content">
      <Button
  onClick={onStartGame}
  bg="#ffffff"
  textColor="#000000"
  borderColor="#4dfffc"
  shadow="#000000"
  className="w-64 h-16 text-2xl flex items-center justify-center"
>
  Play Game
</Button>

      </div>
    </div>
  );
};

export default LandingPage;
