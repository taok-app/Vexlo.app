import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import type { QuickActionCardProps } from '@/types/ui'

export default function QuickActionCard({ icon: Icon, title, description, href }: QuickActionCardProps) {
  return (
    <Link href={href} aria-label={title} className="block">
      <Card className="h-full hover:shadow-sm transition-shadow">
        <CardContent className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-3 w-full">
            {Icon ? <Icon className="h-6 w-6 text-primary" /> : null}
            <div className="flex-1">
              <CardTitle className="text-sm">{title}</CardTitle>
              {description ? <CardDescription className="text-xs text-muted-foreground">{description}</CardDescription> : null}
            </div>
          </div>
          <div className="w-full mt-2">
            <div className="inline-flex items-center justify-center px-3 py-1 rounded-md border border-input text-sm text-muted-foreground">Open →</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
