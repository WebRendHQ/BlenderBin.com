import { NextResponse } from 'next/server';
import { db } from '../../lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const scriptName = request.headers.get('script-name');
    if (!scriptName) {
      return NextResponse.json({ error: 'Script name is required' }, { status: 400 });
    }

    const docSnap = await db.collection('SCRIPTS').doc(scriptName).get();
    const clickData: { [key: string]: number } = {};
    
    if (docSnap.exists) {
      const data = docSnap.data();
      clickData[scriptName] = data?.clicks || 0;
    } else {
      console.log(`Document ${scriptName} not found`);
      clickData[scriptName] = 0;
    }

    return NextResponse.json({ clickData });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}