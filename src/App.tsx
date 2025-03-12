import React, { useState } from 'react';
import { StarknetProvider } from './StarknetProvider';
import LandingPage from './LandingPage';
import MainGame from './MainGame';

const App: React.FC = () => {
  const [isGameStarted, setIsGameStarted] = useState(false);

  return (
    <StarknetProvider>
      <div>
        {isGameStarted ? (
          <MainGame />
        ) : (
          <LandingPage onStartGame={() => setIsGameStarted(true)} />
        )}
      </div>
    </StarknetProvider>
  );
};

export default App;