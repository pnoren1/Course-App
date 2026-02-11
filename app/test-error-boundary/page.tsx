// 'use client';

// import { useState } from 'react';

// function ErrorTrigger({ shouldError }: { shouldError: boolean }) {
//   if (shouldError) {
//     throw new Error('Test React Error Boundary - This error contains sensitive data: password=test123 apiKey=secret-key-456');
//   }
//   return <div>No error triggered</div>;
// }

// export default function TestErrorBoundaryPage() {
//   const [triggerError, setTriggerError] = useState(false);

//   return (
//     <div className="min-h-screen bg-gray-50 py-12 px-4">
//       <div className="max-w-2xl mx-auto">
//         <h1 className="text-3xl font-bold mb-8">Error Boundary Test Page</h1>
        
//         <div className="bg-white rounded-lg shadow p-6 mb-6">
//           <h2 className="text-xl font-semibold mb-4">Test React Error Boundary</h2>
//           <p className="text-gray-600 mb-4">
//             Click the button below to trigger a React component error. 
//             This should be caught by the ErrorBoundary and logged to the system_logs table.
//           </p>
          
//           <button
//             onClick={() => setTriggerError(true)}
//             className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition"
//           >
//             Trigger React Error
//           </button>
//         </div>

//         <div className="bg-white rounded-lg shadow p-6 mb-6">
//           <h2 className="text-xl font-semibold mb-4">Test API Errors</h2>
//           <p className="text-gray-600 mb-4">
//             Click these buttons to trigger different types of API errors:
//           </p>
          
//           <div className="space-y-2">
//             <button
//               onClick={() => fetch('/api/test-error-logging?type=api')}
//               className="block w-full bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
//             >
//               Trigger API Error (with sensitive data)
//             </button>
            
//             <button
//               onClick={() => fetch('/api/test-error-logging?type=supabase')}
//               className="block w-full bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 transition"
//             >
//               Trigger Supabase Init Error
//             </button>
            
//             <button
//               onClick={() => fetch('/api/test-error-logging?type=with-user')}
//               className="block w-full bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
//             >
//               Trigger Error with User Context
//             </button>
            
//             <button
//               onClick={() => fetch('/api/test-error-logging?type=long-message')}
//               className="block w-full bg-yellow-600 text-white px-6 py-2 rounded hover:bg-yellow-700 transition"
//             >
//               Trigger Error with Long Message (test truncation)
//             </button>
            
//             <button
//               onClick={() => fetch('/api/test-error-logging?type=no-user')}
//               className="block w-full bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition"
//             >
//               Trigger Error without User Context
//             </button>
//           </div>
//         </div>

//         <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
//           <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
//           <ol className="list-decimal list-inside space-y-1 text-blue-800">
//             <li>Trigger various errors using the buttons above</li>
//             <li>Go to the Admin Dashboard to view the error logs</li>
//             <li>Verify that all errors appear with correct log types</li>
//             <li>Check that sensitive data is sanitized</li>
//             <li>Verify IP addresses and user context are captured</li>
//           </ol>
//         </div>

//         {triggerError && <ErrorTrigger shouldError={true} />}
//       </div>
//     </div>
//   );
// }
