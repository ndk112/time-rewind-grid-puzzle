import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LEVELS } from './levels';
import { Position, Shadow } from './types';
import { findPosition, equalPositions, encodeMap, decodeMap } from './utils';
import { GameBoard } from './components/GameBoard';
import { sound } from './sound';
import { TRANSLATIONS } from './translations';
import {
  Volume2,
  VolumeX,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Settings,
} from 'lucide-react';

const SHADOW_COLORS = [
  '#06b6d4',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#f472b6',
  '#60a5fa',
];

export default function App() {
  const [levelIndex, setLevelIndex] = useState<number>(0);
  const [highestUnlocked, setHighestUnlocked] = useState<number>(0);
  const [playerPos, setPlayerPos] = useState<Position>({ row: 0, col: 0 });
  const [currentPath, setCurrentPath] = useState<Position[]>([]);
  const [shadows, setShadows] = useState<Shadow[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [levelCompleted, setLevelCompleted] = useState<boolean>(false);
  const [rewindAnchor, setRewindAnchor] = useState<Position>({ row: 0, col: 0 });

  const [muted, setMuted] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(() => {
    try {
      // 永久不再提醒
      if (localStorage.getItem('chrono_manual_never') === 'true') return false;
      // 当前会话已显示过
      return sessionStorage.getItem('chrono_manual_shown') !== 'true';
    } catch (e) {
      return true;
    }
  });
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [devMode, setDevMode] = useState<boolean>(false);
  const [appFocused, setAppFocused] = useState<boolean>(true);
  const [pendingTeleport, setPendingTeleport] = useState<Position | null>(null);
  const [creativeMode, setCreativeMode] = useState<boolean>(false);
  const [customGrid, setCustomGrid] = useState<string[][] | null>(null);
  const [selectedBrush, setSelectedBrush] = useState<string>('.');
  const [gridRows, setGridRows] = useState<number>(7);
  const [gridCols, setGridCols] = useState<number>(8);
  const [brushDoorId, setBrushDoorId] = useState<number>(1);
  const [isPlayingCustom, setIsPlayingCustom] = useState<boolean>(false);
  const [hideGridLines, setHideGridLines] = useState<boolean>(false);
  const [showShareBox, setShowShareBox] = useState<boolean>(false);
  const [importCode, setImportCode] = useState<string>('');

  useEffect(() => {
    const handleFocus = () => setAppFocused(true);
    const handleBlur = () => setAppFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    setAppFocused(document.hasFocus());
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleCloseHelp = useCallback(() => {
    setShowHelp(false);
    try {
      sessionStorage.setItem('chrono_manual_shown', 'true');
    } catch (e) {}
  }, []);

  const handleDontShowAgain = useCallback(() => {
    setShowHelp(false);
    try {
      localStorage.setItem('chrono_manual_never', 'true');
    } catch (e) {}
  }, []);

  const t = useMemo(() => TRANSLATIONS[language], [language]);
  const currentLevel = useMemo(() => {
    if (isPlayingCustom && customGrid) {
      return { id: 0, name: language === 'zh' ? '自定义关卡' : 'Custom Level', description: '', grid: customGrid };
    }
    return LEVELS[levelIndex];
  }, [levelIndex, isPlayingCustom, customGrid, language]);

  const startPos = useMemo(() => {
    return findPosition(currentLevel.grid, 'S') || { row: 0, col: 0 };
  }, [currentLevel]);

  const exitPos = useMemo(() => {
    return findPosition(currentLevel.grid, 'E') || findPosition(currentLevel.grid, '~') || { row: 0, col: 0 };
  }, [currentLevel]);

  const activeButtons = useMemo(() => {
    const actives = new Set<string>();
    const playerCell = currentLevel.grid[playerPos.row]?.[playerPos.col];
    if (playerCell && playerCell.startsWith('B')) {
      actives.add(playerCell.substring(1));
    }
    shadows.forEach((shadow) => {
      const stepPos = shadow.path[Math.min(currentStep, shadow.path.length - 1)];
      if (stepPos) {
        const shadowCell = currentLevel.grid[stepPos.row]?.[stepPos.col];
        if (shadowCell && shadowCell.startsWith('B')) {
          actives.add(shadowCell.substring(1));
        }
      }
    });
    return actives;
  }, [playerPos, shadows, currentStep, currentLevel]);

  useEffect(() => {
    sound.muted = muted;
  }, [muted]);

  const handleResetLevel = useCallback(() => {
    setPlayerPos(startPos);
    setCurrentPath([startPos]);
    setRewindAnchor(startPos);
    setShadows([]);
    setCurrentStep(0);
    setLevelCompleted(false);
    sound.playReset();
  }, [startPos]);

  const changeLevel = useCallback((index: number, force = false) => {
    if (index >= 0 && index < LEVELS.length && (force || index <= highestUnlocked)) {
      setLevelIndex(index);
      setLevelCompleted(false);
    }
  }, [highestUnlocked]);

  // 通关解锁下一关
  useEffect(() => {
    if (levelCompleted && levelIndex >= highestUnlocked && levelIndex + 1 < LEVELS.length) {
      setHighestUnlocked(levelIndex + 1);
    }
  }, [levelCompleted, levelIndex, highestUnlocked]);

  // 进入自定义试玩时初始化
  useEffect(() => {
    if (isPlayingCustom && customGrid) {
      const startPos = findPosition(customGrid, 'S') || { row: 0, col: 0 };
      setPlayerPos(startPos);
      setCurrentPath([startPos]);
      setCurrentStep(0);
      setShadows([]);
      setRewindAnchor(startPos);
      setLevelCompleted(false);
    }
  }, [isPlayingCustom]);

  useEffect(() => {
    setPlayerPos(startPos);
    setCurrentPath([startPos]);
    setRewindAnchor(startPos);
    setShadows([]);
    setCurrentStep(0);
    setLevelCompleted(false);
  }, [levelIndex, startPos]);

  const handleMove = useCallback((dRow: number, dCol: number) => {
    if (levelCompleted || pendingTeleport) return;

    const nextPos: Position = {
      row: playerPos.row + dRow,
      col: playerPos.col + dCol,
    };

    const rows = currentLevel.grid.length;
    const cols = currentLevel.grid[0].length;

    if (nextPos.row < 0 || nextPos.row >= rows || nextPos.col < 0 || nextPos.col >= cols) {
      return;
    }

    const cell = currentLevel.grid[nextPos.row][nextPos.col];

    if (cell === '#') {
      return;
    }

    if (cell.startsWith('D') || cell.startsWith('O')) {
      const doorId = cell.substring(1);
      const isDefaultOpen = cell.startsWith('O');
      const isOpen = activeButtons.has(doorId) ? !isDefaultOpen : isDefaultOpen;
      if (!isOpen) {
        return;
      }
    }

    // 传送门：先走到 ? 上，触发延迟传送
    if (cell === '?') {
      const teleports = currentLevel.grid
        .flatMap((row, r) => row.map((c, col) => ({ cell: c, row: r, col })))
        .filter((t) => t.cell === '?' && !(t.row === nextPos.row && t.col === nextPos.col));
      if (teleports.length > 0) {
        setPendingTeleport({ row: teleports[0].row, col: teleports[0].col });
      }
    }

    const newPath = [...currentPath, nextPos];
    const newStep = currentStep + 1;

    setPlayerPos(nextPos);
    setCurrentPath(newPath);
    setCurrentStep(newStep);

    // 影子同步前进一步
    setShadows((prev) =>
      prev.map((s) => ({
        ...s,
        currentIndex: Math.min(s.currentIndex + 1, s.path.length - 1),
      }))
    );

    if (dRow === 0 && dCol === 0) {
      sound.playWait();
    } else {
      sound.playMove();
    }

    if (equalPositions(nextPos, exitPos)) {
      setLevelCompleted(true);
      sound.playWin();
    }
  }, [playerPos, currentLevel, activeButtons, currentPath, currentStep, exitPos, levelCompleted, pendingTeleport]);

  const handleRewind = useCallback(() => {
    if (levelCompleted || pendingTeleport) return;

    setShadows((prev) => {
      // 重置所有现有影子的步数
      const resetPrev = prev.map((s) => ({ ...s, currentIndex: 0 }));

      const newShadow: Shadow = {
        id: `shadow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        path: [...currentPath],
        color: resetPrev.length >= 2 ? resetPrev[0].color : SHADOW_COLORS[resetPrev.length % SHADOW_COLORS.length],
        currentIndex: 0,
      };

      if (resetPrev.length >= 2) {
        return [resetPrev[1], newShadow];
      } else {
        return [...resetPrev, newShadow];
      }
    });

    setPlayerPos(rewindAnchor);
    setCurrentPath([rewindAnchor]);
    setCurrentStep(0);
    sound.playRewind();
  }, [currentPath, rewindAnchor, levelCompleted, pendingTeleport]);

  const handleSetAnchor = useCallback(() => {
    if (levelCompleted || pendingTeleport) return;

    const cell = currentLevel.grid[playerPos.row]?.[playerPos.col];
    if (cell === '#' || cell === 'E') return;

    if (!equalPositions(rewindAnchor, playerPos)) {
      setRewindAnchor(playerPos);
      setShadows([]);
      setCurrentPath([playerPos]);
      setCurrentStep(0);
      sound.playMove();
    }
  }, [playerPos, rewindAnchor, currentLevel, levelCompleted, pendingTeleport]);

  const handleUndo = useCallback(() => {
    if (levelCompleted || currentStep === 0 || pendingTeleport) return;

    const updatedPath = [...currentPath];
    updatedPath.pop();

    const prevPos = updatedPath[updatedPath.length - 1] || startPos;

    setPlayerPos(prevPos);
    setCurrentPath(updatedPath);
    setCurrentStep((prev) => prev - 1);
    sound.playMove();
  }, [currentPath, currentStep, startPos, levelCompleted, pendingTeleport]);

  // 传送门：0.5s 后完成传送
  useEffect(() => {
    if (!pendingTeleport) return;
    const timer = setTimeout(() => {
      setPlayerPos(pendingTeleport);
      setCurrentPath((prev) => [...prev, pendingTeleport]);
      setCurrentStep((prev) => prev + 1);
      setPendingTeleport(null);
      sound.playMove();
    }, 200);
    return () => clearTimeout(timer);
  }, [pendingTeleport]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code;
      const keyCode = e.keyCode || e.which;

      const isUp = key === 'arrowup' || code === 'ArrowUp' || keyCode === 38;
      const isDown = key === 'arrowdown' || code === 'ArrowDown' || keyCode === 40;
      const isLeft = key === 'arrowleft' || code === 'ArrowLeft' || keyCode === 37;
      const isRight = key === 'arrowright' || code === 'ArrowRight' || keyCode === 39;
      const isSpace = key === ' ' || code === 'Space' || keyCode === 32;
      const isE = key === 'e' || code === 'KeyE' || keyCode === 69;
      const isQ = key === 'q' || code === 'KeyQ' || keyCode === 81;
      const isF = key === 'f' || code === 'KeyF' || keyCode === 70;
      const isDel = key === 'delete' || code === 'Delete' || keyCode === 46;

      const isGameKey = isUp || isDown || isLeft || isRight || isSpace || isE || isQ || isF || isDel;

      if (isGameKey) {
        const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
        const isPureScrollKey = isUp || isDown || isLeft || isRight || isSpace;

        if (!isPureScrollKey && hasModifier) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }

      if (levelCompleted) return;

      if (isUp) {
        handleMove(-1, 0);
      } else if (isDown) {
        handleMove(1, 0);
      } else if (isLeft) {
        handleMove(0, -1);
      } else if (isRight) {
        handleMove(0, 1);
      } else if (isSpace) {
        handleMove(0, 0);
      } else if (isE) {
        handleRewind();
      } else if (isQ) {
        handleUndo();
      } else if (isF) {
        handleSetAnchor();
      } else if (isDel) {
        handleResetLevel();
      }
    };

    const handleMouseUp = () => {
      window.focus();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };

    window.focus();

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('mouseup', handleMouseUp, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
    };
  }, [handleMove, handleRewind, handleUndo, handleSetAnchor, handleResetLevel, levelCompleted]);

  return (
    <div className="relative min-h-screen bg-[#0f172a] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans">
      {/* 装饰网格背景 */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1.2px,transparent_1px)] [background-size:24px_24px] opacity-[0.12] pointer-events-none" />


      {/* 焦点丢失 */}
      {!appFocused && (
        <div
          onClick={() => window.focus()}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 text-xs font-medium cursor-pointer transition"
        >
          <span className="animate-pulse text-white/80">{t.focusOverlayText}</span>
        </div>
      )}

      {/* 左上角 */}
      <div className="absolute top-4 left-4 flex flex-col items-start gap-3 z-20">
        {!creativeMode && (
        <div>
          <div className="text-lg font-black text-slate-200 tracking-wide">{language === 'zh' ? `第 ${levelIndex + 1} 关` : `Level ${levelIndex + 1}`}</div>
        </div>
        )}

        {/* 角色步数 */}
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-[13px] font-bold text-[#475569] uppercase tracking-wider">{language === 'zh' ? '步数' : 'Steps'}</span>
          <span className="text-lg font-black text-slate-200">{currentStep}</span>
        </div>

        {/* 每个影子的步数 */}
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#475569] uppercase tracking-wider">{language === 'zh' ? '影子' : 'Shadows'}</span>
            <span className="text-base font-black text-slate-200">{shadows.length}<span className="text-[12px] text-[#475569] font-normal">/2</span></span>
          </div>
          {shadows.length > 0 && (
            <>
              {shadows.map((shadow, idx) => (
                <div key={shadow.id} className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] text-slate-400">#{idx + 1}</span>
                    <span className="text-lg font-black text-slate-200">
                      {shadow.currentIndex}<span className="text-[12px] text-[#475569] font-normal">/{Math.max(0, shadow.path.length - 1)}</span>
                    </span>
                  </div>
                  <div className="w-[150px] h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${shadow.path.length > 1 ? (shadow.currentIndex / (shadow.path.length - 1)) * 100 : 0}%`,
                        background: `linear-gradient(90deg, ${shadow.color}, ${shadow.color}88)`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {shadows.length >= 2 && (
                <span className="text-[8px] text-amber-400 font-medium animate-pulse">{language === 'zh' ? '已满' : 'Full'}</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 游戏 */}
      {creativeMode && customGrid && !isPlayingCustom && (
        <GameBoard
          level={{ id: 0, name: 'Editor', description: '', grid: customGrid }}
          playerPos={{ row: -1, col: -1 }}
          shadows={[]}
          currentStep={0}
          activeButtons={new Set()}
          rewindAnchor={{ row: -1, col: -1 }}
          pendingTeleport={null}
          editable={true}
          gridWidth="50%"
          hideGridLines={hideGridLines}
          onCellEdit={(r, c) => {
            setCustomGrid((prev) => {
              if (!prev) return prev;
              const next = prev.map((row) => [...row]);
              next[r][c] = selectedBrush;
              localStorage.setItem('chrono_custom_grid', JSON.stringify(next));
              return next;
            });
          }}
        />
      )}
      {(isPlayingCustom || !creativeMode) && (
        <GameBoard
          level={currentLevel}
          playerPos={playerPos}
          shadows={shadows}
          currentStep={currentStep}
          activeButtons={activeButtons}
          rewindAnchor={rewindAnchor}
          pendingTeleport={pendingTeleport}
        />
      )}

      {/* 右上角：特工手册 + 系统面板 */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <button
          onClick={() => setShowHelp(true)}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 flex items-center justify-center transition"
          title={t.helpBtn}
        >
          <HelpCircle className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-brand-purple flex items-center justify-center transition"
          title={t.settingsBtn}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* 开发者关卡选择 */}
      {devMode && (
        <div className="absolute top-4 right-[180px] z-30 flex items-center gap-1 bg-[#0f172a]/90 backdrop-blur-sm rounded-xl p-1.5">
          {LEVELS.map((_, i) => (
            <button
              key={i}
              onClick={() => changeLevel(i, true)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                levelIndex === i
                  ? 'bg-yellow-500 text-[#0f172a]'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* 创意模式工具栏 */}
      {creativeMode && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2 bg-[#0f172a]/95 backdrop-blur-sm rounded-2xl p-3 border border-white/5 shadow-xl">
          {/* 第1列：笔刷 */}
          <div className="flex flex-col items-center gap-1.5">
            {[
              { label: '🧱', brush: '#', title: language === 'zh' ? '墙壁' : 'Wall' },
              { label: '📍', brush: 'S', title: language === 'zh' ? '起点' : 'Start' },
              { label: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>, brush: '~', title: language === 'zh' ? '出口' : 'Exit' },
              { label: '🌀', brush: '?', title: language === 'zh' ? '传送门' : 'Teleport' },
              { label: '🗑️', brush: '.', title: language === 'zh' ? '删除' : 'Delete' },
            ].map((item) => (
              <button
                key={item.brush}
                onClick={() => setSelectedBrush(item.brush)}
                className={`w-9 h-9 rounded-xl text-sm flex items-center justify-center transition ${
                  selectedBrush === item.brush
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
                title={item.title}
              >
                {item.label}
              </button>
            ))}
          </div>
          <span className="w-px h-full bg-white/10" />
          {/* 第2列：按钮 */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[8px] font-bold text-slate-500 tracking-widest">{language === 'zh' ? '按钮' : 'Btn'}</span>
            {[1,2,3,4,5,6,7,8,9].map((id) => (
              <button
                key={`B${id}`}
                onClick={() => { setSelectedBrush(`B${id}`); setBrushDoorId(id); }}
                className={`w-9 h-9 rounded-xl text-[10px] font-bold flex items-center justify-center transition ${
                  selectedBrush === `B${id}`
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
                title={`Button ${id}`}
              >{`B${id}`}</button>
            ))}
          </div>
          <span className="w-px h-full bg-white/10" />
          {/* 第3列：门 */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[8px] font-bold text-slate-500 tracking-widest">{language === 'zh' ? '门' : 'Door'}</span>
            {[1,2,3,4,5,6,7,8,9].map((id) => (
              <button
                key={`D${id}`}
                onClick={() => { setSelectedBrush(`D${id}`); setBrushDoorId(id); }}
                className={`w-9 h-9 rounded-xl text-[10px] font-bold flex items-center justify-center transition ${
                  selectedBrush === `D${id}`
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
                title={`Door ${id}`}
              >{`D${id}`}</button>
            ))}
          </div>
          <span className="w-px h-full bg-white/10" />
          {/* 第4列：操作 */}
          <div className="flex flex-col items-center gap-2">

          {/* 操作按钮 */}
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="flex flex-col items-center gap-1 text-[10px] text-slate-500">
              <div className="flex items-center gap-1">
                <input
                  type="number" min={3} max={20}
                  value={gridRows}
                  onChange={(e) => {
                    const v = Math.max(3, Math.min(20, Number(e.target.value)));
                    setGridRows(v);
                  }}
                  className="w-10 h-7 rounded-lg bg-white/10 text-slate-200 text-center text-xs border-none outline-none"
                />
                <span>{language === 'zh' ? '行' : 'Rows'}</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number" min={3} max={20}
                  value={gridCols}
                onChange={(e) => {
                  const v = Math.max(3, Math.min(20, Number(e.target.value)));
                  setGridCols(v);
                }}
                className="w-10 h-7 rounded-lg bg-white/10 text-slate-200 text-center text-xs border-none outline-none"
              />
              <span>{language === 'zh' ? '列' : 'Cols'}</span>
            </div>
            </div>
            <span className="w-8 h-px bg-white/10" />
            <button
              onClick={() => {
                setCustomGrid(Array.from({ length: gridRows }, () => Array(gridCols).fill('.')));
                localStorage.setItem('chrono_custom_grid', JSON.stringify(
                  Array.from({ length: gridRows }, () => Array(gridCols).fill('.'))
                ));
              }}
              className="px-3 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-medium transition"
            >{language === 'zh' ? '清空' : 'Clear'}</button>
            <button
              onClick={() => setHideGridLines(!hideGridLines)}
              className={`px-2 h-7 rounded-lg text-[10px] font-medium transition ${
                hideGridLines ? 'bg-white/5 text-slate-500' : 'bg-indigo-500/20 text-indigo-400'
              }`}
              title={language === 'zh' ? '网格线' : 'Grid Lines'}
            >
              ▦
            </button>
            <button
              onClick={() => setShowShareBox(!showShareBox)}
              className={`px-2 h-7 rounded-lg text-[10px] font-medium transition ${
                showShareBox ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 hover:bg-white/10 text-slate-400'
              }`}
            >{language === 'zh' ? '码' : 'Code'}</button>
            {showShareBox && customGrid && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 bg-[#0f172a] border border-white/10 rounded-xl p-3 w-[320px] shadow-xl">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{language === 'zh' ? '地图码' : 'Map Code'}</span>
                    <button
                      onClick={() => {
                        const code = encodeMap(customGrid);
                        navigator.clipboard.writeText(code).catch(() => {});
                      }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition"
                    >{language === 'zh' ? '复制' : 'Copy'}</button>
                  </div>
                  <textarea readOnly value={encodeMap(customGrid)}
                    className="w-full h-14 bg-white/5 rounded-lg text-[10px] text-slate-300 p-2 outline-none resize-none font-mono"
                  />
                  <input
                    placeholder={language === 'zh' ? '粘贴地图码后点导入' : 'Paste code then Import'}
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                    className="w-full h-7 bg-white/5 rounded-lg text-[10px] text-slate-300 px-2 outline-none"
                  />
                  <button
                    onClick={() => {
                      const parsed = decodeMap(importCode.trim());
                      if (parsed) {
                        setCustomGrid(parsed);
                        setGridRows(parsed.length);
                        setGridCols(parsed[0].length);
                        localStorage.setItem('chrono_custom_grid', JSON.stringify(parsed));
                        setImportCode('');
                        setShowShareBox(false);
                      }
                    }}
                    className="w-full h-7 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-[10px] font-medium transition"
                  >{language === 'zh' ? '导入' : 'Import'}</button>
                </div>
              </div>
            )}
            <span className="w-8 h-px bg-white/10" />
            <button
              onClick={() => {
                if (!customGrid) return;
                // 确保有 S 和 ~
                const hasStart = customGrid.some(row => row.includes('S'));
                const hasExit = customGrid.some(row => row.includes('~'));
                if (!hasStart || !hasExit) {
                  alert(language === 'zh' ? '地图需要起点(S)和出口(~)' : 'Map needs a Start (S) and Exit (~)');
                  return;
                }
                setIsPlayingCustom(true);
              }}
              className="px-4 h-7 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-[10px] font-bold transition shadow-lg"
            >{language === 'zh' ? '▶ 试玩' : '▶ Play'}</button>
            {isPlayingCustom && (
              <button
                onClick={() => setIsPlayingCustom(false)}
                className="px-3 h-7 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[10px] font-medium transition"
              >{language === 'zh' ? '返回编辑' : 'Back'}</button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* === 帮助弹窗 === */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50"
            onClick={handleCloseHelp}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="modal-card max-w-lg w-full p-6 flex flex-col gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 pb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" style={{animationDuration: '6s'}}>
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <h3 className="text-base font-extrabold tracking-wide uppercase text-white">
                  {language === 'zh' ? '特工手册' : 'Field Manual'}
                </h3>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-slate-300">
                <p>{t.guideWelcome}</p>

                {/* 玩法介绍 */}
                <div>
                  <div className="space-y-2.5 p-3.5 bg-white/[0.03] rounded-2xl max-h-40 overflow-y-auto">
                    {(language === 'zh'
                      ? [
                        '使用方向键控制角色移动，想尽办法抵达终点。',
                        '你拥有影子，在进行时间回溯后，影子会重复你上一次的路径。',
                        '你最多拥有两个影子，超出的影子会覆盖掉最早的影子。',
                        '影子与回溯锚点绑定，你可以设立新的时间锚点，旧的以及其绑定的影子则会消失。',
                      ]
                      : [
                        'Use arrow keys to move your character and reach the exit.',
                        'Your shadow repeats your previous path after a rewind.',
                        'You can have up to 2 shadows. New rewinds overwrite the oldest.',
                        'Shadows are tied to anchors. Setting a new anchor removes old shadows.',
                      ]
                    ).map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 快捷键 */}
                <div>
                  <div className="grid grid-cols-2 gap-1.5 p-3 bg-white/[0.03] rounded-2xl">
                    {(language === 'zh'
                      ? [
                        ['↑↓←→', '移动角色'],
                        ['Space', '原地等待'],
                        ['E', '时间回溯'],
                        ['F', '设立锚点'],
                        ['Q', '撤销一步'],
                        ['Delete', '重置关卡'],
                      ]
                      : [
                        ['↑↓←→', 'Move'],
                        ['Space', 'Wait'],
                        ['E', 'Rewind'],
                        ['F', 'Set Anchor'],
                        ['Q', 'Undo'],
                        ['Delete', 'Reset'],
                      ]
                    ).map(([key, desc]) => (
                      <div key={key} className="flex items-center gap-2 py-1">
                        <span className="kbd shrink-0">{key}</span>
                        <span className="text-[11px] text-slate-400">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <button
                onClick={handleDontShowAgain}
                className="text-[11px] text-slate-500 hover:text-slate-400 transition text-center mt-1"
              >
                {language === 'zh' ? '不再提醒' : "Don't show again"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === 设置弹窗 === */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="modal-card max-w-md w-full p-6 flex flex-col gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 pb-3">
                <Settings className="w-5 h-5 text-brand-purple animate-spin" style={{ animationDuration: '8s' }} />
                <h3 className="text-base font-extrabold tracking-wide uppercase text-white">{t.settingsTitle}</h3>
              </div>

              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2 bg-white/[0.03] p-1 rounded-2xl">
                  <button onClick={() => { setLanguage('zh'); sound.playMove(); }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition ${language === 'zh' ? 'bg-brand-purple text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>简体中文</button>
                  <button onClick={() => { setLanguage('en'); sound.playMove(); }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition ${language === 'en' ? 'bg-brand-purple text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>English</button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{language === 'zh' ? '模式' : 'Mode'}</span>
                <div className="grid grid-cols-3 gap-2 bg-white/[0.03] p-1 rounded-2xl">
                  <button onClick={() => { setCreativeMode(false); setDevMode(false); sound.playMove(); }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition ${!creativeMode && !devMode ? 'bg-emerald-500/20 text-emerald-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    {language === 'zh' ? '闯关' : 'Campaign'}
                  </button>
                  <button onClick={() => { setDevMode(true); setCreativeMode(false); sound.playMove(); }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition ${devMode && !creativeMode ? 'bg-yellow-500/20 text-yellow-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    {language === 'zh' ? '选关' : 'Select'}
                  </button>
                  <button onClick={() => {
                    setCreativeMode(true);
                    setDevMode(false);
                    if (!customGrid) {
                      const saved = localStorage.getItem('chrono_custom_grid');
                      if (saved) {
                        try { setCustomGrid(JSON.parse(saved)); } catch {}
                      } else {
                        setCustomGrid(Array.from({ length: gridRows }, () => Array(gridCols).fill('.')));
                      }
                    }
                    sound.playMove();
                  }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition ${creativeMode ? 'bg-indigo-500/20 text-indigo-400 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                    {language === 'zh' ? '创意' : 'Create'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 bg-white/[0.03] p-3 rounded-2xl">
                  <button onClick={() => { setMuted(!muted); sound.playMove(); }}
                    className={`p-2.5 rounded-xl transition ${muted ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <span className="text-xs font-bold text-slate-200">{muted ? t.audioOff : t.audioOn}</span>
                </div>
              </div>

              <button onClick={() => setShowSettings(false)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl text-xs font-bold transition active:scale-[0.98]">
                {t.closeBtn}
              </button>

              <div className="text-[9px] text-slate-600 leading-relaxed text-center px-2 select-text">
                {language === 'zh'
                  ? '如果你自制的地图足够有创意，可以加作者微信：Ch13025297643并分享地图码，作者会考虑将其加入游戏中，后续会增加地图贴图，祝你游玩愉快'
                  : 'If your custom map is creative enough, add the author on WeChat: Ch13025297643 and share your map code. The author will consider adding it to the game. More map textures coming soon. Enjoy the game!'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === 胜利弹窗 === */}
      <AnimatePresence>
        {levelCompleted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              className="modal-card max-w-md w-full p-8 flex flex-col items-center text-center gap-5 shadow-[0_0_60px_rgba(16,185,129,0.12)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 bg-emerald-500 rounded-full text-[#111827] animate-bounce shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                <Sparkles className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-black bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-200 bg-clip-text text-transparent uppercase tracking-wider">
                  {t.victoryTitle}
                </h3>
              </div>

              <div className="w-full bg-white/[0.03] rounded-2xl p-4 text-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t.victorySubtitle}</span>
                <div className="text-xl font-black text-slate-200 mt-1">
                  {language === 'zh' ? `第 ${levelIndex + 1} 关` : `Level ${levelIndex + 1}`}
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-3 mt-1">
                <button
                  onClick={() => { setLevelCompleted(false); handleResetLevel(); }}
                  className="py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition active:scale-[0.98] uppercase"
                >{t.replayBtn}</button>
                {levelIndex < LEVELS.length - 1 ? (
                  <button onClick={() => changeLevel(levelIndex + 1)}
                    className="py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold hover:brightness-110 transition active:scale-[0.98] shadow-lg flex items-center justify-center gap-1.5 uppercase">
                    <span>{t.nextBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => changeLevel(0)}
                    className="py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-brand-purple text-white text-xs font-bold hover:brightness-110 transition active:scale-[0.98] shadow-lg uppercase">
                    {t.returnBtn}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
