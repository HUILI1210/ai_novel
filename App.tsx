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
// CGOverlay 已被移除，CG现在通过Background组件显示
import { ScriptEndingScreen } from './components/ScriptEndingScreen';
import { ScriptLibrary } from './components/ScriptLibrary';
import { ScriptEditor } from './components/ScriptEditor';
import { WeatherEffect, WeatherType } from './components/WeatherEffect';
import { SettingsModal } from './components/SettingsModal';
import { SaveLoadModal } from './components/SaveLoadModal';
import { useGameState } from './hooks/useGameState';
import { useParallax } from './hooks/useParallax';
import { workerService } from './services/workerService';
import { DialogueCacheService } from './services/dialogueCacheService';
import { getAllScripts } from './services/scriptLibraryService';
import { getCharacterByScriptId } from './constants/storyAssets';
import { saveGame, SaveData, getSaveIndex } from './services/saveService';
import { hasPreloadedScript } from './services/scriptPlayerService';
import { preloadScriptAssets, preloadCharacterExpressions } from './utils/imagePreloader';
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
    loadedScript,
    scriptEnding,
    handleStartScriptGame,
    // 存档相关
    loadFromSave,
    getCurrentSaveState,
    getCurrentScriptId,
    getCurrentScriptTitle,
    currentChapterIndex,
    scriptDialogueIndex,
    // 历史回跳
    jumpToHistory,
  } = useGameState();

  // UI States
  const [showScriptLibrary, setShowScriptLibrary] = useState(false);
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const hasRecordedRef = useRef(false);

  // 存档处理
  const handleOpenSave = () => {
    setShowSaveModal(true);
    if (gameState.isPaused) togglePause();
  };

  const handleOpenLoad = () => {
    setShowLoadModal(true);
    if (gameState.isPaused) togglePause();
  };

  const handleLoadSave = (saveData: SaveData) => {
    setShowLoadModal(false);
    loadFromSave(saveData);
  };

  const handleContinueGame = (saveData: SaveData) => {
    loadFromSave(saveData);
  };

  // 快速存档并退出
  const handleQuickSaveAndExit = () => {
    const saveState = getCurrentSaveState();
    if (saveState && isScriptMode) {
      const scriptId = getCurrentScriptId();
      const scriptTitle = getCurrentScriptTitle();
      
      // 保存到槽位 0 (第一个槽位)
      saveGame(scriptId, 0, {
        scriptId,
        scriptTitle,
        chapterIndex: saveState.chapterIndex,
        dialogueIndex: saveState.dialogueIndex,
        affection: saveState.affection,
        turnsPlayed: saveState.turnsPlayed,
        characterName: saveState.characterName,
        currentExpression: saveState.currentExpression,
        currentBackground: saveState.currentBackground,
        currentBgm: saveState.currentBgm,
        previewText: saveState.currentDialogue.substring(0, 50) + 
                     (saveState.currentDialogue.length > 50 ? '...' : ''),
      });
    }
    // 返回标题
    returnToTitle();
  };

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

  // 全局键盘事件监听 (ESC暂停, 空格跳过)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 游戏未开始时不处理
      if (!gameState.gameStarted) return;
      
      // 如果正在输入框中，不处理
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // ESC 唤起/关闭暂停菜单
      if (e.key === 'Escape') {
        e.preventDefault();
        // 关闭所有弹窗
        if (showSaveModal) {
          setShowSaveModal(false);
        } else if (showLoadModal) {
          setShowLoadModal(false);
        } else if (showHistory) {
          setShowHistory(false);
        } else {
          togglePause();
        }
        return;
      }

      // 空格键跳过对话/CG
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        // 暂停时不处理
        if (gameState.isPaused) return;
        // 选择菜单显示时不处理
        if (showChoices) return;
        // 加载中不处理
        if (gameState.isLoading) return;
        
        handleNextDialogue();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.gameStarted, gameState.isPaused, gameState.isLoading, showChoices, showSaveModal, showLoadModal, showHistory, togglePause, handleNextDialogue]);

  // 处理剧本选择
  const handleSelectScript = async (script: ScriptTemplate) => {
    setShowScriptLibrary(false);
    
    // 立即开始预加载该剧本的资源
    preloadScriptAssets(script.id);
    if (script.character?.name) {
      preloadCharacterExpressions(script.character.name);
    }
    
    // 判断使用剧本模式还是AI模式
    // 优先级: 1. 显式设置 useAIMode=true 时使用AI模式
    //        2. 有预加载剧本文件时使用剧本模式
    //        3. 其他情况使用AI模式
    const shouldUseAIMode = script.useAIMode === true || !hasPreloadedScript(script.id);
    
    if (!shouldUseAIMode) {
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
          onStart={() => setShowLoadModal(true)}
          onErrorClose={clearError}
          onOpenScriptLibrary={() => setShowScriptLibrary(true)}
          onOpenSettings={() => setShowSettings(true)}
          onContinueGame={handleContinueGame}
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
        {/* 读档弹窗（主菜单 - 显示所有剧本存档） */}
        <SaveLoadModal
          isOpen={showLoadModal}
          onClose={() => setShowLoadModal(false)}
          mode="load"
          showAllScripts={true}
          onLoad={handleLoadSave}
        />
      </>
    );
  }

  // Script Ending Screen - 剧本模式结局
  if (scriptEnding && isScriptMode) {
    return (
      <ScriptEndingScreen
        ending={scriptEnding}
        affection={gameState.affection}
        turnsPlayed={gameState.turn}
        characterName={getCharacterByScriptId(loadedScript?.id || '')}
        scriptTitle={loadedScript?.title || '未知剧本'}
        onReturnToTitle={returnToTitle}
      />
    );
  }

  // Game Over Screen - AI生成模式结局
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
      
      {/* Visual Layer - CG模式下使用CG替换背景 */}
      <Background 
        type={gameState.currentScene?.background || BackgroundType.SCHOOL_ROOFTOP} 
        parallaxOffset={parallaxOffset}
        cgImage={currentCG && isScriptMode ? currentCG : undefined}
      />
      
      {/* Transitions */}
      <SceneTransition 
        triggerKey={gameState.currentScene?.background || "init"} 
        type="fade" 
      />
      
      {/* Weather Effects */}
      <WeatherEffect type={getWeatherType()} intensity={0.4} />
      
      {/* Character Layer - CG模式下隐藏 */}
      <CharacterSprite 
        expression={gameState.currentScene?.expression || CharacterExpression.NEUTRAL} 
        isVisible={!gameState.isLoading && !(currentCG && isScriptMode)}
        characterName={isScriptMode ? getCharacterByScriptId(loadedScript?.id || '') : (currentScript?.character.name || '雯曦')}
        isSpeaking={isScriptMode 
          ? gameState.currentScene?.speaker === getCharacterByScriptId(loadedScript?.id || '')
          : gameState.currentScene?.speaker === currentScript?.character.name}
        parallaxOffset={parallaxOffset}
      />

      {/* UI Layer - CG模式下隐藏对话框 */}
      {!(currentCG && isScriptMode) && (
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
      )}
      
      {/* CG模式下的点击区域 */}
      {currentCG && isScriptMode && (
        <div 
          className="absolute inset-0 z-20 cursor-pointer"
          onClick={handleNextDialogue}
        >
          {/* 底部提示 */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm animate-pulse">
            点击继续
          </div>
        </div>
      )}

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
        onSave={isScriptMode ? handleOpenSave : undefined}
        onLoad={handleOpenLoad}
        onQuickSaveAndExit={isScriptMode ? handleQuickSaveAndExit : undefined}
        canSave={isScriptMode}
      />

      {/* History Panel */}
      <HistoryPanel
        isVisible={showHistory}
        history={gameState.history}
        onClose={() => setShowHistory(false)}
        onJumpToHistory={jumpToHistory}
        canJump={isScriptMode}
      />

      {/* 存档弹窗 */}
      <SaveLoadModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        mode="save"
        scriptId={getCurrentScriptId()}
        scriptTitle={getCurrentScriptTitle()}
        currentState={getCurrentSaveState() || undefined}
      />

      {/* 读档弹窗（游戏内） */}
      <SaveLoadModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        mode="load"
        scriptId={getCurrentScriptId()}
        scriptTitle={getCurrentScriptTitle()}
        onLoad={handleLoadSave}
      />

    </div>
  );
};

export default App;