import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { aiMatchingLimiter } from '../../middleware/rateLimit.middleware';
import * as controller from './matching.controller';

const router = Router();

router.use(authenticate);

router.get('/proposals', controller.listProposals);
router.post('/find-mentors/:companyId', authorize(['SUPER_ADMIN', 'PROGRAMME_OWNER', 'ECOSYSTEM_ADMIN']), aiMatchingLimiter, controller.findMentors);
router.post('/proposals/:id/accept', controller.acceptProposal);
router.post('/proposals/:id/reject', controller.rejectProposal);

export { router as matchingRouter };
