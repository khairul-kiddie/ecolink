import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export const geminiPro = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
export const geminiFlash = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
export const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
