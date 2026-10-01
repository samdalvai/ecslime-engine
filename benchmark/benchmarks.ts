import { runModified, runModifiedSteadyFrame, runOriginal, runOriginalSteadyFrame } from './functions';
import { benchmark } from './registry';

benchmark('world lifecycle (current automatic sync)', runModified);
benchmark('world lifecycle (original manual sync)', runOriginal);
// benchmark('steady frame (current automatic sync)', runModifiedSteadyFrame);
// benchmark('steady frame (original manual sync)', runOriginalSteadyFrame);
