# Fiziyo Admin

Panel administracyjny dla platformy Fiziyo - aplikacji dla fizjoterapeutów.

## Tech Stack

- **Framework**: Next.js 15
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Auth**: Clerk
- **API**: Apollo Client + GraphQL
- **Backend**: .NET GraphQL API (Azure)

## Getting Started

1. Sklonuj repo:
```bash
git clone https://github.com/Prezentytu/fiziyo-admin.git
cd fiziyo-admin
```

2. Zainstaluj zależności:
```bash
npm install
```

3. Skopiuj `.env.example` do `.env.local` i uzupełnij wartości:
```bash
cp .env.example .env.local
```

4. Uruchom dev server:
```bash
npm run dev
```

5. Otwórz [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_API_URL` | Backend API URL |

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Auth pages (sign-in)
│   ├── (dashboard)/     # Dashboard pages
│   └── layout.tsx       # Root layout
├── components/
│   ├── layout/          # Sidebar, Header
│   └── ui/              # UI components
├── graphql/             # GraphQL queries, mutations
├── lib/                 # Utils, Apollo provider
└── utils/               # Utility functions
```

## Deploy

Deploy na Vercel:
1. Połącz repo z Vercel
2. Dodaj environment variables
3. Deploy

## License

Private - Prezentytu
