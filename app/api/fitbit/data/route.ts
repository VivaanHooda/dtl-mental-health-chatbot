import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchAllDailyData } from '@/lib/fitbit/api';

// GET /api/fitbit/data?date=YYYY-MM-DD
// Fetch Fitbit data for a specific date
export async function GET(request: NextRequest) {
  console.log('🔵 DATA: Starting data fetch');
  
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('🔴 DATA: Auth failed:', authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🟢 DATA: User authenticated:', user.id.substring(0, 8) + '...');

    // Get date parameter (default to today)
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || 'today';

    console.log('🔵 DATA: Fetching data for date:', date);

    // Fetch all daily data from Fitbit
    const data = await fetchAllDailyData(user.id, date);

    console.log('🟢 DATA: Received from Fitbit:', {
      hasActivity: !!data.activity,
      hasHeartRate: !!data.heartRate,
      hasSleep: !!data.sleep,
      hasProfile: !!data.profile,
    });

    // Store data in database
    const dateStr = date === 'today' 
      ? new Date().toISOString().split('T')[0] 
      : date;

    console.log('🔵 DATA: Storing in database for date:', dateStr);

    // Store each data type separately
    if (data.activity) {
      console.log('🔵 DATA: Storing activity data');
      const { error } = await supabase.from('fitbit_data').upsert({
        user_id: user.id,
        data_type: 'activity',
        date: dateStr,
        data: data.activity,
      }, {
        onConflict: 'user_id,data_type,date'
      });
      if (error) console.error('🔴 DATA: Activity storage error:', error);
      else console.log('🟢 DATA: Activity stored');
    }

    if (data.heartRate) {
      console.log('🔵 DATA: Storing heart rate data');
      const { error } = await supabase.from('fitbit_data').upsert({
        user_id: user.id,
        data_type: 'heartrate',
        date: dateStr,
        data: data.heartRate,
      }, {
        onConflict: 'user_id,data_type,date'
      });
      if (error) console.error('🔴 DATA: Heart rate storage error:', error);
      else console.log('🟢 DATA: Heart rate stored');
    }

    if (data.sleep) {
      console.log('🔵 DATA: Storing sleep data');
      const { error } = await supabase.from('fitbit_data').upsert({
        user_id: user.id,
        data_type: 'sleep',
        date: dateStr,
        data: data.sleep,
      }, {
        onConflict: 'user_id,data_type,date'
      });
      if (error) console.error('🔴 DATA: Sleep storage error:', error);
      else console.log('🟢 DATA: Sleep stored');
    }

    if (data.profile) {
      console.log('🔵 DATA: Storing profile data');
      const { error } = await supabase.from('fitbit_data').upsert({
        user_id: user.id,
        data_type: 'profile',
        date: dateStr,
        data: data.profile,
      }, {
        onConflict: 'user_id,data_type,date'
      });
      if (error) console.error('🔴 DATA: Profile storage error:', error);
      else console.log('🟢 DATA: Profile stored');
    }

    console.log('🟢 DATA: All data stored successfully!');

    return NextResponse.json({
      success: true,
      data,
      stored: true,
    });
  } catch (error: any) {
    console.error('🔴 DATA: Error occurred:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Fitbit data' },
      { status: 500 }
    );
  }
}
