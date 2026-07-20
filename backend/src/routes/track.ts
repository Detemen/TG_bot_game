// Track generation API endpoints

import type { FastifyPluginAsync } from 'fastify';
import { generateTrackLayout, validateTrackLayout } from '../services/track-generator.js';
import type { TrackGenerationOptions } from '../types/track.js';

export const trackRoutes: FastifyPluginAsync = async (fastify) => {
  // Generate a new track from seed
  fastify.post<{
    Body: TrackGenerationOptions;
  }>('/api/track/generate', async (request, reply) => {
    const { seed, width, height, difficulty, obstacleCount } = request.body;

    if (!seed || !width || !height) {
      return reply.code(400).send({
        error: 'Missing required parameters: seed, width, height',
      });
    }

    try {
      const layout = generateTrackLayout({
        seed,
        width,
        height,
        difficulty: difficulty || 'medium',
        obstacleCount,
      });

      if (!validateTrackLayout(layout)) {
        return reply.code(500).send({
          error: 'Generated track failed validation',
        });
      }

      return reply.send(layout);
    } catch (error) {
      fastify.log.error(error, 'Failed to generate track');
      return reply.code(500).send({
        error: 'Failed to generate track',
      });
    }
  });

  // Get track by seed (deterministic)
  fastify.get<{
    Querystring: {
      seed: string;
      width?: string;
      height?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
    };
  }>('/api/track', async (request, reply) => {
    const { seed, width, height, difficulty } = request.query;

    if (!seed) {
      return reply.code(400).send({
        error: 'Missing required parameter: seed',
      });
    }

    const trackWidth = width ? parseInt(width, 10) : 390;
    const trackHeight = height ? parseInt(height, 10) : 900;

    try {
      const layout = generateTrackLayout({
        seed,
        width: trackWidth,
        height: trackHeight,
        difficulty: difficulty || 'medium',
      });

      return reply.send(layout);
    } catch (error) {
      fastify.log.error(error, 'Failed to get track');
      return reply.code(500).send({
        error: 'Failed to get track',
      });
    }
  });
};
