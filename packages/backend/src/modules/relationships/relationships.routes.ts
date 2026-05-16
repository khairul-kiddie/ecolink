import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import * as controller from './relationships.controller';

const router = Router();

router.use(authenticate);

router.get('/', controller.listRelationships);
router.post('/', authorize(['SUPER_ADMIN', 'PROGRAMME_OWNER', 'ECOSYSTEM_ADMIN']), controller.createRelationship);
router.get('/:id', controller.getRelationship);
router.patch('/:id/status', controller.updateStatus);
router.post('/:id/engagement-logs', controller.addEngagementLog);
router.get('/:id/messages', controller.getMessages);
router.post('/:id/messages', controller.sendMessage);

export { router as relationshipsRouter };
