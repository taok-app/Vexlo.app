import { RuntimeStage } from '@/lib/research/runtime/types'
import { DEFAULT_RETRY_POLICY } from '@/lib/research/runtime/retry'
import type { WorkflowDefinition } from './types'
import { WorkflowBuilder } from './builder'

export class WorkflowPresets {
  static quickResearch(): WorkflowDefinition {
    return WorkflowBuilder.create()
      .setId('quick-research')
      .setName('Quick Research')
      .setDescription('Fast research workflow with minimal retries and short timeouts')
      .setVersion('1.0.0')
      .addStage({
        id: 'planning',
        name: 'Planning',
        runtimeStage: RuntimeStage.PLANNING,
        dependencies: [],
        timeout: 30000,
        retryPolicy: { maxAttempts: 1, initialDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2 },
        enabled: true,
      })
      .addStage({
        id: 'searching',
        name: 'Searching',
        runtimeStage: RuntimeStage.SEARCHING,
        dependencies: ['planning'],
        timeout: 60000,
        retryPolicy: { maxAttempts: 2, initialDelayMs: 500, maxDelayMs: 5000, backoffMultiplier: 1.5 },
        enabled: true,
      })
      .addStage({
        id: 'browsing',
        name: 'Browsing',
        runtimeStage: RuntimeStage.BROWSING,
        dependencies: ['searching'],
        timeout: 120000,
        retryPolicy: { maxAttempts: 2, initialDelayMs: 1000, maxDelayMs: 10000, backoffMultiplier: 2 },
        enabled: true,
      })
      .addStage({
        id: 'graph-building',
        name: 'Graph Building',
        runtimeStage: RuntimeStage.GRAPH_BUILDING,
        dependencies: ['browsing'],
        timeout: 30000,
        retryPolicy: DEFAULT_RETRY_POLICY,
        enabled: true,
      })
      .build()
  }

  static standardResearch(): WorkflowDefinition {
    return WorkflowBuilder.create()
      .setId('standard-research')
      .setName('Standard Research')
      .setDescription('Balanced research workflow with moderate retries and timeouts')
      .setVersion('1.0.0')
      .addStage({
        id: 'planning',
        name: 'Planning',
        runtimeStage: RuntimeStage.PLANNING,
        dependencies: [],
        timeout: 60000,
        retryPolicy: DEFAULT_RETRY_POLICY,
        enabled: true,
      })
      .addStage({
        id: 'searching',
        name: 'Searching',
        runtimeStage: RuntimeStage.SEARCHING,
        dependencies: ['planning'],
        timeout: 120000,
        retryPolicy: DEFAULT_RETRY_POLICY,
        enabled: true,
      })
      .addStage({
        id: 'browsing',
        name: 'Browsing',
        runtimeStage: RuntimeStage.BROWSING,
        dependencies: ['searching'],
        timeout: 300000,
        retryPolicy: DEFAULT_RETRY_POLICY,
        enabled: true,
      })
      .addStage({
        id: 'reasoning',
        name: 'Reasoning',
        runtimeStage: RuntimeStage.REASONING,
        dependencies: ['browsing'],
        timeout: 180000,
        retryPolicy: DEFAULT_RETRY_POLICY,
        enabled: false,
        condition: () => true,
      })
      .addStage({
        id: 'graph-building',
        name: 'Graph Building',
        runtimeStage: RuntimeStage.GRAPH_BUILDING,
        dependencies: ['browsing'],
        timeout: 60000,
        retryPolicy: DEFAULT_RETRY_POLICY,
        enabled: true,
      })
      .build()
  }

  static deepResearch(): WorkflowDefinition {
    return WorkflowBuilder.create()
      .setId('deep-research')
      .setName('Deep Research')
      .setDescription('Comprehensive research workflow with aggressive retries and long timeouts')
      .setVersion('1.0.0')
      .addStage({
        id: 'planning',
        name: 'Planning',
        runtimeStage: RuntimeStage.PLANNING,
        dependencies: [],
        timeout: 120000,
        retryPolicy: { maxAttempts: 5, initialDelayMs: 2000, maxDelayMs: 60000, backoffMultiplier: 2 },
        enabled: true,
      })
      .addStage({
        id: 'searching',
        name: 'Searching',
        runtimeStage: RuntimeStage.SEARCHING,
        dependencies: ['planning'],
        timeout: 240000,
        retryPolicy: { maxAttempts: 5, initialDelayMs: 2000, maxDelayMs: 60000, backoffMultiplier: 2 },
        enabled: true,
      })
      .addStage({
        id: 'browsing',
        name: 'Browsing',
        runtimeStage: RuntimeStage.BROWSING,
        dependencies: ['searching'],
        timeout: 600000,
        retryPolicy: { maxAttempts: 5, initialDelayMs: 2000, maxDelayMs: 60000, backoffMultiplier: 2 },
        enabled: true,
      })
      .addStage({
        id: 'reasoning',
        name: 'Reasoning',
        runtimeStage: RuntimeStage.REASONING,
        dependencies: ['browsing'],
        timeout: 300000,
        retryPolicy: { maxAttempts: 5, initialDelayMs: 2000, maxDelayMs: 60000, backoffMultiplier: 2 },
        enabled: true,
      })
      .addStage({
        id: 'graph-building',
        name: 'Graph Building',
        runtimeStage: RuntimeStage.GRAPH_BUILDING,
        dependencies: ['reasoning'],
        timeout: 120000,
        retryPolicy: DEFAULT_RETRY_POLICY,
        enabled: true,
      })
      .build()
  }
}
