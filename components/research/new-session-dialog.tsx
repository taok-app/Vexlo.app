'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface NewSessionDialogProps {
  open: boolean
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { title?: string; query: string }) => void
}

export function NewSessionDialog({ open, isPending, onOpenChange, onSubmit }: NewSessionDialogProps) {
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState('')

  function handleSubmit() {
    if (!query.trim()) return
    onSubmit({ query: query.trim(), title: title.trim() || undefined })
    setQuery('')
    setTitle('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Research Session</DialogTitle>
          <DialogDescription>
            Describe what you want to research. A session will be created and tracked here.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="query">Research question *</Label>
            <Textarea
              id="query"
              placeholder="What do you want to find out?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="resize-none min-h-[80px]"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">
              Title <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="title"
              placeholder="Auto-generated from question if empty"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!query.trim() || isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
            {isPending ? 'Creating...' : 'Create Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
