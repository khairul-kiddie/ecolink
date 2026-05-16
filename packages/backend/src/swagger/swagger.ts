import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EcoLink API',
      version: '1.0.0',
      description: 'AI-Powered Ecosystem Relationship Management Platform — MyHack 2026',
      contact: { name: 'EcoLink Team' },
    },
    servers: [{ url: '/api/v1', description: 'API v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      responses: {
        Unauthorized: { description: 'Authentication required' },
        Forbidden: { description: 'Insufficient permissions' },
        NotFound: { description: 'Resource not found' },
        ValidationError: { description: 'Validation failed' },
        RateLimited: { description: 'Rate limit exceeded' },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Programmes', description: 'Programme management' },
      { name: 'Relationships', description: 'Relationship lifecycle management' },
      { name: 'Matching', description: 'AI matching engine' },
      { name: 'Analytics', description: 'Dashboard and analytics' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
