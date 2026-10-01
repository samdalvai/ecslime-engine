import { RAFLoopStrategy } from '../../src';
import Editor from './Editor';

const editor = new Editor();
editor.setLoopStrategy(new RAFLoopStrategy(editor));
editor.run();
