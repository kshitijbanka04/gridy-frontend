import React, { useState } from 'react';
import LandingPage from './LandingPage';
import MainGame from './MainGame';

const App: React.FC = () => {
  const [isGameStarted, setIsGameStarted] = useState(false);

  return (
    <div>
      {isGameStarted ? (
        <MainGame />
      ) : (
        <LandingPage onStartGame={() => setIsGameStarted(true)} />
      )}
    </div>
  );
};

export default App;
