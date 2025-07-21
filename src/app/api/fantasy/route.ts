import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://api-fantasy.llt-services.com/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';
  
  const authHeader = request.headers.get('authorization');
  
  // Remove the duplicate /api part since it's already in API_BASE_URL
  const cleanPath = path.startsWith('/api') ? path.substring(4) : path;
  
  try {
    const response = await fetch(`${API_BASE_URL}${cleanPath}`, {
      headers: {
        'Accept': 'application/json',
        'x-lang': 'es',
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return Response.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}