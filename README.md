# 2025 Tokyo Shopping Project

A modern web application built with Next.js, optimized with **Vercel Speed Insights** for excellent performance monitoring.

## Features

- ⚡ **Vercel Speed Insights** - Real-time performance monitoring
- 🎯 **Core Web Vitals Tracking** - LCP, FID, CLS metrics
- 📊 **Real User Monitoring (RUM)** - Actual user experience data
- 🚀 **Next.js 14** - Latest React framework
- 📱 **Responsive Design** - Mobile-first approach
- 🎨 **Modern Styling** - Tailored CSS with gradients

## Getting Started

### Prerequisites

- Node.js 18+ (includes npm)
- Or use pnpm, yarn, or bun

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout with Speed Insights
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── package.json            # Dependencies and scripts
├── next.config.js          # Next.js configuration
├── tsconfig.json           # TypeScript configuration
└── .eslintrc.json          # ESLint configuration
```

## Vercel Speed Insights Integration

Speed Insights is automatically integrated in the root layout (`app/layout.tsx`) and collects performance data from all users:

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

See [SPEED_INSIGHTS_SETUP.md](./SPEED_INSIGHTS_SETUP.md) for detailed documentation.

## Viewing Performance Metrics

After deploying to Vercel:
1. Go to your project dashboard
2. Click the **Analytics** tab
3. View real-time performance metrics
4. Monitor Core Web Vitals trends

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests (if configured)

### Environment Setup

The project uses:
- **React 18** - UI library
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **ESLint** - Code quality

## Deployment

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Benefits on Vercel:
- ✅ Automatic Speed Insights integration
- ✅ Zero-config deployment
- ✅ Real-time performance analytics
- ✅ Automatic HTTPS
- ✅ Global CDN

### Deploy to Other Platforms

The project can be deployed to any Node.js hosting platform. Ensure:
1. Node.js environment is available
2. Run `npm install && npm run build` during build
3. Start with `npm start`

## Performance Optimization

Speed Insights automatically monitors:
- **Largest Contentful Paint (LCP)** - How quickly content loads
- **First Input Delay (FID)** - How responsive the page is
- **Cumulative Layout Shift (CLS)** - How stable the layout is

Use the metrics to optimize your application further.

## Best Practices

- Keep bundle sizes small with code splitting
- Optimize images with Next.js Image component
- Use dynamic imports for heavy components
- Monitor Core Web Vitals regularly
- Test performance on slow networks (DevTools)

## Troubleshooting

### Speed Insights not collecting data?

1. Ensure the app is deployed to production
2. Check Vercel dashboard for integration status
3. Verify `<SpeedInsights />` is in your root layout
4. Wait a few minutes for data to appear

### Build issues?

```bash
# Clear build cache
rm -rf .next

# Reinstall dependencies
npm install

# Try building again
npm run build
```

## Contributing

This is a template project for Tokyo Shopping. Feel free to customize it for your needs:

1. Modify pages in `app/`
2. Update styles in `globals.css`
3. Add new components as needed
4. Keep Speed Insights configured for production

## License

MIT

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Speed Insights](https://vercel.com/docs/analytics)
- [Web Vitals](https://web.dev/vitals/)
- [React Documentation](https://react.dev)

---

Built with ❤️ for the 2025 Tokyo Shopping Project
