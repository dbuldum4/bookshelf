import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Sheet = ({ open, onOpenChange, side = 'right', children, className }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      <div
        className={cn(
          'relative z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border bg-background p-6 shadow-lg',
          side === 'right' ? 'ml-auto' : 'mr-auto',
          className
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange?.(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  )
}

const SheetHeader = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5', className)} {...props} />
)

const SheetTitle = ({ className, ...props }) => (
  <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
)

const SheetDescription = ({ className, ...props }) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
)

export { Sheet, SheetHeader, SheetTitle, SheetDescription }
