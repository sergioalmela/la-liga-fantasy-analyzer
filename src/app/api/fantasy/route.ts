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
      console.error(`API request failed: ${response.status}`);
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

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';
  
  const authHeader = request.headers.get('authorization');
  const body = await request.json();
  
  // Remove the duplicate /api part since it's already in API_BASE_URL
  const cleanPath = path.startsWith('/api') ? path.substring(4) : path;
  
  console.log('=== POST REQUEST DEBUG ===');
  console.log('Full URL:', `${API_BASE_URL}${cleanPath}`);
  console.log('Request Body:', JSON.stringify(body, null, 2));
  console.log('Auth Header:', authHeader ? 'Present' : 'Missing');
  console.log('========================');

  try {
    const response = await fetch(`${API_BASE_URL}${cleanPath}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-lang': 'es',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API POST request failed: ${response.status} - ${errorText}`);
      return Response.json(
        { error: `API request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API POST proxy error:', error);
    return Response.json(
      { error: 'Failed to post data' },
      { status: 500 }
    );
  }
}