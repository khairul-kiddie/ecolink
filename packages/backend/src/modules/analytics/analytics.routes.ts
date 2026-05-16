import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as controller from './analytics.controller';

const router = Router();

router.use(authenticate);
router.get('/dashboard', controller.getDashboard);
router.get('/matching-effectiveness', controller.getMatchingEffectiveness);
router.get('/ecosystem-graph', controller.getEcosystemGraph);

export { router as analyticsRouter };
