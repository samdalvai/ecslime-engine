import { RAFLoopStrategy } from 'ecslime-engine';

import Game from './Game';

const game = new Game();
game.setLoopStrategy(new RAFLoopStrategy(game));
game.run();
