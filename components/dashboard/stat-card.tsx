import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ComponentType<{ className?: string }>
  href?: string
  description?: string
}

export function StatCard({ label, value, icon: Icon, href, description }: StatCardProps) {
  const content = (
    <Card className={href ? 'hover:shadow-md transition-shadow cursor-pointer h-full' : 'hover:shadow-md transition-shadow h-full'}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
