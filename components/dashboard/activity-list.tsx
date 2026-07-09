import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReactNode } from 'react'

interface ActivityItemProps {
  title: string
  timestamp: string
  action?: ReactNode
}

function ActivityItem({ title, timestamp, action }: ActivityItemProps) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0">
      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{timestamp}</p>
      </div>
      {action}
    </div>
  )
}

interface ActivityListProps {
  items: ActivityItemProps[]
  title?: string
  description?: string
  emptyMessage?: string
}

export function ActivityList({
  items,
  title = 'Recent Activity',
  description = 'Your recent actions and updates',
  emptyMessage = 'No activity yet',
}: ActivityListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-1">
            {items.map((item, index) => (
              <ActivityItem key={index} {...item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  )
}
