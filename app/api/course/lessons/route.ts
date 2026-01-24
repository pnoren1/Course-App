import { NextResponse } from 'next/server';
import lessonsData from '../../../course/lessons.json';

// Helper function to parse duration string to seconds
function parseDuration(duration: string): number {
  if (!duration) return 0;
  const parts = duration.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return minutes * 60 + seconds;
  }
  return 0;
}

export async function GET() {
  try {
    // For now, return JSON data as fallback
    // The main data loading is now done client-side for better RLS support
    return NextResponse.json(lessonsData);
  } catch (error) {
    console.error('Error loading lessons:', error);
    return NextResponse.json(lessonsData);
  }
}