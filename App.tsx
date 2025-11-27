import React, { useState, useEffect, useRef } from 'react';
import { CharacterExpression, BackgroundType, ScriptTemplate } from './types';
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
import { PauseMenu } from './components/PauseMenu';
import { HistoryPanel } from './components/HistoryPanel';
import { CGScene } from './components/CGScene';
import { CGOverlay } from './components/CGOverlay';
import { ScriptLibrary } from './components/ScriptLibrary';
import { ScriptEditor } from './components/ScriptEditor';
import { WeatherEffect, WeatherType } from './components/WeatherEffect';
import { SettingsModal } from './components/SettingsModal';
import { useGameState } from './hooks/useGameState';
import { useParallax } from './hooks/useParallax';
import { workerService } from './services/workerService';
import { DialogueCacheService } from './services/dialogueCacheService';
import { getAllScripts } from './services/scriptLibraryService';
import './styles/animations.css';

// 初始化Worker服务
workerService.init();

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
    currentScript,
    hasApiKey,
    handleStartGame,
    handleChoice,
    handleToggleMute,
    handleNextDialogue,
    toggleVoice,
    clearError,
    togglePause,
    setDialogueOpacity,
    returnToTitle,
    startWithScript,
    handleGeneratePlot,
    saveGameRecord,
    isAutoPlay,
    toggleAutoPlay,
    // 剧本模式
    isScriptMode,
    currentCG,
    handleStartScriptGame,
  } = useGameState();

  // UI States
  const [showScriptLibrary, setShowScriptLibrary] = useState(false);
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCG, setShowCG] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cgImageUrl, setCgImageUrl] = useState<string | null>(null);
  const hasRecordedRef = useRef(false);

  // 初始化对话缓存服务
  useEffect(() => {
    const initDialogueCache = async () => {
      const dialogueCache = DialogueCacheService.getInstance();
      const scripts = getAllScripts();
      
      // 后台预生成预设剧本的对话（不阻塞UI）
      setTimeout(() => {
        dialogueCache.preGenerateAllBatchData(scripts).catch(error => {
          console.warn('预生成对话失败:', error);
        });
      }, 1000); // 延迟1秒启动，避免影响首屏加载
    };

    initDialogueCache();
  }, []);

  // 视差效果 - 只在游戏进行中启用
  const parallaxOffset = useParallax({ 
    intensity: 15, 
    enabled: gameState.gameStarted && !gameState.isPaused 
  });

  // 根据背景类型选择天气效果
  const getWeatherType = (): WeatherType => {
    const bg = gameState.currentScene?.background;
    switch (bg) {
      case BackgroundType.PARK_NIGHT:
        return 'fireflies';
      case BackgroundType.SCHOOL_ROOFTOP:
        return 'petals'; // 樱花花瓣
      case BackgroundType.STREET_SUNSET:
        return 'leaves'; // 落叶
      default:
        return 'none';
    }
  };

  // 游戏结束时保存记录（只保存一次）
  useEffect(() => {
    if (gameState.currentScene?.isGameOver && !hasRecordedRef.current) {
      hasRecordedRef.current = true;
      saveGameRecord();
    }
    if (!gameState.gameStarted) {
      hasRecordedRef.current = false;
    }
  }, [gameState.currentScene?.isGameOver, gameState.gameStarted, saveGameRecord]);

  // 处理剧本选择
  const handleSelectScript = (script: ScriptTemplate) => {
    setShowScriptLibrary(false);
    
    // 检查是否是有预定义剧本的脚本（如公主剧本）
    if (script.id === 'preset_princess') {
      // 使用预定义剧本模式
      handleStartScriptGame(script.id);
    } else {
      // 使用AI生成模式
      startWithScript(script);
    }
  };

  const handleSaveScript = (script: ScriptTemplate) => {
    setShowScriptEditor(false);
    setShowScriptLibrary(true);
  };

  // Main Menu
  if (!gameState.gameStarted) {
    return (
      <>
        <MainMenu 
          hasApiKey={hasApiKey}
          isLoading={gameState.isLoading}
          error={error}
          onStart={handleStartGame}
          onErrorClose={clearError}
          onOpenScriptLibrary={() => setShowScriptLibrary(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
        <ScriptLibrary
          isVisible={showScriptLibrary}
          onClose={() => setShowScriptLibrary(false)}
          onSelectScript={handleSelectScript}
          onCreateNew={() => {
            setShowScriptLibrary(false);
            setShowScriptEditor(true);
          }}
        />
        {showScriptEditor && (
          <ScriptEditor
            onSave={handleSaveScript}
            onCancel={() => {
              setShowScriptEditor(false);
              setShowScriptLibrary(true);
            }}
            onGeneratePlot={handleGeneratePlot}
          />
        )}
        {/* 系统设置弹窗 */}
        <SettingsModal
          isOpen={showSettings}
          dialogueOpacity={gameState.dialogueOpacity}
          isMuted={isMuted}
          onClose={() => setShowSettings(false)}
          onOpacityChange={setDialogueOpacity}
          onToggleMute={handleToggleMute}
        />
      </>
    );
  }

  // Game Over Screen
  if (gameState.currentScene?.isGameOver) {
    return (
      <GameOverScreen 
        narrative={gameState.currentScene.narrative}
        affection={gameState.affection}
        turnsPlayed={gameState.turn}
        characterName={currentScript?.character.name || '雯曦'}
        onReturnToTitle={returnToTitle}
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
        onPause={togglePause}
        onOpenHistory={() => setShowHistory(true)}
      />
      
      {/* Visual Layer */}
      <Background 
        type={gameState.currentScene?.background || BackgroundType.SCHOOL_ROOFTOP} 
        parallaxOffset={parallaxOffset}
      />
      
      {/* Transitions */}
      <SceneTransition 
        triggerKey={gameState.currentScene?.background || "init"} 
        type="fade" 
      />
      
      {/* Weather Effects */}
      <WeatherEffect type={getWeatherType()} intensity={0.4} />
      
      {/* Character Layer */}
      <CharacterSprite 
        expression={gameState.currentScene?.expression || CharacterExpression.NEUTRAL} 
        isVisible={!gameState.isLoading}
        imageUrl={currentSpriteUrl}
        characterName={isScriptMode ? '艾琳娜' : (currentScript?.character.name || '雯曦')}
        isSpeaking={isScriptMode 
          ? gameState.currentScene?.speaker === '艾琳娜'
          : gameState.currentScene?.speaker === currentScript?.character.name}
        parallaxOffset={parallaxOffset}
      />

      {/* UI Layer */}
      <DialogueBox 
        speaker={gameState.currentScene?.speaker || "???"}
        text={gameState.currentScene?.dialogue || gameState.currentScene?.narrative || "..."}
        onNext={handleNextDialogue}
        isTyping={isTyping}
        setIsTyping={setIsTyping}
        isVoiceEnabled={isVoiceEnabled}
        toggleVoice={toggleVoice}
        isVoiceLoading={isVoiceLoading}
        opacity={gameState.dialogueOpacity}
        isAutoPlay={isAutoPlay}
        toggleAutoPlay={toggleAutoPlay}
      />

      {/* Interaction Layer */}
      <ChoiceMenu 
        choices={gameState.currentScene?.choices || []}
        onChoose={handleChoice}
        visible={showChoices}
      />
      
      <LoadingOverlay isLoading={gameState.isLoading} />
      <ErrorOverlay error={error} onClose={clearError} />

      {/* Pause Menu */}
      <PauseMenu
        isVisible={gameState.isPaused}
        dialogueOpacity={gameState.dialogueOpacity}
        onResume={togglePause}
        onReturnToTitle={returnToTitle}
        onOpacityChange={setDialogueOpacity}
      />

      {/* History Panel */}
      <HistoryPanel
        isVisible={showHistory}
        history={gameState.history}
        onClose={() => setShowHistory(false)}
      />

      {/* CG Scene */}
      <CGScene
        isVisible={showCG}
        imageUrl={cgImageUrl}
        onClose={() => setShowCG(false)}
      />

      {/* Script Mode CG Overlay */}
      <CGOverlay
        cgImage={currentCG}
        isVisible={!!currentCG && isScriptMode}
        onClose={handleNextDialogue}
      />
    </div>
  );
};

export default App;