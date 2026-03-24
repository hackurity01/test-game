// 드래곤볼 로그라이트 - Phaser.js 진입점

import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';
import { MapScene } from './scenes/MapScene';
import { RewardScene } from './scenes/RewardScene';
import { ResultScene } from './scenes/ResultScene';
import { GameState } from './game/GameState';

/** 게임 설정 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,  // WebGL 우선, Canvas 폴백
  width: 1600,
  height: 900,
  backgroundColor: '#0a0a1e',
  parent: 'game-container',
  scene: [
    MapScene,      // 첫 씬: 맵 (층 선택)
    BattleScene,   // 전투 씬
    RewardScene,   // 보상 씬
    ResultScene,   // 런 결과 씬
  ],
  render: {
    antialias: false,
    pixelArt: false,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1600,
    height: 900,
    min: { width: 800, height: 450 },
    max: { width: 1920, height: 1080 },
  },
};

/** 게임 초기화 */
const game = new Phaser.Game(config);

// 초기 런 시작
const gameState = GameState.getInstance();
gameState.startNewRun();

export default game;
