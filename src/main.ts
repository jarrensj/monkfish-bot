import { startBot } from './bot/index';
import { startHealthServer } from './web/health';

startHealthServer();
startBot();
