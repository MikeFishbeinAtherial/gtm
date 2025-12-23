import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the password from environment variable
  const appPassword = process.env.APP_PASSWORD || 'changeme'
  
  // Check if password is provided in the request
  const authHeader = request.headers.get('authorization')
  const url = new URL(request.url)
  
  // Check for password in query string or Authorization header
  const providedPassword = url.searchParams.get('password') || 
    (authHeader?.startsWith('Basic ') ? 
      Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':')[1] : 
      null)
  
  // If password matches, allow access
  if (providedPassword === appPassword) {
    return NextResponse.next()
  }
  
  // Otherwise, show password prompt
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Private Access Required</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: #1a1a1a;
          color: #fff;
        }
        .container {
          text-align: center;
          padding: 2rem;
          background: #2a2a2a;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        input {
          padding: 0.75rem;
          font-size: 1rem;
          border: 1px solid #444;
          border-radius: 4px;
          background: #1a1a1a;
          color: #fff;
          margin: 1rem 0;
          width: 250px;
        }
        button {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-left: 0.5rem;
        }
        button:hover {
          background: #0051cc;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔒 Private Access Required</h1>
        <p>This application is private. Please enter the password to continue.</p>
        <form method="GET">
          <input type="password" name="password" placeholder="Enter password" autofocus />
          <button type="submit">Access</button>
        </form>
      </div>
    </body>
    </html>
    `,
    {
      status: 401,
      headers: {
        'Content-Type': 'text/html',
      },
    }
  )
}

export const config = {
  matcher: '/:path*',
}

