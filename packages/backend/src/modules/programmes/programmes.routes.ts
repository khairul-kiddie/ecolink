import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { aiMatchingLimiter } from '../../middleware/rateLimit.middleware';
import * as controller from './programmes.controller';

const router = Router();

router.get('/', controller.listProgrammes);
router.get('/:id', controller.getProgramme);
router.post('/', authenticate, authorize(['PROGRAMME_OWNER', 'SUPER_ADMIN', 'ECOSYSTEM_ADMIN']), controller.createProgramme);
router.patch('/:id', authenticate, authorize(['PROGRAMME_OWNER', 'SUPER_ADMIN', 'ECOSYSTEM_ADMIN']), controller.updateProgramme);
router.delete('/:id', authenticate, authorize(['PROGRAMME_OWNER', 'SUPER_ADMIN']), controller.deleteProgramme);
router.post('/:id/applications', authenticate, authorize(['COMPANY_REP']), controller.applyToProgramme);
router.get('/:id/applications', authenticate, authorize(['PROGRAMME_OWNER', 'SUPER_ADMIN', 'ECOSYSTEM_ADMIN']), controller.listApplications);
router.patch('/:id/applications/:appId', authenticate, authorize(['PROGRAMME_OWNER', 'SUPER_ADMIN', 'ECOSYSTEM_ADMIN']), controller.reviewApplication);
router.post('/:id/trigger-matching', authenticate, authorize(['PROGRAMME_OWNER', 'SUPER_ADMIN', 'ECOSYSTEM_ADMIN']), aiMatchingLimiter, controller.triggerMatching);

export { router as programmesRouter };
