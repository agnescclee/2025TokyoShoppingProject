# Vercel Speed Insights Setup

This project has been configured with **Vercel Speed Insights** for real-time performance monitoring and analytics.

## What is Vercel Speed Insights?

Vercel Speed Insights provides real-time, actionable insights into your application's performance metrics. It automatically tracks:

- **Core Web Vitals**: LCP (Largest Contentful Paint), FID (First Input Delay), CLS (Cumulative Layout Shift)
- **Page performance**: Load times, rendering metrics
- **Real User Monitoring (RUM)**: Actual user experience data

## Implementation Details

### Installation

The `@vercel/speed-insights` package is already installed in `package.json`:

```json
{
  "dependencies": {
    "@vercel/speed-insights": "^1.0.0"
  }
}
```

### Integration in Next.js

Speed Insights is integrated in the root layout component (`app/layout.tsx`):

```tsx
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
```

The `<SpeedInsights />` component:
- ✅ Automatically runs on the client side only
- ✅ Collects performance metrics
- ✅ Sends data to Vercel's analytics service
- ✅ Works with both SSR and static generation
- ✅ Has minimal performance impact

## Viewing Your Metrics

Once deployed to Vercel:

1. Go to your project dashboard on [vercel.com](https://vercel.com)
2. Navigate to the "Analytics" tab
3. View real-time performance metrics and Core Web Vitals
4. Monitor user experience over time

## Configuration (Optional)

The `SpeedInsights` component accepts optional configuration:

```tsx
<SpeedInsights 
  dsn="your-custom-dsn"  // Optional: custom reporting endpoint
/>
```

For framework-specific configurations, refer to the [official Vercel Speed Insights documentation](https://vercel.com/docs/analytics/package#configuration).

## Framework Support

Speed Insights works with:
- ✅ Next.js (as implemented here)
- ✅ React
- ✅ Vue
- ✅ Svelte
- ✅ Angular
- ✅ Plain HTML/JavaScript

## Performance Impact

Speed Insights:
- Uses minimal JavaScript (~15-20KB)
- Is loaded asynchronously to avoid blocking page load
- Has negligible impact on your Core Web Vitals
- Can be disabled in development if needed

## Further Reading

- [Vercel Speed Insights Documentation](https://vercel.com/docs/analytics)
- [Core Web Vitals Guide](https://web.dev/vitals/)
- [Next.js Performance Optimization](https://nextjs.org/docs/app/building-your-application/optimizing)
