# La Liga Fantasy Market Analyzer

A Next.js application for analyzing your La Liga Fantasy football team, tracking player market trends, monitoring buyout clauses, and finding the best transfer opportunities.

## Features

- **Authentication**: Login with your La Liga Fantasy credentials
- **Leagues Dashboard**: View your fantasy leagues and teams
- **My Players**: Monitor your current squad with detailed information including:
  - Market values and trends
  - Buyout clause status and protection expiration
  - Players on sale with expiration alerts
  - Points and performance statistics
- **Transfer Market**: Browse available players with:
  - Price comparison (market value vs sale price)
  - Good deal identification
  - Sale expiration tracking
  - Position and performance filtering
- **Player Analysis**: Deep analysis with:
  - 5-day and 10-day price trends
  - Automated alerts for price changes
  - Buyout clause expiration warnings
  - CSV export functionality

## Tech Stack

- Next.js 15 with React 19
- TypeScript
- Tailwind CSS
- La Liga Fantasy API integration

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- A La Liga Fantasy account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd liga-fantasy-market-analyzer
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env.local` file (optional):
```bash
cp .env.example .env.local
```

4. Run the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage

1. **Login**: Use your La Liga Fantasy email and password to authenticate
2. **View Leagues**: See your fantasy leagues and teams
3. **Check Players**: Monitor your squad's market values and alerts
4. **Browse Market**: Find transfer opportunities and good deals
5. **Run Analysis**: Get detailed trends and export data

## API Integration

The app integrates with La Liga Fantasy's official API:
- Authentication: `https://login.laliga.es/...`
- Fantasy Data: `https://api-fantasy.llt-services.com/api/...`

All API calls are made client-side using your authenticated session.

## Key Features Explained

### Player Analysis
- **Price Trends**: Tracks 5-day and 10-day market value changes
- **Alerts**: Automated notifications for significant price changes
- **Buyout Monitoring**: Tracks buyout clause protection expiration
- **Export**: CSV export for external analysis

### Market Intelligence
- **Good Deals**: Identifies players selling below market value
- **Expiration Tracking**: Shows when sales expire
- **Performance Metrics**: Points and averages for informed decisions

### Security
- Credentials are only used for API authentication
- No data is stored on external servers
- All processing happens in your browser

## Development

### Project Structure
```
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable UI components
├── lib/                # Utilities and API functions
└── ...
```

### Building for Production
```bash
pnpm build
pnpm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is for educational purposes. Please respect La Liga Fantasy's terms of service.

## Disclaimer

This is an unofficial tool created for personal use. It is not affiliated with La Liga or their fantasy platform.
