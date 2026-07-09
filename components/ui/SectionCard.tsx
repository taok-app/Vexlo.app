import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export interface SectionCardProps {
  title?: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export default function SectionCard({ title, description, children, className = '' }: SectionCardProps) {
  return (
    <Card className={"p-0 " + className}>
      {(title || description) && (
        <CardHeader className="px-4 py-3">
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  )
}
