import type { Middleware, MiddlewareRegistry } from './types'

export class DefaultMiddlewareRegistry implements MiddlewareRegistry {
  private middlewares = new Map<string, Middleware>()

  register(middleware: Middleware): void {
    if (this.middlewares.has(middleware.id)) {
      throw new Error(`Middleware with id '${middleware.id}' already registered`)
    }
    this.middlewares.set(middleware.id, middleware)
  }

  unregister(id: string): void {
    this.middlewares.delete(id)
  }

  resolve(id: string): Middleware | undefined {
    return this.middlewares.get(id)
  }

  getAll(): Middleware[] {
    return Array.from(this.middlewares.values())
  }

  clear(): void {
    this.middlewares.clear()
  }
}
