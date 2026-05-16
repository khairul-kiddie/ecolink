import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger/swagger';
import { authRouter } from './modules/auth/auth.routes';
import { programmesRouter } from './modules/programmes/programmes.routes';
import { relationshipsRouter } from './modules/relationships/relationships.routes';
import { matchingRouter } from './modules/matching/matching.routes';
import { analyticsRouter } from './modules/analytics/analytics.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { env } from './config/env';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/programmes', programmesRouter);
app.use('/api/v1/relationships', relationshipsRouter);
app.use('/api/v1/matching', matchingRouter);
app.use('/api/v1/analytics', analyticsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
