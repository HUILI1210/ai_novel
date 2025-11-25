import React from 'react';
import { CharacterExpression, BackgroundType } from './types';
import { Background } from './components/Background';
import { CharacterSprite } from './components/CharacterSprite';
import { DialogueBox } from './components/DialogueBox';
import { ChoiceMenu } from './components/ChoiceMenu';
import { SceneTransition } from './components/SceneTransition';
import { StatusPanel } from './components/StatusPanel';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ErrorOverlay } from './components/ErrorOverlay';
import { MainMenu } from './components/MainMenu';
import { GameOverScreen } from './components/GameOverScreen';
import { useGameState } from './hooks/useGameState';
import './styles/animations.css';

const App: React.FC = () => {
  const {
    gameState,
    showChoices,
    isTyping,
    setIsTyping,
    error,
    isMuted,
    isVoiceEnabled,
    isVoiceLoading,
    currentSpriteUrl,
    hasApiKey,
    handleStartGame,
    handleChoice,
    handleToggleMute,
    handleNextDialogue,
    toggleVoice,
    clearError,
  } = useGameState();

  // Main Menu
  if (!gameState.gameStarted) {
    return (
      <MainMenu 
        hasApiKey={hasApiKey}
        isLoading={gameState.isLoading}
        error={error}
        onStart={handleStartGame}
        onErrorClose={clearError}
      />
    );
  }

  // Game Over Screen
  if (gameState.currentScene?.isGameOver) {
    return (
      <GameOverScreen 
        narrative={gameState.currentScene.narrative}
        affection={gameState.affection}
      />
    );
  }

  // Active Game Loop
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black select-none">
      <StatusPanel 
        turn={gameState.turn}
        affection={gameState.affection}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />
      
      {/* Visual Layer */}
      <Background type={gameState.currentScene?.background || BackgroundType.SCHOOL_ROOFTOP} />
      
      {/* Transitions */}
      <SceneTransition triggerKey={gameState.currentScene?.background || "init"} />
      
      {/* Character Layer */}
      <CharacterSprite 
        expression={gameState.currentScene?.expression || CharacterExpression.NEUTRAL} 
        isVisible={!gameState.isLoading}
        imageUrl={currentSpriteUrl}
      />

      {/* UI Layer */}
      <DialogueBox 
        speaker={gameState.currentScene?.speaker || "???"}
        text={gameState.currentScene?.dialogue || "..."}
        onNext={handleNextDialogue}
        isTyping={isTyping}
        setIsTyping={setIsTyping}
        isVoiceEnabled={isVoiceEnabled}
        toggleVoice={toggleVoice}
        isVoiceLoading={isVoiceLoading}
      />

      {/* Interaction Layer */}
      <ChoiceMenu 
        choices={gameState.currentScene?.choices || []}
        onChoose={handleChoice}
        visible={showChoices}
      />
      
      <LoadingOverlay isLoading={gameState.isLoading} />
      <ErrorOverlay error={error} onClose={clearError} />
    </div>
  );
};

export default App;