export default function LoadingFallback({ message = 'Loading...' }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-text-muted">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  )
}