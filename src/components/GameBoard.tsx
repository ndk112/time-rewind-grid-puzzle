import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Position, Shadow, Level } from '../types';
import { parseGridCell, getColorConfig, equalPositions } from '../utils';
import { User, Lock, LogIn } from 'lucide-react';

interface GameBoardProps {
  level: Level;
  playerPos: Position;
  shadows: Shadow[];
  currentStep: number;
  activeButtons: Set<string>;
  rewindAnchor: Position;
  pendingTeleport: Position | null;
  editable?: boolean;
  onCellEdit?: (row: number, col: number) => void;
  gridWidth?: string;
  hideGridLines?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  level,
  playerPos,
  shadows,
  currentStep,
  activeButtons,
  rewindAnchor,
  pendingTeleport,
  editable,
  onCellEdit,
  gridWidth = '50vw',
  hideGridLines,
}) => {
  const rows = level.grid.length;
  const cols = level.grid[0].length;

  const getShadowsAt = (r: number, c: number): Shadow[] => {
    return shadows.filter((s) => {
      const stepPos = s.path[Math.min(currentStep, s.path.length - 1)];
      return stepPos && stepPos.row === r && stepPos.col === c;
    });
  };

  const isDraggingRef = useRef(false);

  const handleCellPointer = (r: number, c: number) => {
    if (!editable || !onCellEdit) return;
    onCellEdit(r, c);
  };

  return (
    <div className="relative w-full overflow-hidden p-4 sm:p-5">
      <div className="relative flex flex-col items-center">
        <div
          id="puzzle-grid-container"
          className="sleek-grid-container grid p-2 select-none max-w-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            width: gridWidth,
            maxWidth: '900px',
            gap: '0.45vw',
          }}
          onPointerDown={editable ? () => { isDraggingRef.current = true; } : undefined}
          onPointerUp={editable ? () => { isDraggingRef.current = false; } : undefined}
          onPointerLeave={editable ? () => { isDraggingRef.current = false; } : undefined}
        >
          {level.grid.map((rowArr, rIdx) => {
            return rowArr.map((cellCode, cIdx) => {
              const tile = parseGridCell(cellCode);
              const isPlayerHere = playerPos.row === rIdx && playerPos.col === cIdx;
              const shadowsHere = getShadowsAt(rIdx, cIdx);
              const colorCfg = getColorConfig(tile.id);

              let cellStyle = 'relative aspect-square flex items-center justify-center sleek-cell transition-all duration-200 ';
              let cellContent: React.ReactNode = null;
              let customStyle: React.CSSProperties = {};

              switch (tile.type) {
                case 'wall':
                  cellStyle += 'sleek-wall ';
                  break;

                case 'start':
                  cellStyle += 'text-orange-400 bg-[#0f172a]/90';
                  cellContent = (
                    <div className="flex flex-col items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-[2.8vw] max-w-[28px] h-[2.8vw] max-h-[28px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="currentColor" className="text-orange-400" opacity="0.9" />
                        <circle cx="12" cy="10" r="3" fill="#0f172a" stroke="none" />
                      </svg>
                    </div>
                  );
                  break;

                case 'exit':
                  cellStyle += 'text-teal-400 bg-[#0f172a]/90';
                  cellContent = (
                    <div className="flex flex-col items-center justify-center">
                      <LogIn className="w-[2.8vw] max-w-[28px] h-[2.8vw] max-h-[28px] text-teal-400/80 animate-pulse" />
                      <span className="text-[0.7vw] font-bold text-teal-400/50 tracking-wider mt-0.5 hidden sm:block">EXIT</span>
                    </div>
                  );
                  break;

                case 'button':
                  const isPressed = activeButtons.has(tile.id || '');
                  const buttonHex = colorCfg?.theme || '#f59e0b';
                  cellContent = (
                    <div className="flex items-center justify-center w-full h-full">
                      <motion.div
                        className="w-[80%] h-[80%] flex flex-col items-center justify-center text-white font-black transition-all"
                        style={isPressed ? {
                          backgroundColor: buttonHex,
                          boxShadow: `0 0 28px ${buttonHex}, 0 0 8px ${buttonHex}66, inset 0 0 4px rgba(255,255,255,0.8)`,
                          borderRadius: '50%'
                        } : {
                          backgroundColor: `${buttonHex}22`,
                          boxShadow: `inset 0 0 12px ${buttonHex}44, 0 0 8px ${buttonHex}22`,
                          borderRadius: '50%'
                        }}
                        animate={{ scale: isPressed ? 0.9 : 1 }}
                      >
                        <span className="text-[clamp(10px,1.1vw,15px)] leading-none font-bold text-white drop-shadow">{`B${tile.id}`}</span>
                      </motion.div>
                    </div>
                  );
                  break;

                case 'door':
                  const isDefaultOpen = tile.defaultOpen || false;
                  const isOpen = activeButtons.has(tile.id || '') ? !isDefaultOpen : isDefaultOpen;
                  const doorHex = colorCfg?.theme || '#ef4444';
                  
                  if (isOpen) {
                    customStyle = {
                      backgroundColor: `${doorHex}0D`,
                      opacity: 0.4,
                      boxShadow: `inset 0 0 8px ${doorHex}22`
                    };
                    cellContent = (
                      <span className="text-[clamp(7px,0.7vw,10px)] font-medium text-slate-500">
                        {`D${tile.id}`}
                      </span>
                    );
                  } else {
                    customStyle = {
                      background: `repeating-linear-gradient(90deg, ${doorHex}, ${doorHex} 4px, #0f172a 4px, #0f172a 8px)`,
                      opacity: 0.95,
                      boxShadow: `0 0 12px ${doorHex}55, inset 0 0 6px rgba(0,0,0,0.5)`
                    };
                    cellContent = (
                      <div className="flex flex-col items-center justify-center w-full h-full relative">
                        <Lock className="w-[2.5vw] max-w-[22px] h-[2.5vw] max-h-[22px] text-slate-100" style={{ filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.9))' }} />
                        <span className="absolute bottom-[8%] text-[clamp(6px,0.65vw,9px)] font-bold text-slate-100" style={{ filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.9))' }}>
                          {`D${tile.id}`}
                        </span>
                      </div>
                    );
                  }
                  break;

                case 'teleport':
                  cellStyle += 'bg-indigo-950/40';
                  cellContent = (
                    <div className="flex items-center justify-center w-full h-full">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                        className="w-[80%] h-[80%] rounded-full border-2 border-dashed border-indigo-400/60 flex items-center justify-center"
                      >
                        <span className="text-[clamp(16px,1.8vw,28px)] text-indigo-300 font-black">?</span>
                      </motion.div>
                    </div>
                  );
                  break;

                default:
                  cellStyle += 'hover:bg-[#1e293b]/30';
              }

              if (editable && !hideGridLines) {
                cellStyle += ' border border-indigo-500/10 hover:border-indigo-400/30 ';
              }

              const isAnchorHere = rewindAnchor && rewindAnchor.row === rIdx && rewindAnchor.col === cIdx;
              const isTeleporting = pendingTeleport && pendingTeleport.row === rIdx && pendingTeleport.col === cIdx && tile.type === 'teleport';

              return (
                <div key={`${rIdx}-${cIdx}`} className={cellStyle} style={customStyle} id={`tile-${rIdx}-${cIdx}`}
                  onPointerDown={editable ? () => handleCellPointer(rIdx, cIdx) : undefined}
                  onPointerEnter={editable ? () => { if (isDraggingRef.current) handleCellPointer(rIdx, cIdx); } : undefined}
                >
                  {cellContent}

                  {isAnchorHere && (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                      transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                      className="absolute inset-[8%] rounded-full bg-[#a855f7]/15 flex items-center justify-center pointer-events-none z-10 shadow-[0_0_12px_rgba(168,85,247,0.35)]"
                    >
                      <span className="w-[12%] h-[12%] rounded-full bg-[#06b6d4] shadow-[0_0_10px_#06b6d4] animate-pulse" />
                    </motion.div>
                  )}

                  {isTeleporting && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.5, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-lg bg-indigo-500/20 flex items-center justify-center pointer-events-none z-10 shadow-[0_0_20px_rgba(99,102,241,0.6)]"
                    >
                      <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest animate-pulse">传送中</span>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {shadowsHere.map((shadow) => {
                      return (
                        <motion.div
                          key={`shadow-${shadow.id}`}
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 0.9, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.6 }}
                          transition={{ type: 'spring', damping: 15 }}
                          className="absolute sleek-shadow w-[80%] h-[80%] flex items-center justify-center z-20"
                          style={{
                            boxShadow: `0 0 18px ${shadow.color}88, 0 0 6px ${shadow.color}44`,
                            backgroundColor: `${shadow.color}30`,
                          }}
                        >
                          <motion.div
                            animate={{ opacity: [0.75, 1, 0.75] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="flex flex-col items-center"
                          >
                            <User className="w-[2.8vw] max-w-[26px] h-[2.8vw] max-h-[26px]" style={{ color: shadow.color }} />
                          </motion.div>
                        </motion.div>
                      );
                    })}

                    {isPlayerHere && (
                      <motion.div
                        layoutId="active-player"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                        className="absolute sleek-player w-[80%] h-[80%] flex flex-col items-center justify-center z-30 cursor-pointer"
                      >
                        <User className="w-[3vw] max-w-[28px] h-[3vw] max-h-[28px] text-white" />
                        <span className="absolute inset-0 rounded-full shadow-[0_0_12px_rgba(96,165,250,0.6)] animate-ping opacity-20 pointer-events-none" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
};
