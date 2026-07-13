import { describe, it, expect, vi } from 'vitest'
import { RuntimeStage } from '@/lib/research/runtime/types'
import { WorkflowBuilder } from '@/lib/research/workflow/builder'
import { WorkflowValidator } from '@/lib/research/workflow/validator'
import { WorkflowPipeline } from '@/lib/research/workflow/pipeline'
import { DefaultStageRegistry } from '@/lib/research/workflow/registry'
import { WorkflowPresets } from '@/lib/research/workflow/presets'

describe('Workflow Definition Layer', () => {
  describe('WorkflowBuilder', () => {
    it('should build a valid workflow', () => {
      const workflow = WorkflowBuilder.create()
        .setId('test-workflow')
        .setName('Test Workflow')
        .addStage({
          id: 'stage1',
          name: 'Stage 1',
          runtimeStage: RuntimeStage.PLANNING,
          dependencies: [],
          timeout: 60000,
          enabled: true,
        })
        .build()

      expect(workflow.id).toBe('test-workflow')
      expect(workflow.name).toBe('Test Workflow')
      expect(workflow.stages).toHaveLength(1)
      expect(workflow.readonly).toBe(true)
    })

    it('should throw on missing id', () => {
      expect(() => {
        WorkflowBuilder.create()
          .setName('Test')
          .addStage({
            id: 'stage1',
            name: 'Stage 1',
            runtimeStage: RuntimeStage.PLANNING,
            dependencies: [],
            timeout: 60000,
          })
          .build()
      }).toThrow('Workflow must have an id')
    })

    it('should throw on missing stages', () => {
      expect(() => {
        WorkflowBuilder.create().setId('test').setName('Test').build()
      }).toThrow('Workflow must have at least one stage')
    })

    it('should allow fluent API', () => {
      const builder = WorkflowBuilder.create()
        .setId('test')
        .setName('Test')
        .setVersion('2.0.0')
        .setDescription('Test workflow')

      expect(builder).toBeDefined()
    })

    it('should clone builder', () => {
      const original = WorkflowBuilder.create().setId('original').setName('Original').addStage({
        id: 'stage1',
        name: 'Stage 1',
        runtimeStage: RuntimeStage.PLANNING,
        dependencies: [],
        timeout: 60000,
      })

      const cloned = original.clone()
      cloned.setId('cloned').setName('Cloned')

      expect(original.getStages()).toHaveLength(1)
      expect(cloned.getStages()).toHaveLength(1)
    })
  })

  describe('WorkflowValidator', () => {
    it('should validate correct workflow', () => {
      const workflow = WorkflowBuilder.create()
        .setId('valid')
        .setName('Valid')
        .addStage({
          id: 'stage1',
          name: 'Stage 1',
          runtimeStage: RuntimeStage.PLANNING,
          dependencies: [],
          timeout: 60000,
        })
        .build()

      const validator = new WorkflowValidator()
      const result = validator.validate(workflow)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect duplicate stage ids', () => {
      const workflow: any = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        stages: [
          {
            id: 'stage1',
            name: 'Stage 1',
            runtimeStage: RuntimeStage.PLANNING,
            dependencies: [],
            timeout: 60000,
          },
          {
            id: 'stage1',
            name: 'Stage 1 Duplicate',
            runtimeStage: RuntimeStage.SEARCHING,
            dependencies: [],
            timeout: 60000,
          },
        ],
      }

      const validator = new WorkflowValidator()
      const result = validator.validate(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true)
    })

    it('should detect missing dependencies', () => {
      const workflow: any = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        stages: [
          {
            id: 'stage1',
            name: 'Stage 1',
            runtimeStage: RuntimeStage.PLANNING,
            dependencies: ['nonexistent'],
            timeout: 60000,
          },
        ],
      }

      const validator = new WorkflowValidator()
      const result = validator.validate(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('does not exist'))).toBe(true)
    })

    it('should detect cycles', () => {
      const workflow: any = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        stages: [
          {
            id: 'stage1',
            name: 'Stage 1',
            runtimeStage: RuntimeStage.PLANNING,
            dependencies: ['stage2'],
            timeout: 60000,
          },
          {
            id: 'stage2',
            name: 'Stage 2',
            runtimeStage: RuntimeStage.SEARCHING,
            dependencies: ['stage1'],
            timeout: 60000,
          },
        ],
      }

      const validator = new WorkflowValidator()
      const result = validator.validate(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Cyclic'))).toBe(true)
    })

    it('should validate timeout constraints', () => {
      const workflow: any = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        stages: [
          {
            id: 'stage1',
            name: 'Stage 1',
            runtimeStage: RuntimeStage.PLANNING,
            dependencies: [],
            timeout: 500, // Invalid: less than 1000ms
          },
        ],
      }

      const validator = new WorkflowValidator()
      const result = validator.validate(workflow)

      expect(result.valid).toBe(false)
    })
  })

  describe('WorkflowPipeline', () => {
    it('should create pipeline with valid workflow', () => {
      const workflow = WorkflowBuilder.create()
        .setId('test')
        .setName('Test')
        .addStage({
          id: 'stage1',
          name: 'Stage 1',
          runtimeStage: RuntimeStage.PLANNING,
          dependencies: [],
          timeout: 60000,
        })
        .build()

      const registry = new DefaultStageRegistry()
      const pipeline = new WorkflowPipeline(workflow, registry)

      expect(pipeline.getStages()).toHaveLength(1)
    })

    it('should resolve execution order', () => {
      const workflow = WorkflowBuilder.create()
        .setId('test')
        .setName('Test')
        .addStage({
          id: 'planning',
          name: 'Planning',
          runtimeStage: RuntimeStage.PLANNING,
          dependencies: [],
          timeout: 60000,
        })
        .addStage({
          id: 'searching',
          name: 'Searching',
          runtimeStage: RuntimeStage.SEARCHING,
          dependencies: ['planning'],
          timeout: 60000,
        })
        .addStage({
          id: 'browsing',
          name: 'Browsing',
          runtimeStage: RuntimeStage.BROWSING,
          dependencies: ['searching'],
          timeout: 60000,
        })
        .build()

      const registry = new DefaultStageRegistry()
      const pipeline = new WorkflowPipeline(workflow, registry)

      const order = pipeline.getExecutionOrder({
        stageResults: {},
        input: {},
        timestamp: Date.now(),
      })

      expect(order).toEqual(['planning', 'searching', 'browsing'])
    })

    it('should get enabled stages', () => {
      const workflow = WorkflowBuilder.create()
        .setId('test')
        .setName('Test')
        .addStage({
          id: 'stage1',
          runtimeStage: RuntimeStage.PLANNING,
          dependencies: [],
          timeout: 60000,
          enabled: true,
        })
        .addStage({
          id: 'stage2',
          runtimeStage: RuntimeStage.SEARCHING,
          dependencies: [],
          timeout: 60000,
          enabled: false,
        })
        .build()

      const registry = new DefaultStageRegistry()
      const pipeline = new WorkflowPipeline(workflow, registry)

      expect(pipeline.getEnabledStages()).toHaveLength(1)
      expect(pipeline.getDisabledStages()).toHaveLength(1)
    })

    it('should resolve stage handler', () => {
      const workflow = WorkflowBuilder.create()
        .setId('test')
        .setName('Test')
        .addStage({
          id: 'stage1',
          runtimeStage: RuntimeStage.PLANNING,
          dependencies: [],
          timeout: 60000,
        })
        .build()

      const registry = new DefaultStageRegistry()
      const handler = { execute: vi.fn() }
      registry.register('stage1', handler)

      const pipeline = new WorkflowPipeline(workflow, registry)
      const resolved = pipeline.resolveStageHandler('stage1')

      expect(resolved).toBe(handler)
    })
  })

  describe('DefaultStageRegistry', () => {
    it('should register handlers', () => {
      const registry = new DefaultStageRegistry()
      const handler = { execute: vi.fn() }

      registry.register('stage1', handler)

      expect(registry.has('stage1')).toBe(true)
    })

    it('should resolve registered handlers', () => {
      const registry = new DefaultStageRegistry()
      const handler = { execute: vi.fn() }

      registry.register('stage1', handler)
      const resolved = registry.resolve('stage1')

      expect(resolved).toBe(handler)
    })

    it('should throw on unregistered handler', () => {
      const registry = new DefaultStageRegistry()

      expect(() => registry.resolve('nonexistent')).toThrow()
    })

    it('should get all handlers', () => {
      const registry = new DefaultStageRegistry()
      const handler1 = { execute: vi.fn() }
      const handler2 = { execute: vi.fn() }

      registry.register('stage1', handler1)
      registry.register('stage2', handler2)

      const all = registry.getAll()
      expect(all.size).toBe(2)
    })
  })

  describe('WorkflowPresets', () => {
    it('should load quick research preset', () => {
      const workflow = WorkflowPresets.quickResearch()

      expect(workflow.id).toBe('quick-research')
      expect(workflow.stages.some((s) => s.id === 'planning')).toBe(true)
      expect(workflow.stages.every((s) => s.timeout <= 120000)).toBe(true)
    })

    it('should load standard research preset', () => {
      const workflow = WorkflowPresets.standardResearch()

      expect(workflow.id).toBe('standard-research')
      expect(workflow.stages).toHaveLength(5)
    })

    it('should load deep research preset', () => {
      const workflow = WorkflowPresets.deepResearch()

      expect(workflow.id).toBe('deep-research')
      expect(workflow.stages.some((s) => s.timeout > 240000)).toBe(true)
    })

    it('presets should be valid', () => {
      const validator = new WorkflowValidator()

      const quickResult = validator.validate(WorkflowPresets.quickResearch())
      const standardResult = validator.validate(WorkflowPresets.standardResearch())
      const deepResult = validator.validate(WorkflowPresets.deepResearch())

      expect(quickResult.valid).toBe(true)
      expect(standardResult.valid).toBe(true)
      expect(deepResult.valid).toBe(true)
    })
  })
})
