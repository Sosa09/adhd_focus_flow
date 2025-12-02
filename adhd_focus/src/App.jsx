// The refactored component with your fixes applied
import React, { useState, useEffect } from 'react';
import * as apiService from './services/apiService'; // Use named import to bundle all exports

function App() {
  // Fix: Safe State Initialization
  // The state now starts with the correct structure, preventing crashes.
  const [data, setData] = useState({ goals: [], brainDumps: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch Logic
    const fetchData = async () => {
      try {
        setLoading(true);
        const responseData = await apiService.fetchData();
        
        // This check ensures the API returned the expected object before setting state.
        if (responseData && responseData.goals && responseData.brainDumps) {
          setData(responseData);
        } else {
          // If the API response is malformed, we log an error and keep the safe empty state.
          console.error("API did not return the expected data structure.", responseData);
          setError("Failed to load data correctly.");
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); // The empty dependency array ensures this runs only once.

  // Fix: Defensive Filtering
  // Optional chaining (`?.`) and a fallback `|| []` make these operations completely safe.
  const workBrainDumps = (data?.brainDumps || []).filter(item => item.category === 'Work');
  const personalGoals = (data?.goals || []).filter(item => item.category === 'Personal');


  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // The component can now render safely, even with empty arrays.
  return (
    <div>
      <h1>Dashboard</h1>

      <h2>Work Brain Dumps ({workBrainDumps.length})</h2>
      <ul>
        {workBrainDumps.length > 0 ? (
          workBrainDumps.map(item => <li key={item.id}>{item.text}</li>)
        ) : (
          <li>No work-related brain dumps.</li>
        )}
      </ul>
      
      <h2>Personal Goals ({personalGoals.length})</h2>
      <ul>
        {personalGoals.length > 0 ? (
            personalGoals.map(goal => <li key={goal.id}>{goal.title}</li>)
        ) : (
            <li>No personal goals found.</li>
        )}
      </ul>
    </div>
  );
}

export default App; // Make sure to include the export
